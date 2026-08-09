package service

import (
	"context"
	"fmt"

	"github.com/knnedy/daraja-local/internal/repository"
	"github.com/knnedy/daraja-local/internal/response"
)

type SettingsService struct {
	db *repository.DB
}

func NewSettingsService(db *repository.DB) *SettingsService {
	return &SettingsService{db: db}
}

type UpdateSettingsInput struct {
	CallbackUrl               string
	StkTimeoutSeconds         int64
	C2bResponseType           string
	ExternalValidationDefault int64
}

func (s *SettingsService) Get(ctx context.Context, slug string) (repository.ProjectSetting, error) {
	project, err := s.db.Queries().GetProjectBySlug(ctx, slug)
	if err != nil {
		return repository.ProjectSetting{}, response.ErrNotFound
	}
	settings, err := s.db.Queries().GetSettingsByProjectID(ctx, project.ID)
	if err != nil {
		return repository.ProjectSetting{}, fmt.Errorf("service: get settings: %w", err)
	}
	return settings, nil
}

func (s *SettingsService) Update(ctx context.Context, slug string, input UpdateSettingsInput) (repository.ProjectSetting, error) {
	project, err := s.db.Queries().GetProjectBySlug(ctx, slug)
	if err != nil {
		return repository.ProjectSetting{}, response.ErrNotFound
	}

	return s.db.Queries().UpdateSettings(ctx, repository.UpdateSettingsParams{
		CallbackUrl:               input.CallbackUrl,
		StkTimeoutSeconds:         input.StkTimeoutSeconds,
		C2bResponseType:           input.C2bResponseType,
		ExternalValidationDefault: input.ExternalValidationDefault,
		ProjectID:                 project.ID,
	})
}
