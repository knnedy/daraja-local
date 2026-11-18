package stk

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"github.com/knnedy/daraja-local/internal/daraja"
	"github.com/knnedy/daraja-local/internal/delivery"
	"github.com/knnedy/daraja-local/internal/ledger"
	"github.com/knnedy/daraja-local/internal/repository"
	"github.com/knnedy/daraja-local/internal/requestlog"
	"github.com/knnedy/daraja-local/internal/response"
)

const callbackURL = "http://127.0.0.1:4000/payments/callback"

// manualClock only moves when a test advances it.
type manualClock struct {
	mu     sync.Mutex
	now    time.Time
	timers []*manualTimer
}

type manualTimer struct {
	at      time.Time
	f       func()
	stopped bool
}

func (c *manualClock) Now() time.Time {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.now
}

func (c *manualClock) AfterFunc(d time.Duration, f func()) func() {
	c.mu.Lock()
	defer c.mu.Unlock()
	timer := &manualTimer{at: c.now.Add(d), f: f}
	c.timers = append(c.timers, timer)
	return func() {
		c.mu.Lock()
		defer c.mu.Unlock()
		timer.stopped = true
	}
}

func (c *manualClock) Advance(d time.Duration) {
	c.mu.Lock()
	c.now = c.now.Add(d)
	var due []*manualTimer
	for _, timer := range c.timers {
		if !timer.stopped && !timer.at.After(c.now) {
			timer.stopped = true
			due = append(due, timer)
		}
	}
	c.mu.Unlock()

	for _, timer := range due {
		timer.f()
	}
}

// developerApp records every callback POSTed to the developer's server.
type developerApp struct {
	mu     sync.Mutex
	status int
	bodies [][]byte
}

func (a *developerApp) Post(_ context.Context, _ string, body []byte) (delivery.Reply, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.bodies = append(a.bodies, body)
	if a.status == 0 {
		return delivery.Reply{}, errors.New("connection refused")
	}
	return delivery.Reply{StatusCode: a.status}, nil
}

func (a *developerApp) callbacks(t *testing.T) []CallbackBody {
	t.Helper()
	a.mu.Lock()
	defer a.mu.Unlock()
	out := make([]CallbackBody, len(a.bodies))
	for i, body := range a.bodies {
		if err := json.Unmarshal(body, &out[i]); err != nil {
			t.Fatalf("callback %d is not a callback body: %v", i, err)
		}
	}
	return out
}

type fixture struct {
	lifecycle *Lifecycle
	clock     *manualClock
	app       *developerApp
	db        *repository.DB
	project   repository.Project
}

func newFixture(t *testing.T) *fixture {
	t.Helper()
	ctx := context.Background()
	db, err := repository.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open db: %v", err)
	}

	project, err := db.Queries().CreateProject(ctx, repository.CreateProjectParams{
		Slug: "shop", Name: "Shop", ShortCode: "174379", ConsumerKey: "key", ConsumerSecret: "secret", Passkey: "passkey",
	})
	if err != nil {
		t.Fatalf("create project: %v", err)
	}
	if _, err := db.Queries().CreateDefaultSettings(ctx, project.ID); err != nil {
		t.Fatalf("create settings: %v", err)
	}

	f := &fixture{
		clock:   &manualClock{now: time.Date(2026, 10, 22, 10, 15, 0, 0, time.UTC)},
		app:     &developerApp{status: 200},
		db:      db,
		project: project,
	}
	f.lifecycle = NewLifecycle(db, requestlog.New(db), delivery.New(f.app, delivery.NoBackoff), f.clock, ledger.New(db, requestlog.New(db), nil, nil, 0))
	t.Cleanup(func() {
		f.lifecycle.Wait()
		_ = db.Close()
	})
	return f
}

func (f *fixture) request() Request {
	const timestamp = "20261022101500"
	return Request{
		BusinessShortCode: f.project.ShortCode,
		Password:          base64.StdEncoding.EncodeToString([]byte(f.project.ShortCode + f.project.Passkey + timestamp)),
		Timestamp:         timestamp,
		TransactionType:   "CustomerPayBillOnline",
		Amount:            "100",
		PartyA:            "254712345678",
		PartyB:            f.project.ShortCode,
		PhoneNumber:       "254712345678",
		CallbackURL:       callbackURL,
		AccountReference:  "Order-1",
		TransactionDesc:   "Test payment",
	}
}

func (f *fixture) accept(t *testing.T) Session {
	t.Helper()
	session, validationErr := f.lifecycle.Accept(context.Background(), f.project, f.request())
	if validationErr != nil {
		t.Fatalf("accept: %v", validationErr)
	}
	return session
}

