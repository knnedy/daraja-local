package handler

import (
	"context"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/knnedy/daraja-local/internal/initiator"
	"github.com/knnedy/daraja-local/internal/response"
)

type Initiators interface {
	Get(ctx context.Context, projectID int64) (initiator.Initiator, error)
}

type InitiatorHandler struct {
	projectService ProjectService
	initiators     Initiators
}

func NewInitiatorHandler(projectService ProjectService, initiators Initiators) *InitiatorHandler {
	return &InitiatorHandler{projectService: projectService, initiators: initiators}
}

type initiatorResponse struct {
	Name        string `json:"name"`
	Password    string `json:"password"`
	Certificate string `json:"certificate"`
}

// Get handles GET /api/projects/{slug}/initiator.
func (h *InitiatorHandler) Get(w http.ResponseWriter, r *http.Request) {
	found, ok := h.lookup(w, r)
	if !ok {
		return
	}
	response.JSON(w, http.StatusOK, initiatorResponse{Name: found.Name, Password: found.Password, Certificate: found.CertificatePEM})
}

// Certificate handles GET /api/projects/{slug}/initiator/certificate, a
// download standing in for Safaricom's SandboxCertificate.cer.
func (h *InitiatorHandler) Certificate(w http.ResponseWriter, r *http.Request) {
	found, ok := h.lookup(w, r)
	if !ok {
		return
	}
	w.Header().Set("Content-Type", "application/x-x509-ca-cert")
	w.Header().Set("Content-Disposition", `attachment; filename="daraja-local-`+chi.URLParam(r, "slug")+`.cer"`)
	_, _ = w.Write([]byte(found.CertificatePEM))
}

func (h *InitiatorHandler) lookup(w http.ResponseWriter, r *http.Request) (initiator.Initiator, bool) {
	project, err := h.projectService.Get(r.Context(), chi.URLParam(r, "slug"))
	if err != nil {
		writeServiceError(w, err, "failed to get project")
		return initiator.Initiator{}, false
	}
	found, err := h.initiators.Get(r.Context(), project.ID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to get initiator")
		return initiator.Initiator{}, false
	}
	return found, true
}
