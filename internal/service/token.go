package service

import (
	"context"
	"errors"

	"github.com/knnedy/daraja-local/internal/repository"
	"github.com/knnedy/daraja-local/internal/response"
	"github.com/knnedy/daraja-local/internal/token"
)

// TokenService issues and validates OAuth tokens against a project's
// consumer key/secret, matching Daraja api client_credentials grant.
type TokenService struct {
	db    *repository.DB
	store *token.Store
}

func NewTokenService(db *repository.DB, store *token.Store) *TokenService {
	return &TokenService{db: db, store: store}
}

// Generate validates the given consumer key/secret against a project
// and, on success, issues a new token for it.
func (s *TokenService) Generate(ctx context.Context, consumerKey, consumerSecret string) (token.Token, error) {
	project, err := s.db.Queries().GetProjectByCredentials(ctx, repository.GetProjectByCredentialsParams{
		ConsumerKey:    consumerKey,
		ConsumerSecret: consumerSecret,
	})
	if err != nil {
		return token.Token{}, response.ErrNotFound
	}

	return s.store.Issue(project.ID)
}

// Validate checks a bearer token value and returns the project it
// belongs to. Used by auth middleware protecting STK/C2B routes.
func (s *TokenService) Validate(ctx context.Context, value string) (repository.Project, error) {
	t, ok := s.store.Validate(value)
	if !ok {
		return repository.Project{}, errors.New("token: invalid or expired")
	}

	return s.db.Queries().GetProjectByID(ctx, t.ProjectID)
}
