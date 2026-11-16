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

// UpdateSettingsInput holds the simulation defaults. C2B registration is
// not here: only registerurl changes it.
type UpdateSettingsInput struct {
	StkTimeoutSeconds  int64
	DefaultPhoneNumber string
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

	return s.db.Queries().UpdateSimulationDefaults(ctx, repository.UpdateSimulationDefaultsParams{
		StkTimeoutSeconds:  input.StkTimeoutSeconds,
		DefaultPhoneNumber: input.DefaultPhoneNumber,
		ProjectID:          project.ID,
	})
}
