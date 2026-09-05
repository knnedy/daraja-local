package handler

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/knnedy/daraja-local/internal/repository"
	"github.com/knnedy/daraja-local/internal/response"
)

const defaultRequestLogLimit = 50

type requestLogEntryResponse struct {
	ID            int64   `json:"id"`
	CorrelationID *string `json:"correlationId"`
	Kind          string  `json:"kind"`
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

// ListRequestLog handles GET /api/projects/{slug}/stk/request-log.
func (h *STKHandler) ListRequestLog(w http.ResponseWriter, r *http.Request) {
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

	entries, err := h.service.ListRequestLog(r.Context(), project.ID, limit)
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
