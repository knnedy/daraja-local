package project

import (
	"context"
	"fmt"

	"github.com/knnedy/daraja-local/internal/repository"
	"github.com/knnedy/daraja-local/internal/response"
)

// Settings reads and updates a Project's simulation defaults.
type Settings struct {
	db *repository.DB
}

func NewSettings(db *repository.DB) *Settings {
	return &Settings{db: db}
}

// UpdateSettingsInput holds the simulation defaults. C2B registration is
// not here: only registerurl changes it.
type UpdateSettingsInput struct {
	StkTimeoutSeconds  int64
	DefaultPhoneNumber string
}

func (s *Settings) Get(ctx context.Context, slug string) (repository.ProjectSetting, error) {
	project, err := s.db.Queries().GetProjectBySlug(ctx, slug)
	if err != nil {
		return repository.ProjectSetting{}, response.ErrNotFound
	}
	settings, err := s.db.Queries().GetSettingsByProjectID(ctx, project.ID)
	if err != nil {
		return repository.ProjectSetting{}, fmt.Errorf("project: get settings: %w", err)
	}
	return settings, nil
}

func (s *Settings) Update(ctx context.Context, slug string, input UpdateSettingsInput) (repository.ProjectSetting, error) {
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
