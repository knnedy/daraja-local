package requestlog

import (
	"context"
	"encoding/json"
	"path/filepath"
	"testing"
	"time"

	"github.com/knnedy/daraja-local/internal/daraja"
	"github.com/knnedy/daraja-local/internal/delivery"
	"github.com/knnedy/daraja-local/internal/repository"
)

func newLog(t *testing.T) (*Log, int64) {
	t.Helper()
	db, err := repository.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })

	project, err := db.Queries().CreateProject(context.Background(), repository.CreateProjectParams{
		Slug: "shop", Name: "Shop", ShortCode: "174379", ConsumerKey: "key", ConsumerSecret: "secret", Passkey: "passkey",
	})
	if err != nil {
		t.Fatalf("create project: %v", err)
	}
	return New(db), project.ID
}

// oldestFirst lists every Entry in the order it was written.
func oldestFirst(t *testing.T, log *Log, projectID int64, filter Filter) []repository.RequestLog {
	t.Helper()
	if filter.Limit == 0 {
		filter.Limit = 50
	}
	rows, err := log.List(context.Background(), projectID, filter)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	for i, j := 0, len(rows)-1; i < j; i, j = i+1, j-1 {
		rows[i], rows[j] = rows[j], rows[i]
	}
	return rows
}

func TestAcceptedWritesAGroupedRequestAndAcceptance(t *testing.T) {
	log, projectID := newLog(t)
	log.Accepted(context.Background(), projectID, STKPush, "ws_CO_1", map[string]string{"Amount": "100"}, map[string]string{"ResponseCode": "0"})

	entries := oldestFirst(t, log, projectID, Filter{})
	if len(entries) != 2 {
		t.Fatalf("entries = %d, want 2", len(entries))
	}
	request, acceptance := entries[0], entries[1]
	if request.Direction != "inbound" || request.Status != "accepted" || request.Payload != `{"Amount":"100"}` {
		t.Errorf("request = %+v", request)
	}
	if acceptance.Direction != "outbound" || acceptance.Status != "accepted" || acceptance.Payload != `{"ResponseCode":"0"}` {
		t.Errorf("acceptance = %+v", acceptance)
	}
	for _, e := range entries {
		if e.CorrelationID.String != "ws_CO_1" || e.Kind != "stk_push" || e.Operation != "stk_push" || e.Outcome.Valid || e.Attempts != 1 {
			t.Errorf("entry = %+v", e)
		}
	}
	if request.Step != "request" || acceptance.Step != "acceptance" {
		t.Errorf("steps = %q, %q", request.Step, acceptance.Step)
	}
}

func TestRejectedWritesTwoUngroupedEntries(t *testing.T) {
	log, projectID := newLog(t)
	log.Rejected(context.Background(), projectID, C2BRegister, "", map[string]string{"Amount": "x"}, &daraja.ValidationError{
		HTTPStatus: 400, ErrorCode: "400.002.02", ErrorMessage: "Bad Request - Invalid Amount",
	})

	entries := oldestFirst(t, log, projectID, Filter{})
	if len(entries) != 2 || entries[0].Direction != "inbound" || entries[1].Direction != "outbound" {
		t.Fatalf("entries = %+v", entries)
	}
	for _, e := range entries {
		if e.Status != "rejected" || e.CorrelationID.Valid || e.Kind != "c2b" || e.Operation != "c2b_register" {
			t.Errorf("entry = %+v", e)
		}
	}
	if entries[0].Step != "request" || entries[1].Step != "rejection" {
		t.Errorf("steps = %q, %q", entries[0].Step, entries[1].Step)
	}
	if want := `{"httpStatus":400,"errorCode":"400.002.02","errorMessage":"Bad Request - Invalid Amount"}`; entries[1].Payload != want {
		t.Errorf("error payload = %s", entries[1].Payload)
	}
}

func TestValidationRecordsWhoDecided(t *testing.T) {
	tests := []struct {
		accepted, fallback      bool
		wantStatus, wantOutcome string
	}{
		{true, false, "delivered", "accepted"},
		{false, false, "delivered", "rejected"},
		{true, true, "fallback", "accepted"},
		{false, true, "fallback", "rejected"},
	}
	for _, tt := range tests {
		log, projectID := newLog(t)
		log.Validation(context.Background(), projectID, "AG_1", tt.accepted, tt.fallback, struct{ Accepted bool }{tt.accepted})

		e := oldestFirst(t, log, projectID, Filter{})[0]
		if e.Status != tt.wantStatus || e.Outcome.String != tt.wantOutcome || e.Direction != "outbound" || e.CorrelationID.String != "AG_1" || e.Step != "validation" || e.Operation != "c2b_simulate" {
			t.Errorf("accepted=%v fallback=%v: entry = %+v", tt.accepted, tt.fallback, e)
		}
	}
}

