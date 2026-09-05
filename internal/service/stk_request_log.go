package service

import (
	"context"

	"github.com/knnedy/daraja-local/internal/repository"
)

// ListRequestLog returns the most recent STK request_log rows for a
// project, newest first, capped at limit.
func (s *STKService) ListRequestLog(ctx context.Context, projectID int64, limit int64) ([]repository.RequestLog, error) {
	return s.db.Queries().ListRequestLogEntriesByKind(ctx, repository.ListRequestLogEntriesByKindParams{
		ProjectID: projectID,
		Kind:      "stk_push",
		Limit:     limit,
	})
}
