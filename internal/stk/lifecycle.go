package stk

import (
	"context"
	"strconv"
	"sync"
	"time"

	"github.com/knnedy/daraja-local/internal/delivery"
	"github.com/knnedy/daraja-local/internal/repository"
	"github.com/knnedy/daraja-local/internal/requestlog"
	"github.com/knnedy/daraja-local/internal/response"
)

// Lifecycle owns every Session from acceptance to its delivered callback:
// request validation, the pending set, resolve-once, timeout and the request log.
type Lifecycle struct {
	db        *repository.DB
	log       *requestlog.Log
	deliverer *delivery.Deliverer
	clock     Clock

	mu         sync.Mutex
	sessions   map[string]*trackedSession
	deliveries sync.WaitGroup
}

type trackedSession struct {
	Session
	stopTimeout func()
}

func NewLifecycle(db *repository.DB, log *requestlog.Log, deliverer *delivery.Deliverer, clock Clock) *Lifecycle {
	return &Lifecycle{db: db, log: log, deliverer: deliverer, clock: clock, sessions: make(map[string]*trackedSession)}
}

// Accept validates an STK Push against the project's credentials and, if
// valid, opens a pending Session that times out on its own.
func (l *Lifecycle) Accept(ctx context.Context, project repository.Project, req Request) (Session, *ValidationError) {
	if validationErr := Validate(req, project); validationErr != nil {
		l.log.Rejected(ctx, project.ID, requestlog.STKPush, req, validationErr)
		return Session{}, validationErr
	}

	settings, err := l.db.Queries().GetSettingsByProjectID(ctx, project.ID)
	if err != nil {
		return Session{}, &ValidationError{
			HTTPStatus:   500,
			ErrorCode:    "500.001.1001",
			ErrorMessage: "internal error resolving project settings",
		}
	}
	timeout := time.Duration(settings.StkTimeoutSeconds) * time.Second

	// Validate already proved Amount is a positive integer.
	amount, _ := strconv.ParseInt(req.Amount, 10, 64)
	now := l.clock.Now()

	session := Session{
		MerchantRequestID: GenerateMerchantRequestID(),
		CheckoutRequestID: GenerateCheckoutRequestID(),
		ProjectID:         project.ID,
		BusinessShortCode: req.BusinessShortCode,
		PartyA:            req.PartyA,
		PartyB:            req.PartyB,
		PhoneNumber:       req.PhoneNumber,
		Amount:            amount,
		AccountReference:  req.AccountReference,
		TransactionDesc:   req.TransactionDesc,
		CallbackURL:       req.CallbackURL,
		CreatedAt:         now,
		TimeoutAt:         now.Add(timeout),
	}

	l.log.Accepted(ctx, project.ID, requestlog.STKPush, session.CheckoutRequestID, req, session.AcceptResponse())

	// Nobody acting on the Virtual Phone resolves as Daraja's DS timeout.
	tracked := &trackedSession{Session: session}
	l.mu.Lock()
	l.sessions[session.CheckoutRequestID] = tracked
	tracked.stopTimeout = l.clock.AfterFunc(timeout, func() {
		_ = l.Resolve(session.ProjectID, session.CheckoutRequestID, OutcomeTimeout)
	})
	l.mu.Unlock()

	return session, nil
}

// Pending returns a project's unresolved Sessions, for the Virtual Phone.
func (l *Lifecycle) Pending(projectID int64) []Session {
	l.mu.Lock()
	defer l.mu.Unlock()

	var pending []Session
	for _, tracked := range l.sessions {
		if tracked.ProjectID == projectID && !tracked.Resolved {
			pending = append(pending, tracked.Session)
		}
	}
	return pending
}

// Resolve gives a project's pending Session its outcome, once, then
// delivers the callback in the background.
func (l *Lifecycle) Resolve(projectID int64, checkoutRequestID string, outcome Outcome) error {
	resultCode, resultDesc, ok := outcome.Result()
	if !ok {
		return response.ErrValidation
	}

	l.mu.Lock()
	tracked, ok := l.sessions[checkoutRequestID]
	if !ok || tracked.Resolved || tracked.ProjectID != projectID {
		l.mu.Unlock()
		return response.ErrNotFound
	}
	tracked.Resolved = true
	tracked.ResultCode = resultCode
	tracked.ResultDesc = resultDesc
	session, stopTimeout := tracked.Session, tracked.stopTimeout
	l.deliveries.Add(1)
	l.mu.Unlock()

	stopTimeout()

	// Retries can take seconds, so delivery must not hold up the caller.
	go func() {
		defer l.deliveries.Done()
		l.deliver(session, outcome)
	}()
	return nil
}

// Wait blocks until every callback delivery in flight has finished.
func (l *Lifecycle) Wait() {
	l.deliveries.Wait()
}

func (l *Lifecycle) deliver(session Session, outcome Outcome) {
	ctx := context.Background()

	var receipt string
	var transactionDate int64
	if session.ResultCode == ResultCodeSuccess {
		receipt = GenerateMpesaReceiptNumber()
		transactionDate, _ = strconv.ParseInt(l.clock.Now().Format("20060102150405"), 10, 64)
	}
	callback := BuildCallback(session, receipt, transactionDate)

	result := l.deliverer.Deliver(ctx, session.CallbackURL, callback)
	l.log.Delivery(ctx, session.ProjectID, requestlog.STKPush, session.CheckoutRequestID, string(outcome), callback, result)
}
