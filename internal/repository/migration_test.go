package repository

import (
	"database/sql"
	"path/filepath"
	"testing"

	"github.com/pressly/goose/v3"

	"github.com/knnedy/daraja-local/internal/sql/migrations"
)

// Entries written before migration 004 must come out with the operation and
// step the dashboard used to infer from their payloads.
func TestMigration004BackfillsOperationAndStep(t *testing.T) {
	conn, err := sql.Open("sqlite", "file:"+filepath.Join(t.TempDir(), "old.db")+"?_pragma=foreign_keys(ON)")
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	conn.SetMaxOpenConns(1)

	goose.SetBaseFS(migrations.FS)
	defer goose.SetBaseFS(nil)
	if err := goose.SetDialect("sqlite3"); err != nil {
		t.Fatal(err)
	}
	if err := goose.UpTo(conn, ".", 3); err != nil {
		t.Fatalf("migrate to 003: %v", err)
	}

	if _, err := conn.Exec(`INSERT INTO projects (id, slug, name, short_code, consumer_key, consumer_secret, passkey, callback_base_url)
		VALUES (1, 'shop', 'Shop', '174379', 'k', 's', 'p', '')`); err != nil {
		t.Fatal(err)
	}

	legacy := []struct {
		correlation any
		kind        string
		direction   string
		status      string
		outcome     any
		payload     string
		wantOp      string
		wantStep    string
	}{
		{"ws_1", "stk_push", "inbound", "accepted", nil, `{"Amount":"100"}`, "stk_push", "request"},
		{"ws_1", "stk_push", "outbound", "accepted", nil, `{"ResponseCode":"0"}`, "stk_push", "acceptance"},
		{"ws_1", "stk_push", "outbound", "failed", "approved", `{"callback":{}}`, "stk_push", "callback"},
		{nil, "stk_push", "inbound", "rejected", nil, `{"Amount":"x"}`, "stk_push", "request"},
		{nil, "stk_push", "outbound", "rejected", nil, `{"errorCode":"400.002.02"}`, "stk_push", "rejection"},
		{"AG_1", "c2b", "inbound", "accepted", nil, `{"ConfirmationURL":"http://a/c"}`, "c2b_register", "request"},
		{"AG_1", "c2b", "outbound", "accepted", nil, `{"ResponseCode":"0"}`, "c2b_register", "acceptance"},
		{"AG_2", "c2b", "inbound", "accepted", nil, `{"CommandID":"CustomerPayBillOnline"}`, "c2b_simulate", "request"},
		{"AG_2", "c2b", "outbound", "accepted", nil, `{"ResponseCode":"0"}`, "c2b_simulate", "acceptance"},
		{"AG_2", "c2b", "outbound", "fallback", "accepted", `{"Fallback":true}`, "c2b_simulate", "validation"},
		{"AG_2", "c2b", "outbound", "delivered", "confirmed", `{"payload":{}}`, "c2b_simulate", "confirmation"},
		{"AG_3", "c2b", "outbound", "delivered", "rejected", `{"Accepted":false}`, "", "validation"},
		{nil, "c2b", "inbound", "rejected", nil, `{"CommandID":"Nope"}`, "c2b_simulate", "request"},
		{nil, "c2b", "outbound", "rejected", nil, `{"errorCode":"400.002.02"}`, "c2b_simulate", "rejection"},
		{nil, "c2b", "inbound", "rejected", nil, `not json`, "", "request"},
	}
	for _, row := range legacy {
		if _, err := conn.Exec(`INSERT INTO request_log (project_id, correlation_id, kind, direction, status, outcome, payload)
			VALUES (1, ?, ?, ?, ?, ?, ?)`, row.correlation, row.kind, row.direction, row.status, row.outcome, row.payload); err != nil {
			t.Fatalf("insert legacy row: %v", err)
		}
	}

	if err := goose.Up(conn, "."); err != nil {
		t.Fatalf("migrate to head: %v", err)
	}

	rows, err := conn.Query(`SELECT operation, step FROM request_log ORDER BY id`)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	for i := 0; rows.Next(); i++ {
		var op, step string
		if err := rows.Scan(&op, &step); err != nil {
			t.Fatal(err)
		}
		if want := legacy[i]; op != want.wantOp || step != want.wantStep {
			t.Errorf("row %d (%s %s %s): operation=%q step=%q, want %q %q", i+1, want.kind, want.direction, want.status, op, step, want.wantOp, want.wantStep)
		}
	}
}

