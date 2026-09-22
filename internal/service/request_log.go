package service

import (
	"context"

	"github.com/knnedy/daraja-local/internal/repository"
)

type RequestLogService struct {
	db *repository.DB
}

func NewRequestLogService(db *repository.DB) *RequestLogService {
	return &RequestLogService{db: db}
}

func (s *RequestLogService) List(ctx context.Context, projectID int64, beforeID *int64, limit int64) ([]repository.RequestLog, error) {
	if beforeID == nil {
		return s.db.Queries().ListRequestLogEntriesFirstPage(ctx, repository.ListRequestLogEntriesFirstPageParams{
			ProjectID: projectID,
			Limit:     limit,
		})
	}

	return s.db.Queries().ListRequestLogEntriesNextPage(ctx, repository.ListRequestLogEntriesNextPageParams{
		ProjectID: projectID,
		ID:        *beforeID,
		Limit:     limit,
	})
}

func (s *RequestLogService) Clear(ctx context.Context, projectID int64) error {
	return s.db.Queries().ClearRequestLog(ctx, projectID)
}
