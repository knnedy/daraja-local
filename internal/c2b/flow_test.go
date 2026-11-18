package c2b

import (
	"context"
	"errors"
	"path/filepath"
	"strings"
	"sync"
	"testing"

	"github.com/knnedy/daraja-local/internal/delivery"
	"github.com/knnedy/daraja-local/internal/repository"
	"github.com/knnedy/daraja-local/internal/requestlog"
	"github.com/knnedy/daraja-local/internal/response"
)

const (
	confirmationURL = "http://127.0.0.1:4000/c2b/confirmation"
	validationURL   = "http://127.0.0.1:4000/c2b/validation"
)

// developerApp stands in for the developer's server at the Delivery seam.
type developerApp struct {
	mu              sync.Mutex
	validationReply delivery.Reply
	validationErr   error
	confirmStatus   int
	posts           []string
	bodies          [][]byte
}

func (a *developerApp) Post(_ context.Context, url string, body []byte) (delivery.Reply, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.posts = append(a.posts, url)
	a.bodies = append(a.bodies, body)
	if url == validationURL {
		return a.validationReply, a.validationErr
	}
	return delivery.Reply{StatusCode: a.confirmStatus, Body: []byte(`{"ok":true}`)}, nil
}

func (a *developerApp) received() []string {
	a.mu.Lock()
	defer a.mu.Unlock()
	return append([]string(nil), a.posts...)
}

type flowFixture struct {
	flow    *Flow
	app     *developerApp
	log     *requestlog.Log
	project repository.Project
}

func newFlowFixture(t *testing.T) *flowFixture {
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

	f := &flowFixture{app: &developerApp{confirmStatus: 200}, log: requestlog.New(db), project: project}
	f.flow = NewFlow(db, f.log, delivery.New(f.app, delivery.NoBackoff))
	t.Cleanup(func() {
		f.flow.Wait()
		_ = db.Close()
	})
	return f
}

func (f *flowFixture) register(t *testing.T, responseType, validation string) {
	t.Helper()
	if _, vErr := f.flow.RegisterURL(context.Background(), f.project, RegisterURLRequest{
		ShortCode: f.project.ShortCode, ResponseType: responseType, ConfirmationURL: confirmationURL, ValidationURL: validation,
	}); vErr != nil {
		t.Fatalf("register: %v", vErr)
	}
}

// pay simulates a payment and waits for its validation and confirmation to finish.
func (f *flowFixture) pay(t *testing.T) AcceptResponse {
	t.Helper()
	accept, vErr := f.flow.Simulate(context.Background(), f.project, SimulateRequest{
		ShortCode: f.project.ShortCode, CommandID: "CustomerPayBillOnline", Amount: "500", Msisdn: "254708374149", BillRefNumber: "INV1001",
	})
	if vErr != nil {
		t.Fatalf("simulate: %v", vErr)
	}
	f.flow.Wait()
	return accept
}

// steps lists "step/status/outcome" for a transaction's entries, oldest first.
func (f *flowFixture) steps(t *testing.T, transactionID string) []string {
	t.Helper()
	rows, err := f.log.List(context.Background(), f.project.ID, requestlog.Filter{Kind: requestlog.KindC2B, Limit: 50})
	if err != nil {
		t.Fatalf("list log: %v", err)
	}
	var out []string
	for i := len(rows) - 1; i >= 0; i-- {
		if rows[i].CorrelationID.String == transactionID {
			out = append(out, rows[i].Step+"/"+rows[i].Status+"/"+rows[i].Outcome.String)
		}
	}
	return out
}

