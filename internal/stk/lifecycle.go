package stk

import (
	"context"
	"strconv"
	"sync"
	"time"

	"github.com/knnedy/daraja-local/internal/daraja"
	"github.com/knnedy/daraja-local/internal/delivery"
	"github.com/knnedy/daraja-local/internal/ledger"
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
	ledger    Recorder

	mu         sync.Mutex
	sessions   map[string]*trackedSession
	deliveries sync.WaitGroup
}

type trackedSession struct {
	Session
	stopTimeout func()
}

// Recorder keeps a completed transaction for Transaction Status and Reversal.
type Recorder interface {
	Record(ctx context.Context, e ledger.Entry) error
}

func NewLifecycle(db *repository.DB, log *requestlog.Log, deliverer *delivery.Deliverer, clock Clock, recorder Recorder) *Lifecycle {
	return &Lifecycle{db: db, log: log, deliverer: deliverer, clock: clock, ledger: recorder, sessions: make(map[string]*trackedSession)}
}

// Accept validates an STK Push against the project's credentials and, if
// valid, opens a pending Session that times out on its own.
func (l *Lifecycle) Accept(ctx context.Context, project repository.Project, req Request) (Session, *daraja.ValidationError) {
	if validationErr := Validate(req, project); validationErr != nil {
		l.log.Rejected(ctx, project.ID, requestlog.STKPush, "", req, validationErr)
		return Session{}, validationErr
	}

	settings, err := l.db.Queries().GetSettingsByProjectID(ctx, project.ID)
	if err != nil {
		return Session{}, &daraja.ValidationError{
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
		CheckoutRequestID: GenerateCheckoutRequestID(req.PhoneNumber),
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

// Query reports the outcome of a project's Session, as Daraja's STK Push Query
// does. A Session still pending answers with Daraja's "being processed" error.
func (l *Lifecycle) Query(ctx context.Context, project repository.Project, req QueryRequest) (QueryResponse, *daraja.ValidationError) {
	if validationErr := validatePassword(req.BusinessShortCode, req.Password, req.Timestamp, project); validationErr != nil {
		l.log.Rejected(ctx, project.ID, requestlog.STKQuery, "", req, validationErr)
		return QueryResponse{}, validationErr
	}

	l.mu.Lock()
	tracked, ok := l.sessions[req.CheckoutRequestID]
	var session Session
	if ok {
		session = tracked.Session
	}
	l.mu.Unlock()

	if !ok || session.ProjectID != project.ID {
		validationErr := &daraja.ValidationError{
			HTTPStatus:   400,
			ErrorCode:    "400.002.02",
			ErrorMessage: "Bad Request - Invalid CheckoutRequestID",
		}
		l.log.Rejected(ctx, project.ID, requestlog.STKQuery, "", req, validationErr)
		return QueryResponse{}, validationErr
	}

	if !session.Resolved {
		validationErr := &daraja.ValidationError{
			HTTPStatus:   500,
			ErrorCode:    "500.001.1001",
			ErrorMessage: "The transaction is being processed",
		}
		l.log.Rejected(ctx, project.ID, requestlog.STKQuery, session.CheckoutRequestID, req, validationErr)
		return QueryResponse{}, validationErr
	}

	result := QueryResponse{
		ResponseCode:        "0",
		ResponseDescription: "The service request has been accepted successfully",
		MerchantRequestID:   session.MerchantRequestID,
		CheckoutRequestID:   session.CheckoutRequestID,
		ResultCode:          strconv.Itoa(session.ResultCode),
		ResultDesc:          session.ResultDesc,
	}
	l.log.Accepted(ctx, project.ID, requestlog.STKQuery, session.CheckoutRequestID, req, result)
	return result, nil
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

// ResendCallback sends a payment's callback again, byte for byte, to the
// CallBackURL it first went to, in the background. Returns ErrNotFound while
// the payment is still waiting on the customer or was never sent.
func (l *Lifecycle) ResendCallback(ctx context.Context, projectID int64, checkoutRequestID string) error {
	sent, found, err := l.log.Callback(ctx, projectID, checkoutRequestID)
	if err != nil {
		return err
	}
	if !found || sent.URL == "" {
		return response.ErrNotFound
	}

	l.deliveries.Add(1)
	go func() {
		defer l.deliveries.Done()
		ctx := context.Background()
		result := l.deliverer.Deliver(ctx, sent.URL, sent.Body)
		l.log.Redelivery(ctx, projectID, requestlog.STKPush, checkoutRequestID, sent.Outcome, sent.Body, result)
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
		now := l.clock.Now()
		transactionDate, _ = strconv.ParseInt(now.Format("20060102150405"), 10, 64)
		_ = l.ledger.Record(ctx, ledger.Entry{
			ProjectID:                session.ProjectID,
			Receipt:                  receipt,
			Kind:                     ledger.KindSTKPush,
			OriginatorConversationID: session.MerchantRequestID,
			ConversationID:           session.CheckoutRequestID,
			Amount:                   session.Amount,
			DebitParty:               session.PhoneNumber,
			CreditParty:              session.BusinessShortCode,
			ReasonType:               "Pay Bill Online",
			InitiatedAt:              session.CreatedAt,
			FinalisedAt:              now,
		})
	}
	callback := BuildCallback(session, receipt, transactionDate)

	result := l.deliverer.Deliver(ctx, session.CallbackURL, callback)
	l.log.Delivery(ctx, session.ProjectID, requestlog.STKPush, session.CheckoutRequestID, string(outcome), callback, result)
}
