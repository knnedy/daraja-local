// Package ledger owns the record of completed M-Pesa transactions and the two
// Daraja APIs that read it: Transaction Status and Reversal.
package ledger

import (
	"context"
	"database/sql"
	"errors"
	"sync"
	"time"

	"github.com/knnedy/daraja-local/internal/delivery"
	"github.com/knnedy/daraja-local/internal/repository"
	"github.com/knnedy/daraja-local/internal/requestlog"
)

// Kind is the API that made a transaction.
type Kind string

const (
	KindSTKPush  Kind = "stk_push"
	KindC2B      Kind = "c2b"
	KindB2C      Kind = "b2c"
	KindReversal Kind = "reversal"
)

// Entry is one completed transaction. Parties are a shortcode or a phone
// number; names are added when a result is built.
type Entry struct {
	ProjectID                int64
	Receipt                  string
	Kind                     Kind
	OriginatorConversationID string
	ConversationID           string
	Amount                   int64
	DebitParty               string
	CreditParty              string
	ReasonType               string
	InitiatedAt              time.Time
	FinalisedAt              time.Time
}

// Verifier checks a SecurityCredential against a project's Initiator.
type Verifier interface {
	Verify(ctx context.Context, projectID int64, name, securityCredential string) (bool, error)
}

type Ledger struct {
	db        *repository.DB
	log       *requestlog.Log
	deliverer *delivery.Deliverer
	verifier  Verifier
	// delay stands in for the seconds Safaricom takes before posting a result.
	delay    time.Duration
	inFlight sync.WaitGroup
}

func New(db *repository.DB, log *requestlog.Log, deliverer *delivery.Deliverer, verifier Verifier, delay time.Duration) *Ledger {
	return &Ledger{db: db, log: log, deliverer: deliverer, verifier: verifier, delay: delay}
}

// Record keeps a completed transaction. Money paid in by a customer (STK and
// C2B) is credited to the project's working account, which Reversal draws on.
func (l *Ledger) Record(ctx context.Context, e Entry) error {
	return l.db.WithTransaction(ctx, func(q *repository.Queries) error {
		if err := q.CreateTransaction(ctx, createParams(e)); err != nil {
			return err
		}
		if e.Kind != KindSTKPush && e.Kind != KindC2B {
			return nil
		}
		if err := q.EnsureAccount(ctx, e.ProjectID); err != nil {
			return err
		}
		return q.CreditWorkingAccount(ctx, repository.CreditWorkingAccountParams{Cents: e.Amount * 100, ProjectID: e.ProjectID})
	})
}

func createParams(e Entry) repository.CreateTransactionParams {
	return repository.CreateTransactionParams{
		ProjectID:                e.ProjectID,
		Receipt:                  e.Receipt,
		Kind:                     string(e.Kind),
		OriginatorConversationID: e.OriginatorConversationID,
		ConversationID:           e.ConversationID,
		Amount:                   e.Amount,
		DebitParty:               e.DebitParty,
		CreditParty:              e.CreditParty,
		ReasonType:               e.ReasonType,
		InitiatedAt:              e.InitiatedAt.UTC().Format(time.RFC3339),
		FinalisedAt:              e.FinalisedAt.UTC().Format(time.RFC3339),
	}
}

// Transaction is a recorded Entry and whether it has been reversed.
type Transaction struct {
	Entry
	ReversedBy string
}

// List returns a project's transactions, newest first.
func (l *Ledger) List(ctx context.Context, projectID, limit int64) ([]Transaction, error) {
	rows, err := l.db.Queries().ListTransactions(ctx, repository.ListTransactionsParams{ProjectID: projectID, RowLimit: limit})
	if err != nil {
		return nil, err
	}
	out := make([]Transaction, 0, len(rows))
	for _, row := range rows {
		out = append(out, fromRow(row))
	}
	return out, nil
}

// Wait blocks until every query and reversal in flight has posted its result.
func (l *Ledger) Wait() {
	l.inFlight.Wait()
}

// find looks a transaction up by receipt, or by the OriginatorConversationID
// of the request that made it.
func (l *Ledger) find(ctx context.Context, projectID int64, receipt, originatorID string) (Transaction, bool, error) {
	var row repository.Transaction
	var err error
	switch {
	case receipt != "":
		row, err = l.db.Queries().GetTransactionByReceipt(ctx, repository.GetTransactionByReceiptParams{ProjectID: projectID, Receipt: receipt})
	case originatorID != "":
		row, err = l.db.Queries().GetTransactionByOriginator(ctx, repository.GetTransactionByOriginatorParams{ProjectID: projectID, OriginatorConversationID: originatorID})
	default:
		return Transaction{}, false, nil
	}
	if errors.Is(err, sql.ErrNoRows) {
		return Transaction{}, false, nil
	}
	if err != nil {
		return Transaction{}, false, err
	}
	return fromRow(row), true, nil
}

func fromRow(row repository.Transaction) Transaction {
	initiated, _ := time.Parse(time.RFC3339, row.InitiatedAt)
	finalised, _ := time.Parse(time.RFC3339, row.FinalisedAt)
	return Transaction{
		Entry: Entry{
			ProjectID:                row.ProjectID,
			Receipt:                  row.Receipt,
			Kind:                     Kind(row.Kind),
			OriginatorConversationID: row.OriginatorConversationID,
			ConversationID:           row.ConversationID,
			Amount:                   row.Amount,
			DebitParty:               row.DebitParty,
			CreditParty:              row.CreditParty,
			ReasonType:               row.ReasonType,
			InitiatedAt:              initiated,
			FinalisedAt:              finalised,
		},
		ReversedBy: row.ReversedBy,
	}
}

// async runs fn after the processing delay, tracked by Wait.
func (l *Ledger) async(fn func(ctx context.Context)) {
	l.inFlight.Add(1)
	go func() {
		defer l.inFlight.Done()
		time.Sleep(l.delay)
		fn(context.Background())
	}()
}