func TestDeliveryRecordsEveryAttemptInOneEntry(t *testing.T) {
	log, projectID := newLog(t)
	failed := delivery.Result{Attempts: []delivery.Attempt{
		{At: time.Unix(0, 0).UTC(), Err: "connection refused"}, {StatusCode: 500}, {StatusCode: 500},
	}}
	delivered := delivery.Result{Delivered: true, Attempts: []delivery.Attempt{{StatusCode: 200}}}

	log.Delivery(context.Background(), projectID, STKPush, "ws_CO_1", "approved", map[string]int{"ResultCode": 0}, failed)
	log.Delivery(context.Background(), projectID, C2BSimulate, "AG_1", "confirmed", map[string]string{"TransID": "RKT"}, delivered)

	entries := oldestFirst(t, log, projectID, Filter{})
	stk, c2b := entries[0], entries[1]
	if stk.Step != "callback" || c2b.Step != "confirmation" || c2b.Kind != "c2b" {
		t.Errorf("steps = %q, %q", stk.Step, c2b.Step)
	}
	if stk.Status != "failed" || stk.Attempts != 3 || stk.Outcome.String != "approved" {
		t.Errorf("stk delivery = %+v", stk)
	}
	if c2b.Status != "delivered" || c2b.Attempts != 1 || c2b.Outcome.String != "confirmed" {
		t.Errorf("c2b delivery = %+v", c2b)
	}

	var stkPayload struct {
		Callback map[string]int     `json:"callback"`
		Attempts []delivery.Attempt `json:"attempts"`
	}
	if err := json.Unmarshal([]byte(stk.Payload), &stkPayload); err != nil || stkPayload.Callback == nil || len(stkPayload.Attempts) != 3 || stkPayload.Attempts[0].Err != "connection refused" {
		t.Errorf("stk payload = %s (%v)", stk.Payload, err)
	}
	var c2bPayload struct {
		Payload map[string]string `json:"payload"`
	}
	if err := json.Unmarshal([]byte(c2b.Payload), &c2bPayload); err != nil || c2bPayload.Payload["TransID"] != "RKT" {
		t.Errorf("c2b payload = %s (%v)", c2b.Payload, err)
	}
}

func TestListFiltersPagesAndClears(t *testing.T) {
	ctx := context.Background()
	log, projectID := newLog(t)
	log.Accepted(ctx, projectID, STKPush, "ws_CO_1", "req", "ack")
	log.Accepted(ctx, projectID, C2BSimulate, "AG_1", "req", "ack")
	log.Accepted(ctx, projectID, STKPush, "ws_CO_2", "req", "ack")

	all, err := log.List(ctx, projectID, Filter{Limit: 50})
	if err != nil || len(all) != 6 {
		t.Fatalf("all = %d (%v), want 6", len(all), err)
	}
	for i := 1; i < len(all); i++ {
		if all[i].ID >= all[i-1].ID {
			t.Fatalf("entries are not newest first: %d then %d", all[i-1].ID, all[i].ID)
		}
	}

	if stk := oldestFirst(t, log, projectID, Filter{Kind: KindSTKPush}); len(stk) != 4 {
		t.Errorf("stk entries = %d, want 4", len(stk))
	}
	if c2b := oldestFirst(t, log, projectID, Filter{Kind: KindC2B}); len(c2b) != 2 || c2b[0].CorrelationID.String != "AG_1" {
		t.Errorf("c2b entries = %+v", c2b)
	}

	firstPage, _ := log.List(ctx, projectID, Filter{Limit: 4})
	nextPage, _ := log.List(ctx, projectID, Filter{Limit: 4, BeforeID: firstPage[len(firstPage)-1].ID})
	if len(firstPage) != 4 || len(nextPage) != 2 || nextPage[0].ID >= firstPage[3].ID {
		t.Errorf("pages = %d then %d", len(firstPage), len(nextPage))
	}

	if other, _ := log.List(ctx, projectID+1, Filter{Limit: 50}); len(other) != 0 {
		t.Errorf("another project sees %d entries", len(other))
	}

	if err := log.Clear(ctx, projectID); err != nil {
		t.Fatalf("clear: %v", err)
	}
	if left, _ := log.List(ctx, projectID, Filter{Limit: 50}); len(left) != 0 {
		t.Errorf("entries after clear = %d", len(left))
	}
}
