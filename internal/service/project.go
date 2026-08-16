package service

import (
	"context"
	"crypto/rand"
	"fmt"
	"regexp"
	"strings"

	"github.com/knnedy/daraja-local/internal/repository"
	"github.com/knnedy/daraja-local/internal/response"
)

var slugInvalidChars = regexp.MustCompile(`[^a-z0-9]+`)

type ProjectService struct {
	db *repository.DB
}

func NewProjectService(db *repository.DB) *ProjectService {
	return &ProjectService{db: db}
}

type CreateProjectInput struct {
	Name            string
	CallbackBaseUrl string
}

func (s *ProjectService) Create(ctx context.Context, input CreateProjectInput) (repository.Project, error) {
	slug, err := s.uniqueSlug(ctx, input.Name)
	if err != nil {
		return repository.Project{}, err
	}

	shortCode, err := randomDigits(6)
	if err != nil {
		return repository.Project{}, fmt.Errorf("service: generate short code: %w", err)
	}
	consumerKey, err := randomHex(20)
	if err != nil {
		return repository.Project{}, fmt.Errorf("service: generate consumer key: %w", err)
	}
	consumerSecret, err := randomHex(20)
	if err != nil {
		return repository.Project{}, fmt.Errorf("service: generate consumer secret: %w", err)
	}
	passkey, err := randomHex(32)
	if err != nil {
		return repository.Project{}, fmt.Errorf("service: generate passkey: %w", err)
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

func (s *ProjectService) List(ctx context.Context) ([]repository.Project, error) {
	return s.db.Queries().ListProjects(ctx)
}

func (s *ProjectService) Get(ctx context.Context, slug string) (repository.Project, error) {
	p, err := s.db.Queries().GetProjectBySlug(ctx, slug)
	if err != nil {
		return repository.Project{}, response.ErrNotFound
	}
	return p, nil
}

// Touch marks a project as the active one, called whenever the frontend
// switches the active project in the sidebar.
func (s *ProjectService) Touch(ctx context.Context, slug string) error {
	return s.db.Queries().TouchProjectLastActive(ctx, slug)
}

type UpdateNameInput struct {
	Name string
}

func (s *ProjectService) UpdateName(ctx context.Context, slug string, input UpdateNameInput) (repository.Project, error) {
	return s.db.Queries().UpdateProjectName(ctx, repository.UpdateProjectNameParams{
		Name: input.Name,
		Slug: slug,
	})
}

// RegenerateCredentials rotates consumer key, consumer secret, and
// passkey — the "Regenerate" action on the Credentials page.
func (s *ProjectService) RegenerateCredentials(ctx context.Context, slug string) (repository.Project, error) {
	consumerKey, err := randomHex(20)
	if err != nil {
		return repository.Project{}, fmt.Errorf("service: generate consumer key: %w", err)
	}
	consumerSecret, err := randomHex(20)
	if err != nil {
		return repository.Project{}, fmt.Errorf("service: generate consumer secret: %w", err)
	}
	passkey, err := randomHex(32)
	if err != nil {
		return repository.Project{}, fmt.Errorf("service: generate passkey: %w", err)
	}

	return s.db.Queries().RegenerateProjectCredentials(ctx, repository.RegenerateProjectCredentialsParams{
		ConsumerKey:    consumerKey,
		ConsumerSecret: consumerSecret,
		Passkey:        passkey,
		Slug:           slug,
	})
}

func (s *ProjectService) Delete(ctx context.Context, slug string) error {
	return s.db.Queries().DeleteProject(ctx, slug)
}

func (s *ProjectService) uniqueSlug(ctx context.Context, name string) (string, error) {
	base := slugify(name)
	slug := base
	for suffix := 2; ; suffix++ {
		exists, err := s.db.Queries().SlugExists(ctx, slug)
		if err != nil {
			return "", fmt.Errorf("service: check slug uniqueness: %w", err)
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
