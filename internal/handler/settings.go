package handler

import (
	"encoding/json"
	"net/http"
	"regexp"

	"github.com/go-chi/chi/v5"

	"github.com/knnedy/daraja-local/internal/repository"
	"github.com/knnedy/daraja-local/internal/response"
	"github.com/knnedy/daraja-local/internal/service"
)

var phoneNumberPattern = regexp.MustCompile(`^254\d{9}$`)

type SettingsHandler struct {
	service SettingsService
}

func NewSettingsHandler(s SettingsService) *SettingsHandler {
	return &SettingsHandler{service: s}
}

type settingsResponse struct {
	ProjectID          int64  `json:"projectId"`
	StkTimeoutSeconds  int64  `json:"stkTimeoutSeconds"`
	DefaultPhoneNumber string `json:"defaultPhoneNumber"`
}

func toSettingsResponse(s repository.ProjectSetting) settingsResponse {
	return settingsResponse{
		ProjectID:          s.ProjectID,
		StkTimeoutSeconds:  s.StkTimeoutSeconds,
		DefaultPhoneNumber: s.DefaultPhoneNumber,
	}
}

// Get handles GET /api/projects/{slug}/settings.
func (h *SettingsHandler) Get(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")

	settings, err := h.service.Get(r.Context(), slug)
	if err != nil {
		writeServiceError(w, err, "failed to get settings")
		return
	}
	response.JSON(w, http.StatusOK, toSettingsResponse(settings))
}

type updateSettingsRequest struct {
	StkTimeoutSeconds  int64  `json:"stkTimeoutSeconds"`
	DefaultPhoneNumber string `json:"defaultPhoneNumber"`
}

// Update handles PUT /api/projects/{slug}/settings.
func (h *SettingsHandler) Update(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")

	var req updateSettingsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.StkTimeoutSeconds < 5 || req.StkTimeoutSeconds > 60 {
		response.Error(w, http.StatusUnprocessableEntity, "stkTimeoutSeconds must be between 5 and 60")
		return
	}
	if !phoneNumberPattern.MatchString(req.DefaultPhoneNumber) {
		response.Error(w, http.StatusUnprocessableEntity, "defaultPhoneNumber must be in the format 254XXXXXXXXX")
		return
	}

	settings, err := h.service.Update(r.Context(), slug, service.UpdateSettingsInput{
		StkTimeoutSeconds:  req.StkTimeoutSeconds,
		DefaultPhoneNumber: req.DefaultPhoneNumber,
	})
	if err != nil {
		writeServiceError(w, err, "failed to update settings")
		return
	}
	response.JSON(w, http.StatusOK, toSettingsResponse(settings))
}
