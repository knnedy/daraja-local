package handler

import (
	"context"

	"github.com/knnedy/daraja-local/internal/repository"
	"github.com/knnedy/daraja-local/internal/service"
	"github.com/knnedy/daraja-local/internal/stk"
)

type ProjectService interface {
	Create(ctx context.Context, input service.CreateProjectInput) (repository.Project, error)
	UpdateName(ctx context.Context, slug string, input service.UpdateNameInput) (repository.Project, error)
	List(ctx context.Context) ([]repository.Project, error)
	Get(ctx context.Context, slug string) (repository.Project, error)
	Touch(ctx context.Context, slug string) error
	RegenerateCredentials(ctx context.Context, slug string) (repository.Project, error)
	Delete(ctx context.Context, slug string) error
}

type SettingsService interface {
	Get(ctx context.Context, slug string) (repository.ProjectSetting, error)
	Update(ctx context.Context, slug string, input service.UpdateSettingsInput) (repository.ProjectSetting, error)
}

type STKService interface {
	ProcessRequest(ctx context.Context, project repository.Project, req stk.Request) (stk.Session, *stk.ValidationError)
	ListPending(projectID int64) []stk.Session
	Resolve(ctx context.Context, checkoutRequestID string, outcome stk.Outcome) error
	ListRequestLog(ctx context.Context, projectID int64, limit int64) ([]repository.RequestLog, error)
}
