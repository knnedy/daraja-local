package service

import (
	"context"

	"github.com/knnedy/daraja-local/internal/repository"
)

// ListRequestLog returns the most recent C2B request_log rows for a
// project, newest first, capped at limit.
func (s *C2BService) ListRequestLog(ctx context.Context, projectID int64, limit int64) ([]repository.RequestLog, error) {
	return s.db.Queries().ListRequestLogEntriesByKind(ctx, repository.ListRequestLogEntriesByKindParams{
		ProjectID: projectID,
		Kind:      "c2b",
		Limit:     limit,
	})
}