// entries returns the project's STK request log, oldest first.
func (f *fixture) entries(t *testing.T) []repository.RequestLog {
	t.Helper()
	rows, err := requestlog.New(f.db).List(context.Background(), f.project.ID, requestlog.Filter{Kind: requestlog.KindSTKPush, Limit: 50})
	if err != nil {
		t.Fatalf("list request log: %v", err)
	}
	for i, j := 0, len(rows)-1; i < j; i, j = i+1, j-1 {
		rows[i], rows[j] = rows[j], rows[i]
	}
	return rows
}

func TestAcceptOpensAPendingSession(t *testing.T) {
	f := newFixture(t)
	session := f.accept(t)

	pending := f.lifecycle.Pending(f.project.ID)
	if len(pending) != 1 || pending[0].CheckoutRequestID != session.CheckoutRequestID {
		t.Fatalf("pending = %+v", pending)
	}
	if session.Amount != 100 || session.TimeoutAt.Sub(session.CreatedAt) != 20*time.Second {
		t.Errorf("amount = %d, timeout after %s", session.Amount, session.TimeoutAt.Sub(session.CreatedAt))
	}
	if got := f.lifecycle.Pending(f.project.ID + 1); len(got) != 0 {
		t.Errorf("another project sees %d pending sessions", len(got))
	}

	entries := f.entries(t)
	if len(entries) != 2 {
		t.Fatalf("log entries = %d, want request and acceptance", len(entries))
	}
	for i, want := range []string{"inbound", "outbound"} {
		e := entries[i]
		if e.Direction != want || e.Status != "accepted" || e.CorrelationID.String != session.CheckoutRequestID {
			t.Errorf("entry %d = %s/%s/%q", i, e.Direction, e.Status, e.CorrelationID.String)
		}
	}
	var logged AcceptResponse
	if err := json.Unmarshal([]byte(entries[1].Payload), &logged); err != nil || logged != session.AcceptResponse() {
		t.Errorf("logged acceptance = %+v (%v), want what the caller received", logged, err)
	}
}

func TestAcceptRejectsAnInvalidRequest(t *testing.T) {
	f := newFixture(t)
	req := f.request()
	req.Amount = "100.75"

	_, validationErr := f.lifecycle.Accept(context.Background(), f.project, req)
	if validationErr == nil || validationErr.ErrorCode != "400.002.02" {
		t.Fatalf("validation error = %+v", validationErr)
	}
	if got := f.lifecycle.Pending(f.project.ID); len(got) != 0 {
		t.Errorf("pending = %d, want none", len(got))
	}

	entries := f.entries(t)
	if len(entries) != 2 || entries[0].Status != "rejected" || entries[1].Status != "rejected" {
		t.Fatalf("entries = %+v", entries)
	}
	if entries[0].CorrelationID.Valid || entries[1].CorrelationID.Valid {
		t.Error("rejected entries carry a transaction ID")
	}
}

func TestApprovingDeliversASuccessCallback(t *testing.T) {
	f := newFixture(t)
	session := f.accept(t)

	if err := f.lifecycle.Resolve(f.project.ID, session.CheckoutRequestID, OutcomeApproved); err != nil {
		t.Fatalf("resolve: %v", err)
	}
	f.lifecycle.Wait()

	callbacks := f.app.callbacks(t)
	if len(callbacks) != 1 {
		t.Fatalf("callbacks = %d, want 1", len(callbacks))
	}
	got := callbacks[0].Body.STKCallback
	if got.ResultCode != 0 || got.CheckoutRequestID != session.CheckoutRequestID || got.MerchantRequestID != session.MerchantRequestID {
		t.Errorf("callback = %+v", got)
	}
	if got.CallbackMetadata == nil || len(got.CallbackMetadata.Item) != 4 {
		t.Fatalf("metadata = %+v", got.CallbackMetadata)
	}
	items := map[string]any{}
	for _, item := range got.CallbackMetadata.Item {
		items[item.Name] = item.Value
	}
	if items["Amount"] != float64(100) || items["TransactionDate"] != float64(20261022101500) || items["PhoneNumber"] != float64(254712345678) {
		t.Errorf("metadata items = %v", items)
	}
	if receipt, _ := items["MpesaReceiptNumber"].(string); len(receipt) != 10 {
		t.Errorf("receipt = %v", items["MpesaReceiptNumber"])
	}

	if pending := f.lifecycle.Pending(f.project.ID); len(pending) != 0 {
		t.Errorf("pending = %d after resolve", len(pending))
	}
	last := f.entries(t)[2]
	if last.Status != "delivered" || last.Outcome.String != "approved" || last.Attempts != 1 || last.CorrelationID.String != session.CheckoutRequestID {
		t.Errorf("delivery entry = %+v", last)
	}
}

