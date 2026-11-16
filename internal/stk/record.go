package stk

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/knnedy/daraja-local/internal/delivery"
	"github.com/knnedy/daraja-local/internal/repository"
)

const requestLogKind = "stk_push"

func (l *Lifecycle) logAccepted(ctx context.Context, session Session, req Request) {
	transactionID := sql.NullString{String: session.CheckoutRequestID, Valid: true}
	l.log(ctx, repository.CreateRequestLogEntryParams{
		ProjectID: session.ProjectID, CorrelationID: transactionID, Direction: "inbound", Status: "accepted", Attempts: 1,
	}, req)
	l.log(ctx, repository.CreateRequestLogEntryParams{
		ProjectID: session.ProjectID, CorrelationID: transactionID, Direction: "outbound", Status: "accepted", Attempts: 1,
	}, session.AcceptResponse())
}

// A rejected request has no CheckoutRequestID, so its two entries stay ungrouped.
func (l *Lifecycle) logRejected(ctx context.Context, projectID int64, req Request, validationErr *ValidationError) {
	l.log(ctx, repository.CreateRequestLogEntryParams{
		ProjectID: projectID, Direction: "inbound", Status: "rejected", Attempts: 1,
	}, req)
	l.log(ctx, repository.CreateRequestLogEntryParams{
		ProjectID: projectID, Direction: "outbound", Status: "rejected", Attempts: 1,
	}, struct {
		HTTPStatus   int    `json:"httpStatus"`
		ErrorCode    string `json:"errorCode"`
		ErrorMessage string `json:"errorMessage"`
	}{validationErr.HTTPStatus, validationErr.ErrorCode, validationErr.ErrorMessage})
}

// One outbound entry covers every attempt of a callback delivery.
func (l *Lifecycle) logDelivery(ctx context.Context, session Session, outcome Outcome, callback CallbackBody, result delivery.Result) {
	status := "delivered"
	if !result.Delivered {
		status = "failed"
	}
	l.log(ctx, repository.CreateRequestLogEntryParams{
		ProjectID:     session.ProjectID,
		CorrelationID: sql.NullString{String: session.CheckoutRequestID, Valid: true},
		Direction:     "outbound",
		Status:        status,
		Outcome:       sql.NullString{String: string(outcome), Valid: true},
		Attempts:      int64(len(result.Attempts)),
	}, struct {
		Callback CallbackBody       `json:"callback"`
		Attempts []delivery.Attempt `json:"attempts"`
	}{callback, result.Attempts})
}

func (l *Lifecycle) log(ctx context.Context, entry repository.CreateRequestLogEntryParams, payload any) {
	encoded, err := json.Marshal(payload)
	if err != nil {
		return
	}
	entry.Kind = requestLogKind
	entry.Payload = string(encoded)
	_, _ = l.db.Queries().CreateRequestLogEntry(ctx, entry)
}
