package handler

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/knnedy/daraja-local/internal/auth"
	"github.com/knnedy/daraja-local/internal/c2b"
	"github.com/knnedy/daraja-local/internal/repository"
	"github.com/knnedy/daraja-local/internal/response"
)

type C2BService interface {
	RegisterURL(ctx context.Context, project repository.Project, req c2b.RegisterURLRequest) (c2b.AcceptResponse, *c2b.ValidationError)
	Simulate(ctx context.Context, project repository.Project, req c2b.SimulateRequest) (c2b.AcceptResponse, *c2b.ValidationError)
}

type C2BHandler struct {
	service C2BService
}

func NewC2BHandler(s C2BService) *C2BHandler {
	return &C2BHandler{service: s}
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