func TestFailureOutcomesCarryTheirResultCodeAndNoMetadata(t *testing.T) {
	codes := map[Outcome]int{
		OutcomeWrongPIN:            2001,
		OutcomeInsufficientBalance: 1,
		OutcomeCancelled:           1032,
		OutcomeTimeout:             1037,
	}
	for outcome, code := range codes {
		t.Run(string(outcome), func(t *testing.T) {
			f := newFixture(t)
			session := f.accept(t)

			if err := f.lifecycle.Resolve(f.project.ID, session.CheckoutRequestID, outcome); err != nil {
				t.Fatalf("resolve: %v", err)
			}
			f.lifecycle.Wait()

			got := f.app.callbacks(t)[0].Body.STKCallback
			if got.ResultCode != code || got.CallbackMetadata != nil || got.ResultDesc == "" {
				t.Errorf("callback = %+v", got)
			}
		})
	}
}

func TestAnUnresolvedSessionTimesOut(t *testing.T) {
	f := newFixture(t)
	f.accept(t)

	f.clock.Advance(19 * time.Second)
	f.lifecycle.Wait()
	if len(f.app.callbacks(t)) != 0 || len(f.lifecycle.Pending(f.project.ID)) != 1 {
		t.Fatal("session resolved before its timeout")
	}

	f.clock.Advance(time.Second)
	f.lifecycle.Wait()

	callbacks := f.app.callbacks(t)
	if len(callbacks) != 1 || callbacks[0].Body.STKCallback.ResultCode != ResultCodeTimeout {
		t.Fatalf("callbacks = %+v", callbacks)
	}
	if last := f.entries(t)[2]; last.Outcome.String != "timeout" {
		t.Errorf("delivery entry outcome = %q", last.Outcome.String)
	}
}

func TestAResolvedSessionDoesNotAlsoTimeOut(t *testing.T) {
	f := newFixture(t)
	session := f.accept(t)

	if err := f.lifecycle.Resolve(f.project.ID, session.CheckoutRequestID, OutcomeCancelled); err != nil {
		t.Fatalf("resolve: %v", err)
	}
	f.clock.Advance(time.Minute)
	f.lifecycle.Wait()

	if got := len(f.app.callbacks(t)); got != 1 {
		t.Errorf("callbacks = %d, want 1", got)
	}
}

func TestResolveRefusals(t *testing.T) {
	f := newFixture(t)
	session := f.accept(t)

	if err := f.lifecycle.Resolve(f.project.ID, session.CheckoutRequestID, "refunded"); !errors.Is(err, response.ErrValidation) {
		t.Errorf("unknown outcome: err = %v", err)
	}
	if err := f.lifecycle.Resolve(f.project.ID+1, session.CheckoutRequestID, OutcomeApproved); !errors.Is(err, response.ErrNotFound) {
		t.Errorf("another project's session: err = %v", err)
	}
	if err := f.lifecycle.Resolve(f.project.ID, "ws_CO_unknown", OutcomeApproved); !errors.Is(err, response.ErrNotFound) {
		t.Errorf("unknown session: err = %v", err)
	}
	if len(f.lifecycle.Pending(f.project.ID)) != 1 {
		t.Fatal("a refused resolve changed the session")
	}

	if err := f.lifecycle.Resolve(f.project.ID, session.CheckoutRequestID, OutcomeApproved); err != nil {
		t.Fatalf("resolve: %v", err)
	}
	if err := f.lifecycle.Resolve(f.project.ID, session.CheckoutRequestID, OutcomeCancelled); !errors.Is(err, response.ErrNotFound) {
		t.Errorf("second resolve: err = %v", err)
	}
	f.lifecycle.Wait()
	if got := len(f.app.callbacks(t)); got != 1 {
		t.Errorf("callbacks = %d, want 1", got)
	}
}

