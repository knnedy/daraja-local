package handler

import (
	"encoding/json"
	"net/http"

	"github.com/knnedy/daraja-local/internal/auth"
	"github.com/knnedy/daraja-local/internal/response"
	"github.com/knnedy/daraja-local/internal/stk"
)

type STKHandler struct {
	projectService ProjectService
	sessions       STKSessions
}

func NewSTKHandler(projectService ProjectService, sessions STKSessions) *STKHandler {
	return &STKHandler{projectService: projectService, sessions: sessions}
}

func (h *STKHandler) ProcessRequest(w http.ResponseWriter, r *http.Request) {
	project, ok := auth.ProjectFromContext(r.Context())
	if !ok {
		response.DarajaJSON(w, http.StatusNotFound, "404.001.03", "Invalid Access Token")
		return
	}

	var req stk.Request
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.DarajaJSON(w, http.StatusBadRequest, "400.002.02", "Bad Request - ")
		return
	}

	session, validationErr := h.sessions.Accept(r.Context(), project, req)
	if validationErr != nil {
		response.DarajaJSON(w, validationErr.HTTPStatus, validationErr.ErrorCode, validationErr.ErrorMessage)
		return
	}

	response.JSON(w, http.StatusOK, session.AcceptResponse())
}

// Query handles POST /mpesa/stkpushquery/v1/query.
func (h *STKHandler) Query(w http.ResponseWriter, r *http.Request) {
	project, ok := auth.ProjectFromContext(r.Context())
	if !ok {
		response.DarajaJSON(w, http.StatusNotFound, "404.001.03", "Invalid Access Token")
		return
	}

	var req stk.QueryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.DarajaJSON(w, http.StatusBadRequest, "400.002.02", "Bad Request - ")
		return
	}

	result, validationErr := h.sessions.Query(r.Context(), project, req)
	if validationErr != nil {
		response.DarajaJSON(w, validationErr.HTTPStatus, validationErr.ErrorCode, validationErr.ErrorMessage)
		return
	}
	response.JSON(w, http.StatusOK, result)
}
