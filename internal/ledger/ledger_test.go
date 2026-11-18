package ledger

import (
	"context"
	"encoding/json"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"github.com/knnedy/daraja-local/internal/daraja"
	"github.com/knnedy/daraja-local/internal/delivery"
	"github.com/knnedy/daraja-local/internal/initiator"
	"github.com/knnedy/daraja-local/internal/repository"
	"github.com/knnedy/daraja-local/internal/requestlog"
)

const resultURL = "http://127.0.0.1:4000/result"

type developerApp struct {
	mu     sync.Mutex
	bodies [][]byte
}

func (a *developerApp) Post(_ context.Context, _ string, body []byte) (delivery.Reply, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.bodies = append(a.bodies, body)
	return delivery.Reply{StatusCode: 200}, nil
}

type fixture struct {
	ledger     *Ledger
	db         *repository.DB
	app        *developerApp
	project    repository.Project
	credential string
}

func newFixture(t *testing.T) *fixture {
	t.Helper()
	ctx := context.Background()
	db, err := repository.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	project, err := db.Queries().CreateProject(ctx, repository.CreateProjectParams{
		Slug: "shop", Name: "Shop", ShortCode: "600000", ConsumerKey: "k", ConsumerSecret: "s", Passkey: "p",
	})
	if err != nil {
		t.Fatal(err)
	}
	initiators := initiator.New(db)
	found, err := initiators.Get(ctx, project.ID)
	if err != nil {
		t.Fatal(err)
	}
	credential, err := initiator.SecurityCredential(found)
	if err != nil {
		t.Fatal(err)
	}
	f := &fixture{db: db, app: &developerApp{}, project: project, credential: credential}
	f.ledger = New(db, requestlog.New(db), delivery.New(f.app, delivery.NoBackoff), initiators, 0)
	t.Cleanup(func() {
		f.ledger.Wait()
		_ = db.Close()
	})
	return f
}

// paid records a customer's STK payment of amount into the project's shortcode.
func (f *fixture) paid(t *testing.T, receipt string, amount int64) {
	t.Helper()
	now := time.Now()
	if err := f.ledger.Record(context.Background(), Entry{
		ProjectID: f.project.ID, Receipt: receipt, Kind: KindSTKPush, OriginatorConversationID: "29115-34620561-1",
		ConversationID: "ws_CO_1", Amount: amount, DebitParty: "254708374149", CreditParty: f.project.ShortCode,
		ReasonType: "Pay Bill Online", InitiatedAt: now, FinalisedAt: now,
	}); err != nil {
		t.Fatal(err)
	}
}

func (f *fixture) statusRequest(receipt string) StatusRequest {
	return StatusRequest{
		Initiator: initiator.Name, SecurityCredential: f.credential, CommandID: "TransactionStatusQuery",
		TransactionID: receipt, PartyA: "600000", IdentifierType: "4",
		ResultURL: resultURL, QueueTimeOutURL: resultURL, Remarks: "OK", Occasion: "OK",
	}
}

// reversalRequest reverses receipt for amount, or KES 100 when amount is "".
func (f *fixture) reversalRequest(receipt, amount string) ReversalRequest {
	if amount == "" {
		amount = "100"
	}
	return ReversalRequest{
		Initiator: initiator.Name, SecurityCredential: f.credential, CommandID: "TransactionReversal",
		TransactionID: receipt, Amount: daraja.Flexible(amount), ReceiverParty: "600000", RecieverIdentifierType: "11",
		ResultURL: resultURL, QueueTimeOutURL: resultURL, Remarks: "Payment reversal",
	}
}

type parsedResult struct {
	ResultCode       any
	ResultDesc       string
	TransactionID    string
	ResultParameters *struct {
		ResultParameter []struct {
			Key   string
			Value any
		}
	}
}

