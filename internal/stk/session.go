// Package stk holds daraja-local's STK Push simulation. Sessions are in-memory and are
// lost on restart but request_log captures the durable history
package stk

import (
	"strconv"
	"sync"
	"time"
)

// Session tracks one STK Push attempt from acceptance to resolution
type Session struct {
	MerchantRequestID string
	CheckoutRequestID string
	ProjectID         string

	BusinessShortCode string
	PartyA            string
	PartyB            string
	PhoneNumber       string
	Amount            int64
	AccountReference  string
	TransactionDesc   string
	CallbackURL       string

	CreatedAt time.Time
	UpdatedAt time.Time

	Resolved   bool
	ResultCode int
	ResultDesc string
}

type Store struct {
	mu       sync.Mutex
	sessions map[string]*Session
}

func NewStore() *Store {
	return &Store{sessions: make(map[string]*Session)}
}

// Create registers a new pending session, keyed by CheckoutRequestID
func (s *Store) Create(session Session) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sessions[session.CheckoutRequestID] = &session
}

// Get returns a copy of the session, if it exists
func (s *Store) Get(CheckoutRequestID string) (Session, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	session, ok := s.sessions[CheckoutRequestID]
	if !ok {
		return Session{}, false
	}
	return *session, true
}

// ListPending returns unresolved sessions for a project, for the virtual
// Phone UI to poll
func (s *Store) ListPending(projectID int64) []Session {
	s.mu.Lock()
	defer s.mu.Unlock()

	var pending []Session
	for _, session := range s.sessions {
		if session.ProjectID == strconv.FormatInt(projectID, 10) && !session.Resolved {
			pending = append(pending, *session)
		}
	}
	return pending
}

// Resolve marks a session resolved with the given outcome. Returns the
// resolved session and true, or false if the session doesn't exist or
// was already resolved
func (s *Store) Resolve(CheckoutRequestID string, resultCode int, resultDesc string) (Session, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	session, ok := s.sessions[CheckoutRequestID]
	if !ok || session.Resolved {
		return Session{}, false
	}

	session.Resolved = true
	session.ResultCode = resultCode
	session.ResultDesc = resultDesc
	return *session, true
}
