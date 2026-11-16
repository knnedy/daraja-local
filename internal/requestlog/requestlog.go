// Package requestlog owns a Project's Request Log: what each Entry means,
// how it is encoded, and the one way to read Entries back.
package requestlog

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/knnedy/daraja-local/internal/daraja"
	"github.com/knnedy/daraja-local/internal/delivery"
	"github.com/knnedy/daraja-local/internal/repository"
)

// Kind is the Daraja API family an Entry belongs to.
type Kind string

const (
	KindSTKPush Kind = "stk_push"
	KindC2B     Kind = "c2b"
)

// Operation is the Daraja endpoint an Entry belongs to.
type Operation string

const (
	STKPush     Operation = "stk_push"
	C2BRegister Operation = "c2b_register"
	C2BSimulate Operation = "c2b_simulate"
)

func (o Operation) kind() Kind {
	if o == STKPush {
		return KindSTKPush
	}
	return KindC2B
}

// Step is the part an Entry plays in its transaction. The dashboard reads it.
const (
	stepRequest      = "request"
	stepAcceptance   = "acceptance"
	stepRejection    = "rejection"
	stepValidation   = "validation"
	stepCallback     = "callback"
	stepConfirmation = "confirmation"
)

const (
	directionInbound  = "inbound"
	directionOutbound = "outbound"

	statusAccepted  = "accepted"
	statusRejected  = "rejected"
	statusDelivered = "delivered"
	statusFailed    = "failed"
	statusFallback  = "fallback"
)

type Log struct {
	db *repository.DB
}

func New(db *repository.DB) *Log {
	return &Log{db: db}
}

// Accepted records a request and the acceptance sent back, grouped under transactionID.
func (l *Log) Accepted(ctx context.Context, projectID int64, op Operation, transactionID string, request, acceptance any) {
	l.write(ctx, entry{projectID: projectID, op: op, step: stepRequest, transactionID: transactionID, direction: directionInbound, status: statusAccepted}, request)
	l.write(ctx, entry{projectID: projectID, op: op, step: stepAcceptance, transactionID: transactionID, direction: directionOutbound, status: statusAccepted}, acceptance)
}

// Rejected records a request that failed request validation and the error sent
// back. Neither Entry has a transaction ID, so they are not grouped.
func (l *Log) Rejected(ctx context.Context, projectID int64, op Operation, request any, validationErr *daraja.ValidationError) {
	l.write(ctx, entry{projectID: projectID, op: op, step: stepRequest, direction: directionInbound, status: statusRejected}, request)
	l.write(ctx, entry{projectID: projectID, op: op, step: stepRejection, direction: directionOutbound, status: statusRejected}, struct {
		HTTPStatus   int    `json:"httpStatus"`
		ErrorCode    string `json:"errorCode"`
		ErrorMessage string `json:"errorMessage"`
	}{validationErr.HTTPStatus, validationErr.ErrorCode, validationErr.ErrorMessage})
}

// Validation records the decision on a C2B payment: the developer's, or the
// Response Type fallback when their Validation URL couldn't answer.
func (l *Log) Validation(ctx context.Context, projectID int64, transactionID string, accepted, fallback bool, result any) {
	status, outcome := statusDelivered, "rejected"
	if fallback {
		status = statusFallback
	}
	if accepted {
		outcome = "accepted"
	}
	l.write(ctx, entry{projectID: projectID, op: C2BSimulate, step: stepValidation, transactionID: transactionID, direction: directionOutbound, status: status, outcome: outcome}, result)
}

// Delivery records one Delivery of body, covering every Attempt in a single Entry.
func (l *Log) Delivery(ctx context.Context, projectID int64, op Operation, transactionID, outcome string, body any, result delivery.Result) {
	status := statusFailed
	if result.Delivered {
		status = statusDelivered
	}

	// The body's key and the step differ per kind; the dashboard reads both.
	step := stepConfirmation
	var payload any = struct {
		Payload  any                `json:"payload"`
		Attempts []delivery.Attempt `json:"attempts"`
	}{body, result.Attempts}
	if op == STKPush {
		step = stepCallback
		payload = struct {
			Callback any                `json:"callback"`
			Attempts []delivery.Attempt `json:"attempts"`
		}{body, result.Attempts}
	}

	l.write(ctx, entry{
		projectID: projectID, op: op, step: step, transactionID: transactionID, direction: directionOutbound,
		status: status, outcome: outcome, attempts: int64(len(result.Attempts)),
	}, payload)
}

// Filter narrows List. The zero value is every kind, newest first.
type Filter struct {
	Kind     Kind
	BeforeID int64
	Limit    int64
}

// List returns a Project's Entries, newest first.
func (l *Log) List(ctx context.Context, projectID int64, filter Filter) ([]repository.RequestLog, error) {
	params := repository.ListRequestLogEntriesParams{ProjectID: projectID, RowLimit: filter.Limit}
	if filter.Kind != "" {
		params.Kind = string(filter.Kind)
	}
	if filter.BeforeID > 0 {
		params.BeforeID = filter.BeforeID
	}
	return l.db.Queries().ListRequestLogEntries(ctx, params)
}

// Clear deletes every Entry for a Project.
func (l *Log) Clear(ctx context.Context, projectID int64) error {
	return l.db.Queries().ClearRequestLog(ctx, projectID)
}

type entry struct {
	projectID     int64
	op            Operation
	step          string
	transactionID string
	direction     string
	status        string
	outcome       string
	attempts      int64
}

// Logging never fails the flow it records, so write errors are dropped.
func (l *Log) write(ctx context.Context, e entry, payload any) {
	encoded, err := json.Marshal(payload)
	if err != nil {
		return
	}
	_, _ = l.db.Queries().CreateRequestLogEntry(ctx, repository.CreateRequestLogEntryParams{
		ProjectID:     e.projectID,
		CorrelationID: sql.NullString{String: e.transactionID, Valid: e.transactionID != ""},
		Kind:          string(e.op.kind()),
		Operation:     string(e.op),
		Step:          e.step,
		Direction:     e.direction,
		Status:        e.status,
		Outcome:       sql.NullString{String: e.outcome, Valid: e.outcome != ""},
		Attempts:      max(e.attempts, 1),
		Payload:       string(encoded),
	})
}
