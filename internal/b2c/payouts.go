package b2c

import (
	"context"
	"database/sql"
	"errors"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/knnedy/daraja-local/internal/daraja"
	"github.com/knnedy/daraja-local/internal/delivery"
	"github.com/knnedy/daraja-local/internal/ledger"
	"github.com/knnedy/daraja-local/internal/repository"
	"github.com/knnedy/daraja-local/internal/requestlog"
	"github.com/knnedy/daraja-local/internal/response"
)

// maxTransactionKES is M-Pesa's per-transaction ceiling; above it a payment
// fails with ResultCode 3.
const maxTransactionKES = 250_000

// Verifier checks a SecurityCredential against a project's Initiator.
type Verifier interface {
	Verify(ctx context.Context, projectID int64, name, securityCredential string) (bool, error)
}

// Account is a project's simulated M-Pesa balances, in cents.
type Account struct {
	UtilityCents     int64
	WorkingCents     int64
	ChargesPaidCents int64
}

// Payouts owns B2C payments end to end.
type Payouts struct {
	db        *repository.DB
	log       *requestlog.Log
	deliverer *delivery.Deliverer
	verifier  Verifier
	ledger    Recorder
	// delay stands in for the seconds Safaricom takes before posting a result.
	delay    time.Duration
	inFlight sync.WaitGroup
}

// Recorder keeps a completed transaction for Transaction Status and Reversal.
type Recorder interface {
	Record(ctx context.Context, e ledger.Entry) error
}

func NewPayouts(db *repository.DB, log *requestlog.Log, deliverer *delivery.Deliverer, verifier Verifier, recorder Recorder, delay time.Duration) *Payouts {
	return &Payouts{db: db, log: log, deliverer: deliverer, verifier: verifier, ledger: recorder, delay: delay}
}

// Request accepts a payment and processes it in the background, posting the
// result to its ResultURL, or a timeout to its QueueTimeOutURL.
func (p *Payouts) Request(ctx context.Context, project repository.Project, version APIVersion, req PaymentRequest) (AcceptResponse, *daraja.ValidationError) {
	if validationErr := validate(req, version, project); validationErr != nil {
		p.log.Rejected(ctx, project.ID, requestlog.B2CPayment, "", req, validationErr)
		return AcceptResponse{}, validationErr
	}

	originatorID := req.OriginatorConversationID
	if originatorID == "" {
		originatorID = daraja.NewOriginatorConversationID()
	}
	amount, _ := strconv.ParseInt(string(req.Amount), 10, 64)

	payment, err := p.db.Queries().CreateB2CPayment(ctx, repository.CreateB2CPaymentParams{
		ProjectID:                project.ID,
		OriginatorConversationID: originatorID,
		ConversationID:           daraja.NewConversationID(),
		TransactionID:            daraja.NewTransactionID(),
		CommandID:                req.CommandID,
		Amount:                   amount,
		PartyB:                   string(req.PartyB),
		Remarks:                  req.Remarks,
		Occasion:                 req.occasion(),
		ResultUrl:                req.ResultURL,
		QueueTimeoutUrl:          req.QueueTimeOutURL,
	})
	if err != nil {
		validationErr := &daraja.ValidationError{HTTPStatus: 500, ErrorCode: "500.001.1001", ErrorMessage: "Internal Server Error"}
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			validationErr.ErrorCode, validationErr.ErrorMessage = "500.002.1001", "Duplicate OriginatorConversationID."
		}
		p.log.Rejected(ctx, project.ID, requestlog.B2CPayment, "", req, validationErr)
		return AcceptResponse{}, validationErr
	}

	accept := AcceptResponse{
		ConversationID:           payment.ConversationID,
		OriginatorConversationID: payment.OriginatorConversationID,
		ResponseCode:             "0",
		ResponseDescription:      "Accept the service request successfully.",
	}
	p.log.Accepted(ctx, project.ID, requestlog.B2CPayment, payment.ConversationID, req, accept)

	// Taken now, so a forced outcome lands on the next payment requested, not
	// whichever one finishes processing next.
	forced := p.takeNextOutcome(ctx, project.ID)

	p.inFlight.Add(1)
	go func() {
		defer p.inFlight.Done()
		time.Sleep(p.delay)
		p.process(context.Background(), project.ShortCode, payment, forced, req.InitiatorName, req.SecurityCredential)
	}()
	return accept, nil
}

// Wait blocks until every payment in flight has been processed and delivered.
func (p *Payouts) Wait() {
	p.inFlight.Wait()
}