func TestAnUndeliverableCallbackIsLoggedAsFailed(t *testing.T) {
	f := newFixture(t)
	f.app.status = 0
	session := f.accept(t)

	if err := f.lifecycle.Resolve(f.project.ID, session.CheckoutRequestID, OutcomeApproved); err != nil {
		t.Fatalf("resolve: %v", err)
	}
	f.lifecycle.Wait()

	last := f.entries(t)[2]
	if last.Status != "failed" || last.Attempts != 3 || last.Outcome.String != "approved" {
		t.Fatalf("delivery entry = %+v", last)
	}
	var logged struct {
		Attempts []delivery.Attempt `json:"attempts"`
	}
	if err := json.Unmarshal([]byte(last.Payload), &logged); err != nil || len(logged.Attempts) != 3 || logged.Attempts[0].Err != "connection refused" {
		t.Errorf("logged attempts = %+v (%v)", logged.Attempts, err)
	}
}

func (f *fixture) query(checkoutRequestID string) (QueryResponse, *daraja.ValidationError) {
	req := f.request()
	return f.lifecycle.Query(context.Background(), f.project, QueryRequest{
		BusinessShortCode: req.BusinessShortCode,
		Password:          req.Password,
		Timestamp:         req.Timestamp,
		CheckoutRequestID: checkoutRequestID,
	})
}

func TestQueryOnAPendingSessionSaysBeingProcessed(t *testing.T) {
	f := newFixture(t)
	session := f.accept(t)

	_, validationErr := f.query(session.CheckoutRequestID)
	if validationErr == nil || validationErr.HTTPStatus != 500 || validationErr.ErrorCode != "500.001.1001" || validationErr.ErrorMessage != "The transaction is being processed" {
		t.Fatalf("validation error = %+v", validationErr)
	}
	if len(f.lifecycle.Pending(f.project.ID)) != 1 {
		t.Error("a query changed the session")
	}

	entries := f.entries(t)
	last := entries[len(entries)-1]
	if last.Operation != "stk_query" || last.Step != "rejection" || last.CorrelationID.String != session.CheckoutRequestID {
		t.Errorf("query entry = %+v", last)
	}
}

func TestQueryReportsTheOutcomeOnceResolved(t *testing.T) {
	codes := map[Outcome]string{
		OutcomeApproved:            "0",
		OutcomeInsufficientBalance: "1",
		OutcomeCancelled:           "1032",
		OutcomeTimeout:             "1037",
		OutcomeWrongPIN:            "2001",
	}
	for outcome, code := range codes {
		t.Run(string(outcome), func(t *testing.T) {
			f := newFixture(t)
			session := f.accept(t)
			if err := f.lifecycle.Resolve(f.project.ID, session.CheckoutRequestID, outcome); err != nil {
				t.Fatalf("resolve: %v", err)
			}

			got, validationErr := f.query(session.CheckoutRequestID)
			if validationErr != nil {
				t.Fatalf("query: %+v", validationErr)
			}
			if got.ResultCode != code || got.ResultDesc == "" || got.ResponseCode != "0" {
				t.Errorf("query = %+v, want ResultCode %s", got, code)
			}
			if got.CheckoutRequestID != session.CheckoutRequestID || got.MerchantRequestID != session.MerchantRequestID {
				t.Errorf("ids = %s / %s", got.CheckoutRequestID, got.MerchantRequestID)
			}
		})
	}
}

func TestQueryReportsATimeoutNobodyResolved(t *testing.T) {
	f := newFixture(t)
	session := f.accept(t)
	f.clock.Advance(20 * time.Second)

	got, validationErr := f.query(session.CheckoutRequestID)
	if validationErr != nil || got.ResultCode != "1037" {
		t.Fatalf("query = %+v, err = %+v", got, validationErr)
	}
}

func TestQueryRefusals(t *testing.T) {
	f := newFixture(t)
	session := f.accept(t)

	if _, validationErr := f.query("ws_CO_unknown"); validationErr == nil || validationErr.HTTPStatus != 400 {
		t.Errorf("unknown session: %+v", validationErr)
	}

	other := f.project
	other.ID++
	req := f.request()
	if _, validationErr := f.lifecycle.Query(context.Background(), other, QueryRequest{
		BusinessShortCode: req.BusinessShortCode, Password: req.Password, Timestamp: req.Timestamp, CheckoutRequestID: session.CheckoutRequestID,
	}); validationErr == nil || validationErr.HTTPStatus != 400 {
		t.Errorf("another project's session: %+v", validationErr)
	}

	if _, validationErr := f.lifecycle.Query(context.Background(), f.project, QueryRequest{
		BusinessShortCode: req.BusinessShortCode, Password: "d3Jvbmc=", Timestamp: req.Timestamp, CheckoutRequestID: session.CheckoutRequestID,
	}); validationErr == nil || validationErr.ErrorMessage != "[MerchantValidate] - Wrong credentials" {
		t.Errorf("wrong password: %+v", validationErr)
	}
}
