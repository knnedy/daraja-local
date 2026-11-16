package handler

import (
	"context"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/knnedy/daraja-local/internal/repository"
	"github.com/knnedy/daraja-local/internal/requestlog"
	"github.com/knnedy/daraja-local/internal/response"
)

const defaultRequestLogLimit = 50

type RequestLog interface {
	List(ctx context.Context, projectID int64, filter requestlog.Filter) ([]repository.RequestLog, error)
	Clear(ctx context.Context, projectID int64) error
}

type RequestLogHandler struct {
	projectService ProjectService
	log            RequestLog
}

func NewRequestLogHandler(projectService ProjectService, log RequestLog) *RequestLogHandler {
	return &RequestLogHandler{projectService: projectService, log: log}
}

type requestLogEntryResponse struct {
	ID            int64   `json:"id"`
	CorrelationID *string `json:"correlationId"`
	Kind          string  `json:"kind"`
	Operation     string  `json:"operation"`
	Step          string  `json:"step"`
	Direction     string  `json:"direction"`
	Status        string  `json:"status"`
	Outcome       *string `json:"outcome"`
	Attempts      int64   `json:"attempts"`
	Payload       string  `json:"payload"`
	CreatedAt     string  `json:"createdAt"`
}

func toRequestLogEntryResponse(e repository.RequestLog) requestLogEntryResponse {
	out := requestLogEntryResponse{
		ID:        e.ID,
		Kind:      e.Kind,
		Operation: e.Operation,
		Step:      e.Step,
		Direction: e.Direction,
		Status:    e.Status,
		Attempts:  e.Attempts,
		Payload:   e.Payload,
		CreatedAt: e.CreatedAt,
	}
	if e.CorrelationID.Valid {
		out.CorrelationID = &e.CorrelationID.String
	}
	if e.Outcome.Valid {
		out.Outcome = &e.Outcome.String
	}
	return out
}

// List handles GET .../request-log?before_id=&limit= for one kind, or every kind when empty.
func (h *RequestLogHandler) List(kind requestlog.Kind) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		project, err := h.projectService.Get(r.Context(), chi.URLParam(r, "slug"))
		if err != nil {
			writeServiceError(w, err, "failed to get project")
			return
		}

		filter := requestlog.Filter{Kind: kind, Limit: defaultRequestLogLimit}
		if parsed, err := strconv.ParseInt(r.URL.Query().Get("limit"), 10, 64); err == nil && parsed > 0 {
			filter.Limit = parsed
		}
		if parsed, err := strconv.ParseInt(r.URL.Query().Get("before_id"), 10, 64); err == nil {
			filter.BeforeID = parsed
		}

		entries, err := h.log.List(r.Context(), project.ID, filter)
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
}

// Clear handles DELETE /api/projects/{slug}/request-log.
func (h *RequestLogHandler) Clear(w http.ResponseWriter, r *http.Request) {
	project, err := h.projectService.Get(r.Context(), chi.URLParam(r, "slug"))
	if err != nil {
		writeServiceError(w, err, "failed to get project")
		return
	}
	if err := h.log.Clear(r.Context(), project.ID); err != nil {
		writeServiceError(w, err, "failed to clear request log")
		return
	}
	response.JSON(w, http.StatusNoContent, nil)
}