func (p parsedResult) param(key string) any {
	if p.ResultParameters == nil {
		return nil
	}
	for _, kv := range p.ResultParameters.ResultParameter {
		if kv.Key == key {
			return kv.Value
		}
	}
	return nil
}

func (f *fixture) lastResult(t *testing.T) parsedResult {
	t.Helper()
	f.ledger.Wait()
	f.app.mu.Lock()
	defer f.app.mu.Unlock()
	var body struct{ Result parsedResult }
	if err := json.Unmarshal(f.app.bodies[len(f.app.bodies)-1], &body); err != nil {
		t.Fatal(err)
	}
	return body.Result
}

func TestStatusReportsARecordedTransaction(t *testing.T) {
	f := newFixture(t)
	f.paid(t, "SKC82PACB8", 150)

	if _, vErr := f.ledger.QueryStatus(context.Background(), f.project, f.statusRequest("SKC82PACB8")); vErr != nil {
		t.Fatal(vErr)
	}
	r := f.lastResult(t)
	want := map[string]any{
		"ReceiptNo": "SKC82PACB8", "Amount": "150", "TransactionStatus": "Completed",
		"DebitPartyName": "254708374149 - John Doe", "CreditPartyName": "600000 - Shop", "ReasonType": "Pay Bill Online",
	}
	if r.ResultCode != float64(0) {
		t.Fatalf("result %+v", r)
	}
	for key, value := range want {
		if got := r.param(key); got != value {
			t.Errorf("%s = %v, want %v", key, got, value)
		}
	}
}

func TestStatusFindsByOriginatorConversationID(t *testing.T) {
	f := newFixture(t)
	f.paid(t, "SKC82PACB8", 150)
	req := f.statusRequest("")
	req.OriginalConversationID = "29115-34620561-1"
	_, _ = f.ledger.QueryStatus(context.Background(), f.project, req)
	if got := f.lastResult(t).param("ReceiptNo"); got != "SKC82PACB8" {
		t.Errorf("ReceiptNo = %v", got)
	}
}

func TestStatusFailures(t *testing.T) {
	f := newFixture(t)
	_, _ = f.ledger.QueryStatus(context.Background(), f.project, f.statusRequest("NOPE000000"))
	if r := f.lastResult(t); r.ResultCode != "R000002" || r.ResultParameters != nil {
		t.Errorf("unknown receipt: %+v", r)
	}

	req := f.statusRequest("NOPE000000")
	req.Initiator = "someone"
	_, _ = f.ledger.QueryStatus(context.Background(), f.project, req)
	if r := f.lastResult(t); r.ResultCode != float64(2001) {
		t.Errorf("wrong initiator: %+v", r)
	}
}

func TestStatusReadsSafaricomsSpacedKeys(t *testing.T) {
	var req StatusRequest
	_ = json.Unmarshal([]byte(`{"Command ID":"TransactionStatusQuery","Transaction ID":"NEF61H8J60"}`), &req)
	if req.commandID() != "TransactionStatusQuery" || req.transactionID() != "NEF61H8J60" {
		t.Errorf("parsed %+v", req)
	}

	f := newFixture(t)
	bad := f.statusRequest("")
	_, vErr := f.ledger.QueryStatus(context.Background(), f.project, bad)
	if vErr == nil || vErr.ErrorCode != "400.003.02" || vErr.ErrorMessage != "Bad Request - Invalid TransactionID" {
		t.Errorf("no ID: %+v", vErr)
	}
}

