package b2b

import (
	"context"
	"encoding/json"
	"path/filepath"
	"sync"
	"testing"

	"github.com/knnedy/daraja-local/internal/delivery"
	"github.com/knnedy/daraja-local/internal/initiator"
	"github.com/knnedy/daraja-local/internal/ledger"
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
	payments   *Payments
	ledger     *ledger.Ledger
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
	f := &fixture{app: &developerApp{}, project: project, credential: credential}
	log, deliverer := requestlog.New(db), delivery.New(f.app, delivery.NoBackoff)
	f.ledger = ledger.New(db, log, deliverer, initiators, 0)
	f.payments = New(db, log, deliverer, initiators, f.ledger, 0)
	t.Cleanup(func() {
		f.payments.Wait()
		_ = db.Close()
	})
	return f
}

func (f *fixture) request(amount string) PaymentRequest {
	return PaymentRequest{
		Initiator: initiator.Name, SecurityCredential: f.credential, CommandIDSpaced: "BusinessPayBill",
		SenderIdentifierType: "4", RecieverIdentifierType: "4", Amount: "239", PartyA: "600000", PartyB: "000000",
		AccountReference: "353353", Requester: "254700000000", Remarks: "OK", ResultURL: resultURL, QueueTimeOutURL: resultURL,
	}
}

type result struct {
	ResultCode       any
	ResultDesc       string
	TransactionID    string
	ResultParameters struct{ ResultParameter json.RawMessage }
	ReferenceData    struct{ ReferenceItem json.RawMessage }
}

func (f *fixture) lastResult(t *testing.T) result {
	t.Helper()
	f.payments.Wait()
	f.app.mu.Lock()
	defer f.app.mu.Unlock()
	var body struct{ Result result }
	if err := json.Unmarshal(f.app.bodies[len(f.app.bodies)-1], &body); err != nil {
		t.Fatal(err)
	}
	return body.Result
}

func (r result) params(t *testing.T) map[string]any {
	t.Helper()
	var list []struct {
		Key   string
		Value any
	}
	if err := json.Unmarshal(r.ResultParameters.ResultParameter, &list); err != nil {
		t.Fatalf("ResultParameter is not a list: %s", r.ResultParameters.ResultParameter)
	}
	out := map[string]any{}
	for _, kv := range list {
		out[kv.Key] = kv.Value
	}
	return out
}

func TestPayBillDrawsTheWorkingAccountAndRecordsTheTransaction(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()
	if _, err := f.ledger.SetBalance(ctx, f.project.ID, ledger.Working, 100000); err != nil {
		t.Fatal(err)
	}
	if _, vErr := f.payments.Request(ctx, f.project, f.request("239")); vErr != nil {
		t.Fatal(vErr)
	}
	r := f.lastResult(t)
	if r.ResultCode != float64(0) {
		t.Fatalf("result %+v", r)
	}
	p := r.params(t)
	want := map[string]any{
		"Amount":                           "239.00",
		"DebitPartyAffectedAccountBalance": "Working Account|KES|761.00|761.00|0.00|0.00",
		"DebitAccountBalance":              "{Amount={CurrencyCode=KES, MinimumAmount=76100, BasicAmount=761.00}}",
		"ReceiverPartyPublicName":          "000000 - Test Business",
		"Currency":                         "KES",
	}
	for key, value := range want {
		if p[key] != value {
			t.Errorf("%s = %v, want %v", key, p[key], value)
		}
	}
	accounts, _ := f.ledger.Accounts(ctx, f.project.ID)
	if accounts.WorkingCents != 76100 {
		t.Errorf("working = %d cents, want 76100", accounts.WorkingCents)
	}
	entries, err := f.ledger.List(ctx, f.project.ID, 10)
	if err != nil || len(entries) != 1 || entries[0].Receipt != r.TransactionID || entries[0].Kind != ledger.KindB2B {
		t.Errorf("ledger %+v, err %v", entries, err)
	}
}

func TestPaymentFailures(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()

	_, _ = f.payments.Request(ctx, f.project, f.request("239"))
	if r := f.lastResult(t); r.ResultCode != float64(1) {
		t.Errorf("empty working account: ResultCode %v, want 1", r.ResultCode)
	}

	req := f.request("239")
	req.SecurityCredential = "d3Jvbmc="
	_, _ = f.payments.Request(ctx, f.project, req)
	if r := f.lastResult(t); r.ResultCode != float64(2001) {
		t.Errorf("bad credential: ResultCode %v, want 2001", r.ResultCode)
	}
}

func TestRequestValidation(t *testing.T) {
	f := newFixture(t)
	cases := map[string]func(*PaymentRequest){
		"command":     func(r *PaymentRequest) { r.CommandIDSpaced = "BusinessToBusinessTransfer" },
		"sender type": func(r *PaymentRequest) { r.SenderIdentifierType = "2" },
		"amount":      func(r *PaymentRequest) { r.Amount = "0" },
		"own party":   func(r *PaymentRequest) { r.PartyB = "600000" },
		"reference":   func(r *PaymentRequest) { r.AccountReference = "12345678901234" },
		"result url":  func(r *PaymentRequest) { r.ResultURL = "not a url" },
	}
	for name, mutate := range cases {
		req := f.request("239")
		mutate(&req)
		if _, vErr := f.payments.Request(context.Background(), f.project, req); vErr == nil || vErr.ErrorCode != "400.002.02" {
			t.Errorf("%s: got %+v, want 400.002.02", name, vErr)
		}
	}
	req := f.request("239")
	req.CommandIDSpaced, req.CommandID = "", "BusinessBuyGoods"
	req.RecieverIdentifierType, req.ReceiverIdentifierTypeCorrect = "", "4"
	if _, vErr := f.payments.Request(context.Background(), f.project, req); vErr != nil {
		t.Errorf("usual spellings refused: %+v", vErr)
	}
}
