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
	ProjectID                 int64  `json:"projectId"`
	CallbackUrl               string `json:"callbackUrl"`
	StkTimeoutSeconds         int64  `json:"stkTimeoutSeconds"`
	C2bResponseType           string `json:"c2bResponseType"`
	ExternalValidationDefault bool   `json:"externalValidationDefault"`
	DefaultPhoneNumber        string `json:"defaultPhoneNumber"`
}

func toSettingsResponse(s repository.ProjectSetting) settingsResponse {
	return settingsResponse{
		ProjectID:                 s.ProjectID,
		CallbackUrl:               s.CallbackUrl,
		StkTimeoutSeconds:         s.StkTimeoutSeconds,
		C2bResponseType:           s.C2bResponseType,
		ExternalValidationDefault: s.ExternalValidationDefault != 0,
		DefaultPhoneNumber:        s.DefaultPhoneNumber,
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
	CallbackUrl               string `json:"callbackUrl"`
	StkTimeoutSeconds         int64  `json:"stkTimeoutSeconds"`
	C2bResponseType           string `json:"c2bResponseType"`
	ExternalValidationDefault bool   `json:"externalValidationDefault"`
	DefaultPhoneNumber        string `json:"defaultPhoneNumber"`
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
	if req.C2bResponseType != "Completed" && req.C2bResponseType != "Cancelled" {
		response.Error(w, http.StatusUnprocessableEntity, `c2bResponseType must be "Completed" or "Cancelled"`)
		return
	}
	if !phoneNumberPattern.MatchString(req.DefaultPhoneNumber) {
		response.Error(w, http.StatusUnprocessableEntity, "defaultPhoneNumber must be in the format 254XXXXXXXXX")
		return
	}

	externalValidationDefault := int64(0)
	if req.ExternalValidationDefault {
		externalValidationDefault = 1
	}

	settings, err := h.service.Update(r.Context(), slug, service.UpdateSettingsInput{
		CallbackUrl:               req.CallbackUrl,
		StkTimeoutSeconds:         req.StkTimeoutSeconds,
		C2bResponseType:           req.C2bResponseType,
		ExternalValidationDefault: externalValidationDefault,
		DefaultPhoneNumber:        req.DefaultPhoneNumber,
	})
	if err != nil {
		writeServiceError(w, err, "failed to update settings")
		return
	}
	response.JSON(w, http.StatusOK, toSettingsResponse(settings))
}
