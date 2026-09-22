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

// List returns up to limit rows older than beforeID (nil for the first
// page), newest first.
func (s *RequestLogService) List(ctx context.Context, projectID int64, beforeID *int64, limit int64) ([]repository.RequestLog, error) {
	// BeforeID is interface{}, not sql.NullInt64 — sqlc's type inference.
	var cursor interface{}
	if beforeID != nil {
		cursor = *beforeID
	}

	return s.db.Queries().ListRequestLogEntriesPage(ctx, repository.ListRequestLogEntriesPageParams{
		ProjectID: projectID,
		BeforeID:  cursor,
		Limit:     limit,
	})
}

func (s *RequestLogService) Clear(ctx context.Context, projectID int64) error {
	return s.db.Queries().ClearRequestLog(ctx, projectID)
}