func (p *Payouts) process(ctx context.Context, shortCode string, payment repository.B2cPayment, forced Outcome, initiatorName, securityCredential string) {
	outcome, after := p.decide(ctx, payment, forced, initiatorName, securityCredential)
	completedAt := time.Now()
	body := buildResult(payment, outcome, after, completedAt)
	if outcome == OutcomeCompleted {
		initiated, _ := time.Parse("2006-01-02T15:04:05.999Z", payment.CreatedAt)
		_ = p.ledger.Record(ctx, ledger.Entry{
			ProjectID:                payment.ProjectID,
			Receipt:                  payment.TransactionID,
			Kind:                     ledger.KindB2C,
			OriginatorConversationID: payment.OriginatorConversationID,
			ConversationID:           payment.ConversationID,
			Amount:                   payment.Amount,
			DebitParty:               shortCode,
			CreditParty:              payment.PartyB,
			ReasonType:               reasonTypes[payment.CommandID],
			InitiatedAt:              initiated,
			FinalisedAt:              completedAt,
		})
	}

	url, status := payment.ResultUrl, "failed"
	switch outcome {
	case OutcomeCompleted:
		status = "completed"
	case OutcomeQueueTimeout:
		url, status = payment.QueueTimeoutUrl, "timed_out"
	}
	_ = p.db.Queries().CompleteB2CPayment(ctx, repository.CompleteB2CPaymentParams{
		Status:     status,
		ResultCode: sql.NullInt64{Int64: int64(resultCodes[outcome].code), Valid: true},
		ID:         payment.ID,
	})

	result := p.deliverer.Deliver(ctx, url, body)
	p.log.Delivery(ctx, payment.ProjectID, requestlog.B2CPayment, payment.ConversationID, string(outcome), body, result)
}

// decide picks the outcome: a bad credential first, then any forced outcome,
// then M-Pesa's own limits and the balance. Only a completed payment debits.
func (p *Payouts) decide(ctx context.Context, payment repository.B2cPayment, forced Outcome, initiatorName, securityCredential string) (Outcome, balances) {
	if ok, err := p.verifier.Verify(ctx, payment.ProjectID, initiatorName, securityCredential); err != nil || !ok {
		return OutcomeInvalidInitiator, balances{}
	}
	if forced != "" {
		return forced, balances{}
	}
	if payment.Amount > maxTransactionKES {
		return OutcomeOverTransactionLimit, balances{}
	}

	if err := p.db.Queries().EnsureAccount(ctx, payment.ProjectID); err != nil {
		return OutcomeInsufficientBalance, balances{}
	}
	account, err := p.db.Queries().DebitUtilityAccount(ctx, repository.DebitUtilityAccountParams{
		Cents: payment.Amount * 100, ProjectID: payment.ProjectID,
	})
	if err != nil {
		return OutcomeInsufficientBalance, balances{}
	}
	return OutcomeCompleted, balances{utility: account.UtilityCents, working: account.WorkingCents, chargesPaid: account.ChargesPaidCents}
}

// takeNextOutcome returns and clears the project's forced outcome, if any.
func (p *Payouts) takeNextOutcome(ctx context.Context, projectID int64) Outcome {
	var next string
	_ = p.db.WithTransaction(ctx, func(q *repository.Queries) error {
		settings, err := q.GetSettingsByProjectID(ctx, projectID)
		if err != nil || settings.B2cNextOutcome == "" {
			return err
		}
		next = settings.B2cNextOutcome
		return q.SetB2CNextOutcome(ctx, repository.SetB2CNextOutcomeParams{B2cNextOutcome: "", ProjectID: projectID})
	})
	return Outcome(next)
}

// Account returns a project's balances, opening its account on first use.
func (p *Payouts) Account(ctx context.Context, projectID int64) (Account, error) {
	if err := p.db.Queries().EnsureAccount(ctx, projectID); err != nil {
		return Account{}, err
	}
	row, err := p.db.Queries().GetAccount(ctx, projectID)
	if err != nil {
		return Account{}, err
	}
	return Account{UtilityCents: row.UtilityCents, WorkingCents: row.WorkingCents, ChargesPaidCents: row.ChargesPaidCents}, nil
}

// SetUtilityBalance tops up or drains the account B2C payments draw from.
func (p *Payouts) SetUtilityBalance(ctx context.Context, projectID, cents int64) (Account, error) {
	if cents < 0 {
		return Account{}, response.ErrValidation
	}
	if err := p.db.Queries().EnsureAccount(ctx, projectID); err != nil {
		return Account{}, err
	}
	if _, err := p.db.Queries().SetUtilityBalance(ctx, repository.SetUtilityBalanceParams{UtilityCents: cents, ProjectID: projectID}); err != nil {
		return Account{}, err
	}
	return p.Account(ctx, projectID)
}

// NextOutcome is the outcome the project's next payment is forced to, or "".
func (p *Payouts) NextOutcome(ctx context.Context, projectID int64) (Outcome, error) {
	settings, err := p.db.Queries().GetSettingsByProjectID(ctx, projectID)
	if errors.Is(err, sql.ErrNoRows) {
		return "", response.ErrNotFound
	}
	return Outcome(settings.B2cNextOutcome), err
}

// SetNextOutcome forces the next payment's result; "" clears it.
func (p *Payouts) SetNextOutcome(ctx context.Context, projectID int64, outcome Outcome) error {
	if outcome != "" && !isForcible(outcome) {
		return response.ErrValidation
	}
	return p.db.Queries().SetB2CNextOutcome(ctx, repository.SetB2CNextOutcomeParams{B2cNextOutcome: string(outcome), ProjectID: projectID})
}

func isForcible(outcome Outcome) bool {
	for _, o := range ForcibleOutcomes {
		if o == outcome {
			return true
		}
	}
	return false
}