// Registrations that predate migration 005 were made through the v2 paths.
func TestMigration005DefaultsExistingRegistrationsToV2(t *testing.T) {
	conn, err := sql.Open("sqlite", "file:"+filepath.Join(t.TempDir(), "old.db")+"?_pragma=foreign_keys(ON)")
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	conn.SetMaxOpenConns(1)

	goose.SetBaseFS(migrations.FS)
	defer goose.SetBaseFS(nil)
	if err := goose.SetDialect("sqlite3"); err != nil {
		t.Fatal(err)
	}
	if err := goose.UpTo(conn, ".", 4); err != nil {
		t.Fatalf("migrate to 004: %v", err)
	}
	if _, err := conn.Exec(`INSERT INTO projects (id, slug, name, short_code, consumer_key, consumer_secret, passkey, callback_base_url)
		VALUES (1, 'shop', 'Shop', '174379', 'k', 's', 'p', '')`); err != nil {
		t.Fatal(err)
	}
	if _, err := conn.Exec(`INSERT INTO project_settings (project_id, callback_url) VALUES (1, 'http://127.0.0.1:4000/c')`); err != nil {
		t.Fatal(err)
	}

	if err := goose.Up(conn, "."); err != nil {
		t.Fatalf("migrate to head: %v", err)
	}
	var version string
	if err := conn.QueryRow(`SELECT c2b_api_version FROM project_settings WHERE project_id = 1`).Scan(&version); err != nil || version != "v2" {
		t.Errorf("version = %q, err = %v", version, err)
	}
	if _, err := conn.Exec(`UPDATE project_settings SET c2b_api_version = 'v3'`); err == nil {
		t.Error("an unknown version was accepted")
	}
}

// Rebuilding request_log in 007 must keep every Entry, its ID, and the ID sequence.
func TestMigration007KeepsTheRequestLogAndAllowsNewKinds(t *testing.T) {
	conn, err := sql.Open("sqlite", "file:"+filepath.Join(t.TempDir(), "old.db")+"?_pragma=foreign_keys(ON)")
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	conn.SetMaxOpenConns(1)

	goose.SetBaseFS(migrations.FS)
	defer goose.SetBaseFS(nil)
	if err := goose.SetDialect("sqlite3"); err != nil {
		t.Fatal(err)
	}
	if err := goose.UpTo(conn, ".", 6); err != nil {
		t.Fatalf("migrate to 006: %v", err)
	}
	if _, err := conn.Exec(`INSERT INTO projects (id, slug, name, short_code, consumer_key, consumer_secret, passkey, callback_base_url)
		VALUES (1, 'shop', 'Shop', '174379', 'k', 's', 'p', '')`); err != nil {
		t.Fatal(err)
	}
	for _, id := range []int{5, 9} {
		if _, err := conn.Exec(`INSERT INTO request_log (id, project_id, correlation_id, kind, operation, step, direction, status, payload)
			VALUES (?, 1, 'ws_CO_1', 'stk_push', 'stk_push', 'request', 'inbound', 'accepted', '{}')`, id); err != nil {
			t.Fatal(err)
		}
	}

	if err := goose.Up(conn, "."); err != nil {
		t.Fatalf("migrate to head: %v", err)
	}

	var count, maxID int
	if err := conn.QueryRow(`SELECT count(*), max(id) FROM request_log WHERE correlation_id = 'ws_CO_1'`).Scan(&count, &maxID); err != nil || count != 2 || maxID != 9 {
		t.Fatalf("kept %d entries up to id %d, err %v", count, maxID, err)
	}
	var newID int64
	if err := conn.QueryRow(`INSERT INTO request_log (project_id, kind, direction, status, payload)
		VALUES (1, 'b2c', 'inbound', 'accepted', '{}') RETURNING id`).Scan(&newID); err != nil || newID <= 9 {
		t.Errorf("new b2c entry id = %d, err = %v", newID, err)
	}
	if _, err := conn.Exec(`INSERT INTO request_log (project_id, kind, direction, status, payload) VALUES (1, 'nope', 'inbound', 'accepted', '{}')`); err == nil {
		t.Error("an unknown kind was accepted")
	}
}
