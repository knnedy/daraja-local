package token

import (
	"context"
	"errors"

	"github.com/knnedy/daraja-local/internal/repository"
	"github.com/knnedy/daraja-local/internal/response"
)

// Issuer issues and validates access tokens against a project's
// consumer key/secret, matching Daraja's client_credentials grant.
type Issuer struct {
	db    *repository.DB
	store *Store
}

func NewIssuer(db *repository.DB) *Issuer {
	return &Issuer{db: db, store: NewStore()}
}

// Generate validates the given consumer key/secret against a project
// and, on success, issues a new token for it.
func (s *Issuer) Generate(ctx context.Context, consumerKey, consumerSecret string) (Token, error) {
	project, err := s.db.Queries().GetProjectByCredentials(ctx, repository.GetProjectByCredentialsParams{
		ConsumerKey:    consumerKey,
		ConsumerSecret: consumerSecret,
	})
	if err != nil {
		return Token{}, response.ErrNotFound
	}

	return s.store.Issue(project.ID)
}

// Validate checks a bearer token value and returns the project it
// belongs to. Used by auth middleware protecting STK/C2B routes.
func (s *Issuer) Validate(ctx context.Context, value string) (repository.Project, error) {
	t, ok := s.store.Validate(value)
	if !ok {
		return repository.Project{}, errors.New("token: invalid or expired")
	}

	return s.db.Queries().GetProjectByID(ctx, t.ProjectID)
}
