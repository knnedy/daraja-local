package ledger

import (
	"context"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/knnedy/daraja-local/internal/daraja"
	"github.com/knnedy/daraja-local/internal/repository"
	"github.com/knnedy/daraja-local/internal/requestlog"
	"github.com/knnedy/daraja-local/internal/response"
)

// BalanceRequest mirrors Daraja's Account Balance query.
type BalanceRequest struct {
	Initiator          string          `json:"Initiator"`
	SecurityCredential string          `json:"SecurityCredential"`
	CommandID          string          `json:"CommandID"`
	PartyA             daraja.Flexible `json:"PartyA"`
	IdentifierType     daraja.Flexible `json:"IdentifierType"`
	Remarks            string          `json:"Remarks"`
	QueueTimeOutURL    string          `json:"QueueTimeOutURL"`
	ResultURL          string          `json:"ResultURL"`
}

// Accounts are a project's simulated M-Pesa balances, in cents.
type Accounts struct {
	UtilityCents     int64
	WorkingCents     int64
	ChargesPaidCents int64
}

// Account names one balance the dashboard may set.
type Account string

const (
	Utility Account = "utility"
	Working Account = "working"
)

// Outcomes of an Account Balance query, as logged.
const (
	BalanceReported         = "reported"
	BalanceInvalidInitiator = "invalid_initiator"
)

const balanceQueueTimeoutURL = "https://internalsandbox.safaricom.co.ke/mpesa/abresults/v1/submit"

func validateBalance(req BalanceRequest, project repository.Project) *daraja.ValidationError {
	switch {
	case req.Initiator == "":
		return invalidField("Initiator")
	case !isBase64(req.SecurityCredential):
		return invalidField("SecurityCredential")
	case req.CommandID != "AccountBalance":
		return invalidField("CommandID")
	case string(req.PartyA) != project.ShortCode:
		return invalidField("PartyA")
	case !identifierTypes[string(req.IdentifierType)]:
		return invalidField("IdentifierType")
	case !daraja.IsCallbackURL(req.ResultURL):
		return invalidField("ResultURL")
	case !daraja.IsCallbackURL(req.QueueTimeOutURL):
		return invalidField("QueueTimeOutURL")
	case utf8.RuneCountInString(req.Remarks) > 100:
		return invalidField("Remarks")
	}
	return nil
}

// QueryBalance accepts an Account Balance query and posts every account's
// balance to the ResultURL once processed.
func (l *Ledger) QueryBalance(ctx context.Context, project repository.Project, req BalanceRequest) (AcceptResponse, *daraja.ValidationError) {
	if vErr := validateBalance(req, project); vErr != nil {
		l.log.Rejected(ctx, project.ID, requestlog.AccountBalance, "", req, vErr)
		return AcceptResponse{}, vErr
	}
	accept := newAccept()
	l.log.Accepted(ctx, project.ID, requestlog.AccountBalance, accept.ConversationID, req, accept)

	l.async(func(ctx context.Context) {
		outcome, body := l.balanceResult(ctx, project, req, accept)
		result := l.deliverer.Deliver(ctx, req.ResultURL, body)
		l.log.Delivery(ctx, project.ID, requestlog.AccountBalance, accept.ConversationID, outcome, body, result)
	})
	return accept, nil
}

func (l *Ledger) balanceResult(ctx context.Context, project repository.Project, req BalanceRequest, accept AcceptResponse) (string, daraja.ResultBody) {
	r := baseResult(accept)
	// Safaricom's Account Balance sample sends both as strings.
	r.ResultType = "0"
	r.ReferenceData.ReferenceItem = daraja.Param("QueueTimeoutURL", balanceQueueTimeoutURL)
	now := time.Now().Format("20060102150405")

	ok, err := l.verifier.Verify(ctx, project.ID, req.Initiator, req.SecurityCredential)
	accounts, accountsErr := l.Accounts(ctx, project.ID)
	if err != nil || !ok || accountsErr != nil {
		r.ResultCode, r.ResultDesc = "2001", "The initiator information is invalid."
		r.ResultParameters = &daraja.ResultParameters{ResultParameter: daraja.Param("BOCompletedTime", now)}
		return BalanceInvalidInitiator, daraja.ResultBody{Result: r}
	}

	r.ResultCode, r.ResultDesc = "0", "The service request is processed successfully."
	r.ResultParameters = &daraja.ResultParameters{ResultParameter: []daraja.KeyValue{
		daraja.Param("AccountBalance", strings.Join([]string{
			accountLine("Working Account", accounts.WorkingCents),
			accountLine("Float Account", 0),
			accountLine("Utility Account", accounts.UtilityCents),
			accountLine("Charges Paid Account", accounts.ChargesPaidCents),
			accountLine("Organization Settlement Account", 0),
		}, "&")),
		daraja.Param("BOCompletedTime", now),
	}}
	return BalanceReported, daraja.ResultBody{Result: r}
}

// accountLine is one account in Daraja's format: name|currency|available|current|reserved|uncleared.
func accountLine(name string, cents int64) string {
	amount := fmt.Sprintf("%.2f", float64(cents)/100)
	return name + "|KES|" + amount + "|" + amount + "|0.00|0.00"
}

// Accounts returns a project's balances, opening its accounts on first use.
func (l *Ledger) Accounts(ctx context.Context, projectID int64) (Accounts, error) {
	if err := l.db.Queries().EnsureAccount(ctx, projectID); err != nil {
		return Accounts{}, err
	}
	row, err := l.db.Queries().GetAccount(ctx, projectID)
	if err != nil {
		return Accounts{}, err
	}
	return Accounts{UtilityCents: row.UtilityCents, WorkingCents: row.WorkingCents, ChargesPaidCents: row.ChargesPaidCents}, nil
}

// SetBalance tops up or drains one account. Negative balances are refused.
func (l *Ledger) SetBalance(ctx context.Context, projectID int64, account Account, cents int64) (Accounts, error) {
	if cents < 0 || (account != Utility && account != Working) {
		return Accounts{}, response.ErrValidation
	}
	if err := l.db.Queries().EnsureAccount(ctx, projectID); err != nil {
		return Accounts{}, err
	}
	var err error
	if account == Utility {
		_, err = l.db.Queries().SetUtilityBalance(ctx, repository.SetUtilityBalanceParams{UtilityCents: cents, ProjectID: projectID})
	} else {
		_, err = l.db.Queries().SetWorkingBalance(ctx, repository.SetWorkingBalanceParams{WorkingCents: cents, ProjectID: projectID})
	}
	if err != nil {
		return Accounts{}, err
	}
	return l.Accounts(ctx, projectID)
}
