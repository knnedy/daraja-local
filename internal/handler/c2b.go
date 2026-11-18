package handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/knnedy/daraja-local/internal/auth"
	"github.com/knnedy/daraja-local/internal/c2b"
	"github.com/knnedy/daraja-local/internal/daraja"
	"github.com/knnedy/daraja-local/internal/repository"
	"github.com/knnedy/daraja-local/internal/response"
)

type C2BService interface {
	RegisterURL(ctx context.Context, project repository.Project, req c2b.RegisterURLRequest) (c2b.AcceptResponse, *daraja.ValidationError)
	Simulate(ctx context.Context, project repository.Project, req c2b.SimulateRequest) (c2b.AcceptResponse, *daraja.ValidationError)
	Registration(ctx context.Context, projectID int64) (c2b.Registration, bool, error)
	ReplayConfirmation(ctx context.Context, projectID int64, transactionID string) error
}

type C2BHandler struct {
	projectService ProjectService
	service        C2BService
}

func NewC2BHandler(projectService ProjectService, s C2BService) *C2BHandler {
	return &C2BHandler{projectService: projectService, service: s}
}

func (h *C2BHandler) RegisterURL(w http.ResponseWriter, r *http.Request) {
	project, ok := auth.ProjectFromContext(r.Context())
	if !ok {
		response.DarajaJSON(w, http.StatusNotFound, "404.001.03", "Invalid Access Token")
		return
	}

	var req c2b.RegisterURLRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.DarajaJSON(w, http.StatusBadRequest, "400.002.02", "Bad Request - Invalid request body")
		return
	}

	accept, validationErr := h.service.RegisterURL(r.Context(), project, req)
	if validationErr != nil {
		response.DarajaJSON(w, validationErr.HTTPStatus, validationErr.ErrorCode, validationErr.ErrorMessage)
		return
	}

	response.JSON(w, http.StatusOK, accept)
}

func (h *C2BHandler) Simulate(w http.ResponseWriter, r *http.Request) {
	project, ok := auth.ProjectFromContext(r.Context())
	if !ok {
		response.DarajaJSON(w, http.StatusNotFound, "404.001.03", "Invalid Access Token")
		return
	}

	var req c2b.SimulateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.DarajaJSON(w, http.StatusBadRequest, "400.002.02", "Bad Request - Invalid request body")
		return
	}

	accept, validationErr := h.service.Simulate(r.Context(), project, req)
	if validationErr != nil {
		response.DarajaJSON(w, validationErr.HTTPStatus, validationErr.ErrorCode, validationErr.ErrorMessage)
		return
	}

	response.JSON(w, http.StatusOK, accept)
}

type registrationResponse struct {
	Registered      bool   `json:"registered"`
	ConfirmationURL string `json:"confirmationUrl"`
	ValidationURL   string `json:"validationUrl"`
	ResponseType    string `json:"responseType"`
}

// Registration handles GET /api/projects/{slug}/c2b/registration.
func (h *C2BHandler) Registration(w http.ResponseWriter, r *http.Request) {
	project, err := h.projectService.Get(r.Context(), chi.URLParam(r, "slug"))
	if err != nil {
		writeServiceError(w, err, "failed to get project")
		return
	}

	registration, registered, err := h.service.Registration(r.Context(), project.ID)
	if err != nil {
		writeServiceError(w, err, "failed to get registration")
		return
	}
	response.JSON(w, http.StatusOK, registrationResponse{
		Registered:      registered,
		ConfirmationURL: registration.ConfirmationURL,
		ValidationURL:   registration.ValidationURL,
		ResponseType:    registration.ResponseType,
	})
}

type simulatePaymentRequest struct {
	CommandID     string `json:"commandId"`
	Amount        string `json:"amount"`
	Msisdn        string `json:"msisdn"`
	BillRefNumber string `json:"billRefNumber"`
}

type simulatePaymentResponse struct {
	ConversationID string `json:"conversationId"`
}

// SimulatePayment handles POST /api/projects/{slug}/c2b/simulate: the
// dashboard's way to make a Simulated Payment without a Daraja token.
func (h *C2BHandler) SimulatePayment(w http.ResponseWriter, r *http.Request) {
	project, err := h.projectService.Get(r.Context(), chi.URLParam(r, "slug"))
	if err != nil {
		writeServiceError(w, err, "failed to get project")
		return
	}

	var body simulatePaymentRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	accept, validationErr := h.service.Simulate(r.Context(), project, c2b.SimulateRequest{
		ShortCode:     project.ShortCode,
		CommandID:     body.CommandID,
		Amount:        body.Amount,
		Msisdn:        body.Msisdn,
		BillRefNumber: body.BillRefNumber,
	})
	if validationErr != nil {
		response.Error(w, http.StatusUnprocessableEntity, validationErr.ErrorMessage)
		return
	}
	response.JSON(w, http.StatusOK, simulatePaymentResponse{ConversationID: accept.ConversationID})
}

// ReplayConfirmation handles POST /api/projects/{slug}/c2b/{transactionId}/replay.
func (h *C2BHandler) ReplayConfirmation(w http.ResponseWriter, r *http.Request) {
	project, err := h.projectService.Get(r.Context(), chi.URLParam(r, "slug"))
	if err != nil {
		writeServiceError(w, err, "failed to get project")
		return
	}

	err = h.service.ReplayConfirmation(r.Context(), project.ID, chi.URLParam(r, "transactionId"))
	switch {
	case err == nil:
		w.WriteHeader(http.StatusNoContent)
	case errors.Is(err, response.ErrNotFound):
		response.Error(w, http.StatusNotFound, "This payment was never confirmed, so there is nothing to resend.")
	case errors.Is(err, response.ErrValidation):
		response.Error(w, http.StatusUnprocessableEntity, "No ConfirmationURL is registered. Call registerurl first.")
	default:
		response.Error(w, http.StatusInternalServerError, "failed to replay confirmation")
	}
}
