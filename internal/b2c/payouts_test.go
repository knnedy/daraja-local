package b2c

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/knnedy/daraja-local/internal/delivery"
	"github.com/knnedy/daraja-local/internal/initiator"
	"github.com/knnedy/daraja-local/internal/repository"
	"github.com/knnedy/daraja-local/internal/requestlog"
)

const (
	resultURL  = "http://127.0.0.1:4000/b2c/result"
	timeoutURL = "http://127.0.0.1:4000/b2c/timeout"
)

// developerApp stands in for the developer's server at the Delivery seam.
type developerApp struct {
	mu     sync.Mutex
	urls   []string
	bodies [][]byte
}

func (a *developerApp) Post(_ context.Context, url string, body []byte) (delivery.Reply, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.urls = append(a.urls, url)
	a.bodies = append(a.bodies, body)
	return delivery.Reply{StatusCode: 200}, nil
}

type fixture struct {
	payouts    *Payouts
	app        *developerApp
	log        *requestlog.Log
	project    repository.Project
	credential string
}

func newFixture(t *testing.T) *fixture {
	t.Helper()
	ctx := context.Background()
	db, err := repository.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	project, err := db.Queries().CreateProject(ctx, repository.CreateProjectParams{
		Slug: "shop", Name: "Shop", ShortCode: "600000", ConsumerKey: "key", ConsumerSecret: "secret", Passkey: "passkey",
	})
	if err != nil {
		t.Fatalf("create project: %v", err)
	}
	if _, err := db.Queries().CreateDefaultSettings(ctx, project.ID); err != nil {
		t.Fatalf("create settings: %v", err)
	}

	initiators := initiator.New(db)
	found, err := initiators.Get(ctx, project.ID)
	if err != nil {
		t.Fatalf("initiator: %v", err)
	}

	f := &fixture{app: &developerApp{}, log: requestlog.New(db), project: project}
	if f.credential, err = initiator.SecurityCredential(found); err != nil {
		t.Fatalf("credential: %v", err)
	}
	f.payouts = NewPayouts(db, f.log, delivery.New(f.app, delivery.NoBackoff), initiators, 0)
	t.Cleanup(func() {
		f.payouts.Wait()
		_ = db.Close()
	})
	return f
}

func (f *fixture) request(amount string) PaymentRequest {
	return PaymentRequest{
		OriginatorConversationID: "",
		InitiatorName:            initiator.Name,
		SecurityCredential:       f.credential,
		CommandID:                "BusinessPayment",
		Amount:                   Flexible(amount),
		PartyA:                   Flexible(f.project.ShortCode),
		PartyB:                   "254708374149",
		Remarks:                  "Refund",
		QueueTimeOutURL:          timeoutURL,
		ResultURL:                resultURL,
	}
}

// pay sends a payment, waits for its result, and returns where it went and the parsed body.
func (f *fixture) pay(t *testing.T, req PaymentRequest) (string, map[string]any) {
	t.Helper()
	if _, vErr := f.payouts.Request(context.Background(), f.project, V1, req); vErr != nil {
		t.Fatalf("request: %+v", vErr)
	}
	f.payouts.Wait()

	f.app.mu.Lock()
	defer f.app.mu.Unlock()
	last := len(f.app.bodies) - 1
	var body struct {
		Result map[string]any `json:"Result"`
	}
	if err := json.Unmarshal(f.app.bodies[last], &body); err != nil {
		t.Fatalf("result body: %v", err)
	}
	return f.app.urls[last], body.Result
}

func (f *fixture) lastRaw() string {
	f.app.mu.Lock()
	defer f.app.mu.Unlock()
	return string(f.app.bodies[len(f.app.bodies)-1])
}

func (f *fixture) utility(t *testing.T) int64 {
	t.Helper()
	account, err := f.payouts.Account(context.Background(), f.project.ID)
	if err != nil {
		t.Fatalf("account: %v", err)
	}
	return account.UtilityCents
}

