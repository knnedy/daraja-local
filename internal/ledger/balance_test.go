package ledger

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/knnedy/daraja-local/internal/initiator"
)

func (f *fixture) balanceRequest() BalanceRequest {
	return BalanceRequest{
		Initiator: initiator.Name, SecurityCredential: f.credential, CommandID: "AccountBalance",
		PartyA: "600000", IdentifierType: "4", Remarks: "ok", ResultURL: resultURL, QueueTimeOutURL: resultURL,
	}
}

func (f *fixture) rawResult(t *testing.T) map[string]any {
	t.Helper()
	f.ledger.Wait()
	f.app.mu.Lock()
	defer f.app.mu.Unlock()
	var body struct{ Result map[string]any }
	if err := json.Unmarshal(f.app.bodies[len(f.app.bodies)-1], &body); err != nil {
		t.Fatal(err)
	}
	return body.Result
}

func TestBalanceReportsEveryAccount(t *testing.T) {
	f := newFixture(t)
	f.paid(t, "SKC82PACB8", 150)
	if _, err := f.ledger.SetBalance(context.Background(), f.project.ID, Working, 50000); err != nil {
		t.Fatal(err)
	}
	if _, vErr := f.ledger.QueryBalance(context.Background(), f.project, f.balanceRequest()); vErr != nil {
		t.Fatal(vErr)
	}
	r := f.lastResult(t)
	raw := f.rawResult(t)
	if raw["ResultCode"] != "0" || raw["ResultType"] != "0" {
		t.Fatalf("codes %v %v, want the strings Safaricom's sample sends", raw["ResultCode"], raw["ResultType"])
	}
	want := "Working Account|KES|500.00|500.00|0.00|0.00&Float Account|KES|0.00|0.00|0.00|0.00&" +
		"Utility Account|KES|1000150.00|1000150.00|0.00|0.00&Charges Paid Account|KES|0.00|0.00|0.00|0.00&" +
		"Organization Settlement Account|KES|0.00|0.00|0.00|0.00"
	if got := r.param("AccountBalance"); got != want {
		t.Errorf("AccountBalance = %v", got)
	}
}

func TestBalanceRefusals(t *testing.T) {
	f := newFixture(t)
	req := f.balanceRequest()
	req.PartyA = "123456"
	if _, vErr := f.ledger.QueryBalance(context.Background(), f.project, req); vErr == nil || vErr.ErrorCode != "400.002.02" {
		t.Fatalf("got %+v, want 400.002.02", vErr)
	}

	req = f.balanceRequest()
	req.SecurityCredential = "d3Jvbmc="
	_, _ = f.ledger.QueryBalance(context.Background(), f.project, req)
	if got := f.rawResult(t)["ResultCode"]; got != "2001" {
		t.Errorf("ResultCode = %v, want 2001", got)
	}
}

func TestSetBalanceRefusesNegativeAndUnknownAccounts(t *testing.T) {
	f := newFixture(t)
	if _, err := f.ledger.SetBalance(context.Background(), f.project.ID, Utility, -1); err == nil {
		t.Error("negative balance accepted")
	}
	if _, err := f.ledger.SetBalance(context.Background(), f.project.ID, "float", 1); err == nil {
		t.Error("unknown account accepted")
	}
}
