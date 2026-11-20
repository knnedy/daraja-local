package ledger

import (
	"context"
	"errors"
	"strconv"
	"time"

	"github.com/knnedy/daraja-local/internal/daraja"
	"github.com/knnedy/daraja-local/internal/repository"
	"github.com/knnedy/daraja-local/internal/requestlog"
)

// Outcomes of a Reversal, as logged.
const (
	ReversalReversed            = "reversed"
	ReversalAlreadyReversed     = "already_reversed"
	ReversalInvalidTransaction  = "invalid_transaction"
	ReversalInsufficientBalance = "insufficient_balance"
	ReversalInvalidInitiator    = "invalid_initiator"
)

var (
	errAlreadyReversed = errors.New("ledger: already reversed")
	errBalance         = errors.New("ledger: insufficient utility balance")
)

const reversalQueueTimeoutURL = "https://internalsandbox.safaricom.co.ke/mpesa/reversalresults/v1/submit"

// Reverse accepts a Reversal request and, once processed, refunds the
// customer of an STK or C2B payment from the utility account and posts the result to the ResultURL.
func (l *Ledger) Reverse(ctx context.Context, project repository.Project, req ReversalRequest) (AcceptResponse, *daraja.ValidationError) {
	if vErr := validateReversal(req, project); vErr != nil {
		l.log.Rejected(ctx, project.ID, requestlog.Reversal, "", req, vErr)
		return AcceptResponse{}, vErr
	}
	accept := newAccept()
	l.log.Accepted(ctx, project.ID, requestlog.Reversal, accept.ConversationID, req, accept)

	l.async(func(ctx context.Context) {
		outcome, body := l.reverse(ctx, project, req, accept)
		result := l.deliverer.Deliver(ctx, req.ResultURL, body)
		l.log.Delivery(ctx, project.ID, requestlog.Reversal, accept.ConversationID, outcome, body, result)
	})
	return accept, nil
}

func (l *Ledger) reverse(ctx context.Context, project repository.Project, req ReversalRequest, accept AcceptResponse) (string, daraja.ResultBody) {
	r := baseResult(accept)
	r.ReferenceData.ReferenceItem = daraja.Param("QueueTimeoutURL", reversalQueueTimeoutURL)
	fail := func(outcome string, code any, desc string) (string, daraja.ResultBody) {
		r.ResultCode, r.ResultDesc = code, desc
		return outcome, daraja.ResultBody{Result: r}
	}

	// As with Transaction Status, an unknown receipt is reported before the initiator is checked.
	original, found, err := l.find(ctx, project.ID, req.TransactionID, "")
	if err != nil || !found {
		return fail(ReversalInvalidTransaction, "R000002", "The OriginalTransactionID is invalid.")
	}
	if ok, err := l.verifier.Verify(ctx, project.ID, req.Initiator, req.SecurityCredential); err != nil || !ok {
		return fail(ReversalInvalidInitiator, 2001, "The initiator information is invalid.")
	}

	reversible := found && (original.Kind == KindSTKPush || original.Kind == KindC2B)
	// A mismatched amount has no documented code; it is treated as invalid.
	if !reversible || original.Amount != wholeShillings(req.Amount) {
		return fail(ReversalInvalidTransaction, "R000002", "The OriginalTransactionID is invalid.")
	}
	if original.ReversedBy != "" {
		return fail(ReversalAlreadyReversed, "R000001", "The transaction has already been reversed.")
	}

	now := time.Now()
	reversal := Entry{
		ProjectID:                project.ID,
		Receipt:                  daraja.NewTransactionID(),
		Kind:                     KindReversal,
		OriginatorConversationID: accept.OriginatorConversationID,
		ConversationID:           accept.ConversationID,
		Amount:                   original.Amount,
		DebitParty:               project.ShortCode,
		CreditParty:              original.DebitParty,
		ReasonType:               "Reversal",
		InitiatedAt:              now,
		FinalisedAt:              now,
	}
	var account repository.Account
	err = l.db.WithTransaction(ctx, func(q *repository.Queries) error {
		rows, err := q.MarkTransactionReversed(ctx, repository.MarkTransactionReversedParams{ReversedBy: reversal.Receipt, ProjectID: project.ID, Receipt: original.Receipt})
		if err != nil {
			return err
		}
		if rows == 0 {
			return errAlreadyReversed
		}
		if err := q.EnsureAccount(ctx, project.ID); err != nil {
			return err
		}
		if account, err = q.DebitUtilityAccount(ctx, repository.DebitUtilityAccountParams{Cents: original.Amount * 100, ProjectID: project.ID}); err != nil {
			return errBalance
		}
		return q.CreateTransaction(ctx, createParams(reversal))
	})
	switch {
	case err == nil:
	case errors.Is(err, errAlreadyReversed):
		return fail(ReversalAlreadyReversed, "R000001", "The transaction has already been reversed.")
	case errors.Is(err, errBalance):
		return fail(ReversalInsufficientBalance, 1, "The balance is insufficient for the transaction.")
	default:
		return fail(ReversalInvalidTransaction, "R000002", "The OriginalTransactionID is invalid.")
	}

	balance := strconv.FormatFloat(float64(account.UtilityCents)/100, 'f', 2, 64)
	r.TransactionID = reversal.Receipt
	r.ResultCode, r.ResultDesc = 0, "The service request is processed successfully."
	r.ResultParameters = &daraja.ResultParameters{ResultParameter: []daraja.KeyValue{
		daraja.Param("DebitAccountBalance", "Utility Account|KES|"+balance+"|"+balance+"|0.00|0.00"),
		daraja.Param("Amount", daraja.Money(original.Amount*100)),
		daraja.Param("TransCompletedTime", now.Format("20060102150405")),
		daraja.Param("OriginalTransactionID", original.Receipt),
		daraja.Param("Charge", daraja.Money(0)),
		daraja.Param("CreditPartyPublicName", partyName(project, reversal.CreditParty)),
		daraja.Param("DebitPartyPublicName", partyName(project, reversal.DebitParty)),
	}}
	return ReversalReversed, daraja.ResultBody{Result: r}
}