func TestACompletedPaymentPostsTheResultAndDrawsDownTheBalance(t *testing.T) {
	f := newFixture(t)
	url, result := f.pay(t, f.request("2500"))

	if url != resultURL || result["ResultCode"] != float64(0) || result["ResultType"] != float64(0) {
		t.Fatalf("posted to %s: %+v", url, result)
	}
	raw := f.lastRaw()
	for _, want := range []string{
		`{"Key":"TransactionAmount","Value":2500}`,
		`{"Key":"B2CUtilityAccountAvailableFunds","Value":997500.00}`,
		`{"Key":"ReceiverPartyPublicName","Value":"254708374149 - John Doe"}`,
		`{"Key":"B2CRecipientIsRegisteredCustomer","Value":"Y"}`,
		`"ReferenceData":{"ReferenceItem":{"Key":"QueueTimeoutURL"`,
	} {
		if !strings.Contains(raw, want) {
			t.Errorf("result lacks %s:\n%s", want, raw)
		}
	}
	if !regexp.MustCompile(`"TransactionCompletedDateTime","Value":"\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}:\d{2}"`).MatchString(raw) {
		t.Errorf("completion time is not DD.MM.YYYY HH:MM:SS: %s", raw)
	}
	if got := f.utility(t); got != 99_750_000 {
		t.Errorf("utility = %d cents, want 99750000", got)
	}
}

func TestFailuresPostAResultWithoutParametersOrDebit(t *testing.T) {
	tests := []struct {
		name  string
		setup func(f *fixture, req *PaymentRequest)
		code  float64
	}{
		{"wrong initiator password", func(f *fixture, req *PaymentRequest) {
			req.SecurityCredential = base64.StdEncoding.EncodeToString([]byte("guess"))
		}, 2001},
		{"wrong initiator name", func(f *fixture, req *PaymentRequest) { req.InitiatorName = "someone" }, 2001},
		{"over the balance", func(f *fixture, req *PaymentRequest) {
			_, _ = f.payouts.SetUtilityBalance(context.Background(), f.project.ID, 500)
		}, 1},
		{"over the per-transaction limit", func(f *fixture, req *PaymentRequest) { req.Amount = "250001" }, 3},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newFixture(t)
			req := f.request("10")
			tt.setup(f, &req)
			before := f.utility(t)

			url, result := f.pay(t, req)
			if url != resultURL || result["ResultCode"] != tt.code || result["ResultParameters"] != nil {
				t.Errorf("posted to %s: %+v", url, result)
			}
			if f.utility(t) != before {
				t.Error("a failed payment changed the balance")
			}
		})
	}
}

func TestAForcedOutcomeAppliesToTheNextPaymentOnly(t *testing.T) {
	codes := map[Outcome]float64{
		OutcomeInsufficientBalance: 1, OutcomeDailyLimit: 4, OutcomeInvalidInitiator: 2001, OutcomeUnregisteredCustomer: 2040,
	}
	for outcome, code := range codes {
		t.Run(string(outcome), func(t *testing.T) {
			f := newFixture(t)
			if err := f.payouts.SetNextOutcome(context.Background(), f.project.ID, outcome); err != nil {
				t.Fatalf("set: %v", err)
			}
			if _, result := f.pay(t, f.request("10")); result["ResultCode"] != code {
				t.Errorf("forced result = %+v, want %v", result, code)
			}
			if _, result := f.pay(t, f.request("10")); result["ResultCode"] != float64(0) {
				t.Errorf("the next payment was forced too: %+v", result)
			}
		})
	}

	f := newFixture(t)
	if err := f.payouts.SetNextOutcome(context.Background(), f.project.ID, "completed"); err == nil {
		t.Error("an outcome that is not forcible was accepted")
	}
}

func TestAQueueTimeoutGoesToTheQueueTimeOutURL(t *testing.T) {
	f := newFixture(t)
	_ = f.payouts.SetNextOutcome(context.Background(), f.project.ID, OutcomeQueueTimeout)
	accept, _ := f.payouts.Request(context.Background(), f.project, V1, f.request("10"))
	f.payouts.Wait()

	if url := f.app.urls[0]; url != timeoutURL {
		t.Errorf("timeout posted to %s", url)
	}
	rows, _ := f.log.List(context.Background(), f.project.ID, requestlog.Filter{Kind: requestlog.KindB2C, Limit: 10})
	var steps []string
	for i := len(rows) - 1; i >= 0; i-- {
		if rows[i].CorrelationID.String == accept.ConversationID {
			steps = append(steps, rows[i].Step+"/"+rows[i].Outcome.String)
		}
	}
	if strings.Join(steps, ",") != "request/,acceptance/,timeout/queue_timeout" {
		t.Errorf("steps = %v", steps)
	}
}

