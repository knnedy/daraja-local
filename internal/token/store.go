// Package token holds daraja-local's OAuth token issuance and validation.
package token

import (
	"crypto/rand"
	"fmt"
	"sync"
	"time"
)

// TTL matches real Daraja api expires_in value "3599"
const TTL = 3599 * time.Second

type Token struct {
	Value     string
	ProjectID int64
	ExpiresAt time.Time
}

type Store struct {
	mu     sync.Mutex
	tokens map[string]Token
}

func NewStore() *Store {
	return &Store{tokens: make(map[string]Token)}
}

// Issue generates a new token for projectID.
func (s *Store) Issue(projectID int64) (Token, error) {
	value, err := randomToken()
	if err != nil {
		return Token{}, fmt.Errorf("token: generate: %w", err)
	}

	t := Token{
		Value:     value,
		ProjectID: projectID,
		ExpiresAt: time.Now().Add(TTL),
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	s.prune()
	s.tokens[value] = t
	return t, nil
}

// Validate returns the token and true if value is a known, unexpired
// token.
func (s *Store) Validate(value string) (Token, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	t, ok := s.tokens[value]
	if !ok || time.Now().After(t.ExpiresAt) {
		return Token{}, false
	}
	return t, true
}

// prune removes expired tokens. Caller must hold the lock.
func (s *Store) prune() {
	now := time.Now()
	for k, t := range s.tokens {
		if now.After(t.ExpiresAt) {
			delete(s.tokens, k)
		}
	}
}

func randomToken() (string, error) {
	buf := make([]byte, 24)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return fmt.Sprintf("%x", buf), nil
}