func equal(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

func TestRegistrationReflectsTheLatestRegisterURL(t *testing.T) {
	f := newFlowFixture(t)
	ctx := context.Background()

	if _, registered, err := f.flow.Registration(ctx, f.project.ID); err != nil || registered {
		t.Fatalf("new project: registered = %v, err = %v", registered, err)
	}

	f.register(t, "Cancelled", validationURL)
	got, registered, err := f.flow.Registration(ctx, f.project.ID)
	want := Registration{ConfirmationURL: confirmationURL, ValidationURL: validationURL, ResponseType: "Cancelled"}
	if err != nil || !registered || got != want {
		t.Fatalf("registration = %+v (registered %v, err %v), want %+v", got, registered, err, want)
	}

	f.register(t, "Completed", "")
	if got, _, _ := f.flow.Registration(ctx, f.project.ID); got.ValidationURL != "" || got.ResponseType != "Completed" {
		t.Errorf("registering again did not replace: %+v", got)
	}
}

func TestSimulateNeedsARegistration(t *testing.T) {
	f := newFlowFixture(t)

	_, vErr := f.flow.Simulate(context.Background(), f.project, SimulateRequest{
		ShortCode: f.project.ShortCode, CommandID: "CustomerPayBillOnline", Amount: "500", Msisdn: "254708374149",
	})
	if vErr == nil {
		t.Fatal("simulate succeeded with nothing registered")
	}
	f.flow.Wait()
	if got := f.app.received(); len(got) != 0 {
		t.Errorf("developer app received %v", got)
	}
}

func TestPaymentWithoutAValidationURLGoesStraightToConfirmation(t *testing.T) {
	f := newFlowFixture(t)
	f.register(t, "Cancelled", "")
	accept := f.pay(t)

	if got := f.app.received(); !equal(got, []string{confirmationURL}) {
		t.Errorf("developer app received %v", got)
	}
	want := []string{"request/accepted/", "acceptance/accepted/", "confirmation/delivered/confirmed"}
	if got := f.steps(t, accept.ConversationID); !equal(got, want) {
		t.Errorf("log = %v, want %v", got, want)
	}
}

func TestPaymentTheDeveloperAcceptsIsConfirmed(t *testing.T) {
	f := newFlowFixture(t)
	f.app.validationReply = delivery.Reply{StatusCode: 200, Body: []byte(`{"ResultCode":"0","ResultDesc":"Accepted"}`)}
	f.register(t, "Cancelled", validationURL)
	accept := f.pay(t)

	if got := f.app.received(); !equal(got, []string{validationURL, confirmationURL}) {
		t.Errorf("developer app received %v", got)
	}
	want := []string{"request/accepted/", "acceptance/accepted/", "validation/delivered/accepted", "confirmation/delivered/confirmed"}
	if got := f.steps(t, accept.ConversationID); !equal(got, want) {
		t.Errorf("log = %v, want %v", got, want)
	}
}

func TestPaymentTheDeveloperRejectsIsNotConfirmed(t *testing.T) {
	f := newFlowFixture(t)
	f.app.validationReply = delivery.Reply{StatusCode: 200, Body: []byte(`{"ResultCode":"C2B00011","ResultDesc":"Rejected"}`)}
	f.register(t, "Completed", validationURL)
	accept := f.pay(t)

	if got := f.app.received(); !equal(got, []string{validationURL}) {
		t.Errorf("developer app received %v", got)
	}
	want := []string{"request/accepted/", "acceptance/accepted/", "validation/delivered/rejected"}
	if got := f.steps(t, accept.ConversationID); !equal(got, want) {
		t.Errorf("log = %v, want %v", got, want)
	}
}

func TestResponseTypeDecidesWhenTheValidationURLIsDown(t *testing.T) {
	tests := []struct {
		responseType string
		wantPosts    []string
		wantLast     string
	}{
		{"Completed", []string{validationURL, confirmationURL}, "confirmation/delivered/confirmed"},
		{"Cancelled", []string{validationURL}, "validation/fallback/rejected"},
	}
	for _, tt := range tests {
		t.Run(tt.responseType, func(t *testing.T) {
			f := newFlowFixture(t)
			f.app.validationErr = errors.New("connection refused")
			f.register(t, tt.responseType, validationURL)
			accept := f.pay(t)

			if got := f.app.received(); !equal(got, tt.wantPosts) {
				t.Errorf("developer app received %v, want %v", got, tt.wantPosts)
			}
			steps := f.steps(t, accept.ConversationID)
			if last := steps[len(steps)-1]; last != tt.wantLast {
				t.Errorf("last entry = %s, want %s (all: %v)", last, tt.wantLast, steps)
			}
		})
	}
}

func TestAnUndeliverableConfirmationIsLoggedAsFailed(t *testing.T) {
	f := newFlowFixture(t)
	f.app.confirmStatus = 500
	f.register(t, "Completed", "")
	accept := f.pay(t)

	if got := len(f.app.received()); got != 3 {
		t.Errorf("confirmation attempts = %d, want 3", got)
	}
	steps := f.steps(t, accept.ConversationID)
	if last := steps[len(steps)-1]; last != "confirmation/failed/confirmed" {
		t.Errorf("last entry = %s", last)
	}
}

func TestReplayResendsTheSameConfirmationToTheCurrentURL(t *testing.T) {
	f := newFlowFixture(t)
	f.register(t, "Completed", "")
	f.app.confirmStatus = 500
	accept := f.pay(t)

	// The developer fixes their server and registers a new URL, then replays.
	const fixedURL = "http://127.0.0.1:4001/c2b/confirmation"
	if _, vErr := f.flow.RegisterURL(context.Background(), f.project, RegisterURLRequest{
		ShortCode: f.project.ShortCode, ResponseType: "Completed", ConfirmationURL: fixedURL,
	}); vErr != nil {
		t.Fatalf("register: %v", vErr)
	}
	f.app.confirmStatus = 200
	if err := f.flow.ReplayConfirmation(context.Background(), f.project.ID, accept.ConversationID); err != nil {
		t.Fatalf("replay: %v", err)
	}
	f.flow.Wait()

	posts := f.app.received()
	if posts[len(posts)-1] != fixedURL {
		t.Errorf("replayed to %s, want %s", posts[len(posts)-1], fixedURL)
	}
	if first, last := f.app.bodies[0], f.app.bodies[len(f.app.bodies)-1]; string(first) != string(last) {
		t.Errorf("replayed body differs:\n%s\n%s", first, last)
	}

	want := []string{"request/accepted/", "acceptance/accepted/", "confirmation/failed/confirmed", "confirmation/delivered/confirmed"}
	if got := f.steps(t, accept.ConversationID); !equal(got, want) {
		t.Errorf("steps = %v, want %v", got, want)
	}
}

func TestReplayRefusals(t *testing.T) {
	f := newFlowFixture(t)
	if err := f.flow.ReplayConfirmation(context.Background(), f.project.ID, "AG_none"); !errors.Is(err, response.ErrValidation) {
		t.Errorf("unregistered: err = %v, want ErrValidation", err)
	}

	f.register(t, "Completed", validationURL)
	f.app.validationReply = delivery.Reply{StatusCode: 200, Body: []byte(`{"ResultCode":"C2B00011","ResultDesc":"Rejected"}`)}
	accept := f.pay(t)

	if err := f.flow.ReplayConfirmation(context.Background(), f.project.ID, accept.ConversationID); !errors.Is(err, response.ErrNotFound) {
		t.Errorf("never confirmed: err = %v, want ErrNotFound", err)
	}
	if err := f.flow.ReplayConfirmation(context.Background(), f.project.ID+1, accept.ConversationID); err == nil {
		t.Error("another project's payment was replayed")
	}
}

func TestTheLogKeepsWhatEachCallSentAndGotBack(t *testing.T) {
	f := newFlowFixture(t)
	f.register(t, "Completed", validationURL)
	f.app.validationReply = delivery.Reply{StatusCode: 200, Body: []byte(`{"ResultCode":"0","ResultDesc":"Accepted"}`)}
	accept := f.pay(t)

	rows, err := f.log.List(context.Background(), f.project.ID, requestlog.Filter{Kind: requestlog.KindC2B, Limit: 50})
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	for _, row := range rows {
		if row.CorrelationID.String != accept.ConversationID {
			continue
		}
		switch row.Step {
		case "validation":
			for _, want := range []string{`"URL":"` + validationURL, `"Reply":"{\"ResultCode\":\"0\"`, `"Payload":{"TransactionType"`} {
				if !strings.Contains(row.Payload, want) {
					t.Errorf("validation entry lacks %s: %s", want, row.Payload)
				}
			}
		case "confirmation":
			for _, want := range []string{`"url":"` + confirmationURL, `"Reply":"{\"ok\":true}"`, `"DurationMs":`} {
				if !strings.Contains(row.Payload, want) {
					t.Errorf("confirmation entry lacks %s: %s", want, row.Payload)
				}
			}
		}
	}
}
