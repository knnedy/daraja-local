package handler

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/knnedy/daraja-local/internal/response"
)

// ListRequestLog handles GET /api/projects/{slug}/c2b/request-log.
func (h *C2BHandler) ListRequestLog(w http.ResponseWriter, r *http.Request, projectSvc ProjectService) {
	slug := chi.URLParam(r, "slug")

	project, err := projectSvc.Get(r.Context(), slug)
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