func TestReversalRefundsOnceFromTheUtilityAccount(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()
	f.paid(t, "SKC82PACB8", 100)

	_, _ = f.ledger.Reverse(ctx, f.project, f.reversalRequest("SKC82PACB8", "100.00"))
	r := f.lastResult(t)
	if r.ResultCode != float64(0) || r.param("OriginalTransactionID") != "SKC82PACB8" || r.TransactionID == "SKC82PACB8" {
		t.Fatalf("reversal: %+v", r)
	}
	if got := r.param("DebitAccountBalance"); got != "Utility Account|KES|1000000.00|1000000.00|0.00|0.00" {
		t.Errorf("DebitAccountBalance = %v", got)
	}

	_, _ = f.ledger.Reverse(ctx, f.project, f.reversalRequest("SKC82PACB8", ""))
	if r := f.lastResult(t); r.ResultCode != "R000001" {
		t.Errorf("second reversal: %+v", r)
	}

	_, _ = f.ledger.QueryStatus(ctx, f.project, f.statusRequest("SKC82PACB8"))
	if got := f.lastResult(t).param("TransactionStatus"); got != "Reversed" {
		t.Errorf("status after reversal = %v", got)
	}
}

func TestReversalRefusals(t *testing.T) {
	tests := []struct {
		name  string
		setup func(f *fixture) ReversalRequest
		code  any
	}{
		{"unknown receipt", func(f *fixture) ReversalRequest { return f.reversalRequest("NOPE000000", "") }, "R000002"},
		{"amount differs", func(f *fixture) ReversalRequest {
			f.paid(t, "SKC82PACB8", 100)
			return f.reversalRequest("SKC82PACB8", "99")
		}, "R000002"},
		{"a B2C payout", func(f *fixture) ReversalRequest {
			now := time.Now()
			_ = f.ledger.Record(context.Background(), Entry{ProjectID: f.project.ID, Receipt: "B2C0000001", Kind: KindB2C,
				Amount: 100, DebitParty: "600000", CreditParty: "254708374149", InitiatedAt: now, FinalisedAt: now})
			return f.reversalRequest("B2C0000001", "")
		}, "R000002"},
		{"wrong initiator", func(f *fixture) ReversalRequest {
			req := f.reversalRequest("NOPE000000", "")
			req.Initiator = "someone"
			return req
		}, float64(2001)},
		{"utility account short", func(f *fixture) ReversalRequest {
			f.paid(t, "SKC82PACB8", 100)
			_, _ = f.db.Queries().SetUtilityBalance(context.Background(), repository.SetUtilityBalanceParams{UtilityCents: 5000, ProjectID: f.project.ID})
			return f.reversalRequest("SKC82PACB8", "")
		}, float64(1)},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newFixture(t)
			_, vErr := f.ledger.Reverse(context.Background(), f.project, tt.setup(f))
			if vErr != nil {
				t.Fatal(vErr)
			}
			if r := f.lastResult(t); r.ResultCode != tt.code || r.ResultParameters != nil {
				t.Errorf("result %+v, want code %v", r, tt.code)
			}
		})
	}
}

func TestReversalValidation(t *testing.T) {
	f := newFixture(t)
	correct := f.reversalRequest("X", "")
	correct.RecieverIdentifierType, correct.ReceiverIdentifierTypeCorrect = "", "11"
	if _, vErr := f.ledger.Reverse(context.Background(), f.project, correct); vErr != nil {
		t.Errorf("correct spelling refused: %+v", vErr)
	}

	tests := map[string]func(r *ReversalRequest){
		"Bad Request - Invalid RecieverIdentifierType": func(r *ReversalRequest) { r.RecieverIdentifierType = "4" },
		"Bad Request - Invalid Amount":                 func(r *ReversalRequest) { r.Amount = "10.50" },
		"Bad Request - Invalid ReceiverParty":          func(r *ReversalRequest) { r.ReceiverParty = "174379" },
		"Bad Request - Invalid CommandID":              func(r *ReversalRequest) { r.CommandID = "Reversal" },
	}
	for want, edit := range tests {
		req := f.reversalRequest("X", "")
		edit(&req)
		_, vErr := f.ledger.Reverse(context.Background(), f.project, req)
		if vErr == nil || vErr.ErrorCode != "400.002.02" || vErr.ErrorMessage != want {
			t.Errorf("got %+v, want %q", vErr, want)
		}
	}
}
