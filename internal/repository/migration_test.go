package repository

import (
	"database/sql"
	"path/filepath"
	"testing"

	"github.com/pressly/goose/v3"

	"github.com/knnedy/daraja-local/internal/sql/migrations"
)

// Every migration must apply, roll back completely, and apply again.
func TestMigrationsGoUpDownAndUpAgain(t *testing.T) {
	conn, err := sql.Open("sqlite", "file:"+filepath.Join(t.TempDir(), "m.db")+"?_pragma=foreign_keys(ON)")
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

	if err := goose.Up(conn, "."); err != nil {
		t.Fatalf("up: %v", err)
	}
	if err := goose.DownTo(conn, ".", 0); err != nil {
		t.Fatalf("down: %v", err)
	}
	var tables int
	if err := conn.QueryRow(`SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != 'goose_db_version'`).Scan(&tables); err != nil || tables != 0 {
		t.Fatalf("%d tables left after rolling back, err %v", tables, err)
	}
	if err := goose.Up(conn, "."); err != nil {
		t.Fatalf("up again: %v", err)
	}
}
