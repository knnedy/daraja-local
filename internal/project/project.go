package project

import (
	"context"
	"crypto/rand"
	"database/sql"
	"errors"
	"fmt"
	"regexp"
	"strings"

	"github.com/knnedy/daraja-local/internal/repository"
	"github.com/knnedy/daraja-local/internal/response"
)

var slugInvalidChars = regexp.MustCompile(`[^a-z0-9]+`)

// Projects creates and manages Projects and their Credentials.
type Projects struct {
	db *repository.DB
}

func NewProjects(db *repository.DB) *Projects {
	return &Projects{db: db}
}

type CreateInput struct {
	Name            string
	CallbackBaseUrl string
}

func (s *Projects) Create(ctx context.Context, input CreateInput) (repository.Project, error) {
	slug, err := s.uniqueSlug(ctx, input.Name)
	if err != nil {
		return repository.Project{}, err
	}

	shortCode, err := randomDigits(6)
	if err != nil {
		return repository.Project{}, fmt.Errorf("project: generate short code: %w", err)
	}
	consumerKey, err := randomHex(20)
	if err != nil {
		return repository.Project{}, fmt.Errorf("project: generate consumer key: %w", err)
	}
	consumerSecret, err := randomHex(20)
	if err != nil {
		return repository.Project{}, fmt.Errorf("project: generate consumer secret: %w", err)
	}
	passkey, err := randomHex(32)
	if err != nil {
		return repository.Project{}, fmt.Errorf("project: generate passkey: %w", err)
	}

	var project repository.Project
	err = s.db.WithTransaction(ctx, func(q *repository.Queries) error {
		p, err := q.CreateProject(ctx, repository.CreateProjectParams{
			Slug:            slug,
			Name:            input.Name,
			ShortCode:       shortCode,
			ConsumerKey:     consumerKey,
			ConsumerSecret:  consumerSecret,
			Passkey:         passkey,
			CallbackBaseUrl: input.CallbackBaseUrl,
		})
		if err != nil {
			return fmt.Errorf("create project row: %w", err)
		}

		if _, err := q.CreateDefaultSettings(ctx, p.ID); err != nil {
			return fmt.Errorf("create default settings row: %w", err)
		}

		project = p
		return nil
	})
	if err != nil {
		return repository.Project{}, err
	}

	return project, nil
}

func (s *Projects) List(ctx context.Context) ([]repository.Project, error) {
	return s.db.Queries().ListProjects(ctx)
}

func (s *Projects) Get(ctx context.Context, slug string) (repository.Project, error) {
	p, err := s.db.Queries().GetProjectBySlug(ctx, slug)
	if err != nil {
		return repository.Project{}, response.ErrNotFound
	}
	return p, nil
}

// Touch marks a project as the active one, called whenever the frontend
// switches the active project in the sidebar.
func (s *Projects) Touch(ctx context.Context, slug string) error {
	return s.db.Queries().TouchProjectLastActive(ctx, slug)
}

// UpdateInput changes only the fields that are set.
type UpdateInput struct {
	Name            *string
	CallbackBaseUrl *string
}

func (s *Projects) Update(ctx context.Context, slug string, input UpdateInput) (repository.Project, error) {
	project, err := s.db.Queries().UpdateProject(ctx, repository.UpdateProjectParams{
		Name:            nullable(input.Name),
		CallbackBaseUrl: nullable(input.CallbackBaseUrl),
		Slug:            slug,
	})
	return project, notFoundIfNoRows(err)
}

func nullable(s *string) sql.NullString {
	if s == nil {
		return sql.NullString{}
	}
	return sql.NullString{String: *s, Valid: true}
}

// RegenerateCredentials rotates consumer key, consumer secret, and
// passkey — the "Regenerate" action on the Credentials page.
func (s *Projects) RegenerateCredentials(ctx context.Context, slug string) (repository.Project, error) {
	consumerKey, err := randomHex(20)
	if err != nil {
		return repository.Project{}, fmt.Errorf("project: generate consumer key: %w", err)
	}
	consumerSecret, err := randomHex(20)
	if err != nil {
		return repository.Project{}, fmt.Errorf("project: generate consumer secret: %w", err)
	}
	passkey, err := randomHex(32)
	if err != nil {
		return repository.Project{}, fmt.Errorf("project: generate passkey: %w", err)
	}

	project, err := s.db.Queries().RegenerateProjectCredentials(ctx, repository.RegenerateProjectCredentialsParams{
		ConsumerKey:    consumerKey,
		ConsumerSecret: consumerSecret,
		Passkey:        passkey,
		Slug:           slug,
	})
	return project, notFoundIfNoRows(err)
}

func notFoundIfNoRows(err error) error {
	if errors.Is(err, sql.ErrNoRows) {
		return response.ErrNotFound
	}
	return err
}

func (s *Projects) Delete(ctx context.Context, slug string) error {
	return s.db.Queries().DeleteProject(ctx, slug)
}

func (s *Projects) uniqueSlug(ctx context.Context, name string) (string, error) {
	base := slugify(name)
	slug := base
	for suffix := 2; ; suffix++ {
		exists, err := s.db.Queries().SlugExists(ctx, slug)
		if err != nil {
			return "", fmt.Errorf("project: check slug uniqueness: %w", err)
		}
		if !exists {
			return slug, nil
		}
		slug = fmt.Sprintf("%s-%d", base, suffix)
	}
}

func slugify(name string) string {
	lower := strings.ToLower(strings.TrimSpace(name))
	slug := slugInvalidChars.ReplaceAllString(lower, "-")
	return strings.Trim(slug, "-")
}

func randomHex(numBytes int) (string, error) {
	buf := make([]byte, numBytes)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return fmt.Sprintf("%x", buf), nil
}

// randomDigits generates a numeric string of the given length (used for the
// mock M-Pesa shortcode) using crypto/rand
func randomDigits(length int) (string, error) {
	digits := make([]byte, length)
	buf := make([]byte, length)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	for i, b := range buf {
		digits[i] = '0' + b%10
	}
	if digits[0] == '0' {
		digits[0] = '1' + buf[0]%9
	}
	return string(digits), nil
}
