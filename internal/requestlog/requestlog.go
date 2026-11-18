// Package requestlog owns a Project's Request Log: what each Entry means,
// how it is encoded, and the one way to read Entries back.
package requestlog

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"

	"github.com/knnedy/daraja-local/internal/daraja"
	"github.com/knnedy/daraja-local/internal/delivery"
	"github.com/knnedy/daraja-local/internal/repository"
)

// Kind is the Daraja API family an Entry belongs to.
type Kind string

const (
	KindSTKPush           Kind = "stk_push"
	KindC2B               Kind = "c2b"
	KindB2C               Kind = "b2c"
	KindTransactionStatus Kind = "transaction_status"
	KindReversal          Kind = "reversal"
	KindB2B               Kind = "b2b"
	KindAccountBalance    Kind = "account_balance"
)

// Operation is the Daraja endpoint an Entry belongs to.
type Operation string

const (
	STKPush           Operation = "stk_push"
	STKQuery          Operation = "stk_query"
	C2BRegister       Operation = "c2b_register"
	C2BSimulate       Operation = "c2b_simulate"
	B2CPayment        Operation = "b2c_payment"
	TransactionStatus Operation = "transaction_status"
	Reversal          Operation = "reversal"
	B2BPayment        Operation = "b2b_payment"
	AccountBalance    Operation = "account_balance"
)

func (o Operation) kind() Kind {
	switch o {
	case STKPush, STKQuery:
		return KindSTKPush
	case B2CPayment:
		return KindB2C
	case TransactionStatus:
		return KindTransactionStatus
	case Reversal:
		return KindReversal
	case B2BPayment:
		return KindB2B
	case AccountBalance:
		return KindAccountBalance
	}
	return KindC2B
}

// QueueTimeout is the Delivery outcome for a request that timed out in the
// queue; its Entry is a timeout, not a result.
const QueueTimeout = "queue_timeout"

// Step is the part an Entry plays in its transaction. The dashboard reads it.
const (
	stepRequest      = "request"
	stepAcceptance   = "acceptance"
	stepRejection    = "rejection"
	stepValidation   = "validation"
	stepCallback     = "callback"
	stepConfirmation = "confirmation"
	stepResult       = "result"
	stepTimeout      = "timeout"
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

// Rejected records a request Daraja Local refused and the error sent back.
// With no transaction ID yet, pass "" and the two Entries stay ungrouped.
func (l *Log) Rejected(ctx context.Context, projectID int64, op Operation, transactionID string, request any, validationErr *daraja.ValidationError) {
	l.write(ctx, entry{projectID: projectID, op: op, step: stepRequest, transactionID: transactionID, direction: directionInbound, status: statusRejected}, request)
	l.write(ctx, entry{projectID: projectID, op: op, step: stepRejection, transactionID: transactionID, direction: directionOutbound, status: statusRejected}, struct {
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
	l.delivery(ctx, projectID, op, transactionID, outcome, body, result, false)
}

// Redelivery records a Delivery the developer asked to repeat from the dashboard.
func (l *Log) Redelivery(ctx context.Context, projectID int64, op Operation, transactionID, outcome string, body any, result delivery.Result) {
	l.delivery(ctx, projectID, op, transactionID, outcome, body, result, true)
}

func (l *Log) delivery(ctx context.Context, projectID int64, op Operation, transactionID, outcome string, body any, result delivery.Result, replay bool) {
	status := statusFailed
	if result.Delivered {
		status = statusDelivered
	}

	// The body's key and the step differ per kind; the dashboard reads both.
	step := stepConfirmation
	if op != STKPush && op != STKQuery && op != C2BRegister && op != C2BSimulate {
		step = stepResult
		if outcome == QueueTimeout {
			step = stepTimeout
		}
	}
	var payload any = struct {
		Payload  any                `json:"payload"`
		URL      string             `json:"url"`
		Replay   bool               `json:"replay,omitempty"`
		Attempts []delivery.Attempt `json:"attempts"`
	}{body, result.URL, replay, result.Attempts}
	if op == STKPush {
		step = stepCallback
		payload = struct {
			Callback any                `json:"callback"`
			URL      string             `json:"url"`
			Replay   bool               `json:"replay,omitempty"`
			Attempts []delivery.Attempt `json:"attempts"`
		}{body, result.URL, replay, result.Attempts}
	}

	l.write(ctx, entry{
		projectID: projectID, op: op, step: step, transactionID: transactionID, direction: directionOutbound,
		status: status, outcome: outcome, attempts: int64(len(result.Attempts)),
	}, payload)
}

// Sent is a Delivery as it was first made: the exact body, where it went,
// and the outcome it reported.
type Sent struct {
	Body    json.RawMessage
	URL     string
	Outcome string
}

// Confirmation returns a C2B payment's most recent Confirmation, or false if none was sent.
func (l *Log) Confirmation(ctx context.Context, projectID int64, transactionID string) (Sent, bool, error) {
	return l.lastSent(ctx, projectID, transactionID, stepConfirmation)
}

// Callback returns an STK payment's most recent callback, or false if none was sent.
func (l *Log) Callback(ctx context.Context, projectID int64, checkoutRequestID string) (Sent, bool, error) {
	return l.lastSent(ctx, projectID, checkoutRequestID, stepCallback)
}

func (l *Log) lastSent(ctx context.Context, projectID int64, transactionID, step string) (Sent, bool, error) {
	row, err := l.db.Queries().GetLatestRequestLogEntryByStep(ctx, repository.GetLatestRequestLogEntryByStepParams{
		ProjectID:     projectID,
		CorrelationID: sql.NullString{String: transactionID, Valid: true},
		Step:          step,
	})
	if errors.Is(err, sql.ErrNoRows) {
		return Sent{}, false, nil
	}
	if err != nil {
		return Sent{}, false, err
	}

	// STK stores the body under "callback"; every other kind under "payload".
	var stored struct {
		Payload  json.RawMessage `json:"payload"`
		Callback json.RawMessage `json:"callback"`
		URL      string          `json:"url"`
	}
	if err := json.Unmarshal([]byte(row.Payload), &stored); err != nil {
		return Sent{}, false, nil
	}
	body := stored.Payload
	if step == stepCallback {
		body = stored.Callback
	}
	if len(body) == 0 {
		return Sent{}, false, nil
	}
	return Sent{Body: body, URL: stored.URL, Outcome: row.Outcome.String}, true, nil
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