func TestRequestValidation(t *testing.T) {
	f := newFixture(t)
	tests := []struct {
		name    string
		version APIVersion
		edit    func(r *PaymentRequest)
		want    string
	}{
		{"v3 needs an OriginatorConversationID", V3, func(r *PaymentRequest) {}, "Bad Request - Invalid OriginatorConversationID"},
		{"empty SecurityCredential", V1, func(r *PaymentRequest) { r.SecurityCredential = "" }, "Bad Request - Invalid SecurityCredential"},
		{"unknown CommandID", V1, func(r *PaymentRequest) { r.CommandID = "CustomerPayBillOnline" }, "Bad Request - Invalid CommandID"},
		{"decimal amount", V1, func(r *PaymentRequest) { r.Amount = "10.5" }, "Bad Request - Invalid Amount"},
		{"another shortcode", V1, func(r *PaymentRequest) { r.PartyA = "174379" }, "Bad Request - Invalid PartyA"},
		{"bad phone", V1, func(r *PaymentRequest) { r.PartyB = "0712345678" }, "Bad Request - Invalid PartyB"},
		{"one-letter remarks", V1, func(r *PaymentRequest) { r.Remarks = "x" }, "Bad Request - Invalid Remarks"},
		{"relative ResultURL", V1, func(r *PaymentRequest) { r.ResultURL = "/result" }, "Bad Request - Invalid ResultURL"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := f.request("10")
			tt.edit(&req)
			_, vErr := f.payouts.Request(context.Background(), f.project, tt.version, req)
			if vErr == nil || vErr.HTTPStatus != 400 || vErr.ErrorCode != "400.002.02" || vErr.ErrorMessage != tt.want {
				t.Errorf("error = %+v, want %q", vErr, tt.want)
			}
		})
	}
}

func TestOriginatorConversationIDs(t *testing.T) {
	f := newFixture(t)
	req := f.request("10")

	generated, vErr := f.payouts.Request(context.Background(), f.project, V1, req)
	if vErr != nil || generated.OriginatorConversationID == "" {
		t.Fatalf("v1 without an ID: %+v %+v", generated, vErr)
	}

	req.OriginatorConversationID = "shop-payout-1"
	echoed, vErr := f.payouts.Request(context.Background(), f.project, V3, req)
	if vErr != nil || echoed.OriginatorConversationID != "shop-payout-1" || echoed.ResponseCode != "0" {
		t.Fatalf("v3 with an ID: %+v %+v", echoed, vErr)
	}

	_, vErr = f.payouts.Request(context.Background(), f.project, V3, req)
	if vErr == nil || vErr.HTTPStatus != 500 || vErr.ErrorCode != "500.002.1001" || vErr.ErrorMessage != "Duplicate OriginatorConversationID." {
		t.Errorf("duplicate: %+v", vErr)
	}
}

func TestAmountAndPartiesAcceptNumbersOrStrings(t *testing.T) {
	var req PaymentRequest
	if err := json.Unmarshal([]byte(`{"Amount":2500,"PartyA":600000,"PartyB":"254708374149"}`), &req); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if req.Amount != "2500" || req.PartyA != "600000" || req.PartyB != "254708374149" {
		t.Errorf("parsed %+v", req)
	}
}

// A payment still processing when an outcome is forced must not take it.
func TestAForcedOutcomeSkipsPaymentsAlreadyAccepted(t *testing.T) {
	f := newFixture(t)
	f.payouts.delay = 100 * time.Millisecond
	ctx := context.Background()

	before, _ := f.payouts.Request(ctx, f.project, V1, f.request("10"))
	_ = f.payouts.SetNextOutcome(ctx, f.project.ID, OutcomeDailyLimit)
	after, _ := f.payouts.Request(ctx, f.project, V1, f.request("10"))
	f.payouts.Wait()

	codes := map[string]float64{}
	for _, raw := range f.app.bodies {
		var body struct{ Result map[string]any }
		_ = json.Unmarshal(raw, &body)
		codes[body.Result["ConversationID"].(string)] = body.Result["ResultCode"].(float64)
	}
	if codes[before.ConversationID] != 0 || codes[after.ConversationID] != 4 {
		t.Errorf("earlier payment got %v, later got %v; want 0 and 4", codes[before.ConversationID], codes[after.ConversationID])
	}
}
