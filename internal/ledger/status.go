package ledger

import (
	"context"
	"strconv"

	"github.com/knnedy/daraja-local/internal/daraja"
	"github.com/knnedy/daraja-local/internal/repository"
	"github.com/knnedy/daraja-local/internal/requestlog"
)

// Outcomes of a Transaction Status query, as logged.
const (
	StatusFound            = "found"
	StatusNotFound         = "not_found"
	StatusInvalidInitiator = "invalid_initiator"
)

// QueryStatus accepts a Transaction Status query and posts the transaction's
// details to the ResultURL once processed.
func (l *Ledger) QueryStatus(ctx context.Context, project repository.Project, req StatusRequest) (AcceptResponse, *daraja.ValidationError) {
	if vErr := validateStatus(req, project); vErr != nil {
		l.log.Rejected(ctx, project.ID, requestlog.TransactionStatus, "", req, vErr)
		return AcceptResponse{}, vErr
	}
	accept := newAccept()
	l.log.Accepted(ctx, project.ID, requestlog.TransactionStatus, accept.ConversationID, req, accept)

	l.async(func(ctx context.Context) {
		outcome, body := l.statusResult(ctx, project, req, accept)
		result := l.deliverer.Deliver(ctx, req.ResultURL, body)
		l.log.Delivery(ctx, project.ID, requestlog.TransactionStatus, accept.ConversationID, outcome, body, result)
	})
	return accept, nil
}

func (l *Ledger) statusResult(ctx context.Context, project repository.Project, req StatusRequest, accept AcceptResponse) (string, daraja.ResultBody) {
	r := baseResult(accept)
	r.ReferenceData.ReferenceItem = daraja.Param("Occasion", optional(req.Occasion))

	if ok, err := l.verifier.Verify(ctx, project.ID, req.Initiator, req.SecurityCredential); err != nil || !ok {
		r.ResultCode, r.ResultDesc = 2001, "The initiator information is invalid."
		return StatusInvalidInitiator, daraja.ResultBody{Result: r}
	}

	tx, found, err := l.find(ctx, project.ID, req.transactionID(), req.OriginalConversationID)
	if err != nil || !found {
		// Undocumented for Transaction Status; Reversal's code for the same case.
		r.ResultCode, r.ResultDesc = "R000002", "The OriginalTransactionID is invalid."
		return StatusNotFound, daraja.ResultBody{Result: r}
	}

	status := "Completed"
	if tx.ReversedBy != "" {
		status = "Reversed"
	}
	debitAccount := "Customer Account"
	if tx.DebitParty == project.ShortCode {
		debitAccount = "Utility Account"
	}
	r.ResultCode, r.ResultDesc = 0, "The service request is processed successfully."
	r.ResultParameters = &daraja.ResultParameters{ResultParameter: []daraja.KeyValue{
		daraja.Param("DebitPartyName", partyName(project, tx.DebitParty)),
		daraja.Param("CreditPartyName", partyName(project, tx.CreditParty)),
		daraja.Param("OriginatorConversationID", tx.OriginatorConversationID),
		daraja.Param("InitiatedTime", tx.InitiatedAt.Format("20060102150405")),
		daraja.Param("DebitAccountType", debitAccount),
		daraja.Param("DebitPartyCharges", nil),
		daraja.Param("TransactionReason", nil),
		daraja.Param("ReasonType", tx.ReasonType),
		daraja.Param("TransactionStatus", status),
		daraja.Param("FinalisedTime", tx.FinalisedAt.Format("20060102150405")),
		daraja.Param("Amount", strconv.FormatInt(tx.Amount, 10)),
		daraja.Param("ConversationID", tx.ConversationID),
		daraja.Param("ReceiptNo", tx.Receipt),
	}}
	return StatusFound, daraja.ResultBody{Result: r}
}

// baseResult starts a Result with Daraja's placeholder TransactionID: the
// first three characters of a receipt, then zeros, as in "MBN0000000".
func baseResult(accept AcceptResponse) daraja.Result {
	return daraja.Result{
		ResultType:               0,
		OriginatorConversationID: accept.OriginatorConversationID,
		ConversationID:           accept.ConversationID,
		TransactionID:            daraja.NewTransactionID()[:3] + "0000000",
	}
}

// partyName formats a party as Daraja does: "600310 - Shop" or "254708374149 - John Doe".
// Other businesses' shortcodes get a placeholder name.
func partyName(project repository.Project, party string) string {
	switch {
	case party == project.ShortCode:
		return party + " - " + project.Name
	case len(party) == 12:
		return party + " - John Doe"
	}
	return party + " - Test Business"
}

func optional(s string) any {
	if s == "" {
		return nil
	}
	return s
}
