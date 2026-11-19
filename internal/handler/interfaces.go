package handler

import (
	"context"

	"github.com/knnedy/daraja-local/internal/daraja"
	"github.com/knnedy/daraja-local/internal/project"
	"github.com/knnedy/daraja-local/internal/repository"
	"github.com/knnedy/daraja-local/internal/stk"
)

type ProjectService interface {
	Create(ctx context.Context, input project.CreateInput) (repository.Project, error)
	UpdateName(ctx context.Context, slug string, input project.UpdateNameInput) (repository.Project, error)
	List(ctx context.Context) ([]repository.Project, error)
	Get(ctx context.Context, slug string) (repository.Project, error)
	Touch(ctx context.Context, slug string) error
	RegenerateCredentials(ctx context.Context, slug string) (repository.Project, error)
	Delete(ctx context.Context, slug string) error
}

type SettingsService interface {
	Get(ctx context.Context, slug string) (repository.ProjectSetting, error)
	Update(ctx context.Context, slug string, input project.UpdateSettingsInput) (repository.ProjectSetting, error)
}

type STKSessions interface {
	Accept(ctx context.Context, project repository.Project, req stk.Request) (stk.Session, *daraja.ValidationError)
	Query(ctx context.Context, project repository.Project, req stk.QueryRequest) (stk.QueryResponse, *daraja.ValidationError)
	Pending(projectID int64) []stk.Session
	Resolve(projectID int64, checkoutRequestID string, outcome stk.Outcome) (stk.Resolution, error)
	ResendCallback(ctx context.Context, projectID int64, checkoutRequestID string) error
}
