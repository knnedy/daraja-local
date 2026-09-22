package handler

import (
	"context"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/knnedy/daraja-local/internal/repository"
	"github.com/knnedy/daraja-local/internal/response"
)

type RequestLogService interface {
	List(ctx context.Context, projectID int64, beforeID *int64, limit int64) ([]repository.RequestLog, error)
	Clear(ctx context.Context, projectID int64) error
}

type RequestLogHandler struct {
	projectService ProjectService
	service        RequestLogService
}

func NewRequestLogHandler(projectService ProjectService, s RequestLogService) *RequestLogHandler {
	return &RequestLogHandler{projectService: projectService, service: s}
}

// List handles GET /api/projects/{slug}/request-log?before_id=&limit=.
func (h *RequestLogHandler) List(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")

	project, err := h.projectService.Get(r.Context(), slug)
	if err != nil {
		writeServiceError(w, err, "failed to get project")
		return
	}

	limit := int64(defaultRequestLogLimit)
	if raw := r.URL.Query().Get("limit"); raw != "" {
		if parsed, err := strconv.ParseInt(raw, 10, 64); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	var beforeID *int64
	if raw := r.URL.Query().Get("before_id"); raw != "" {
		if parsed, err := strconv.ParseInt(raw, 10, 64); err == nil {
			beforeID = &parsed
		}
	}

	entries, err := h.service.List(r.Context(), project.ID, beforeID, limit)
	if err != nil {
		writeServiceError(w, err, "failed to list request log")
		return
	}

	out := make([]requestLogEntryResponse, len(entries))
	for i, e := range entries {
		out[i] = toRequestLogEntryResponse(e)
	}
	response.JSON(w, http.StatusOK, out)
}

// Clear handles DELETE /api/projects/{slug}/request-log.
func (h *RequestLogHandler) Clear(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")

	project, err := h.projectService.Get(r.Context(), slug)
	if err != nil {
		writeServiceError(w, err, "failed to get project")
		return
	}

	if err := h.service.Clear(r.Context(), project.ID); err != nil {
		writeServiceError(w, err, "failed to clear request log")
		return
	}

	response.JSON(w, http.StatusNoContent, nil)
}
