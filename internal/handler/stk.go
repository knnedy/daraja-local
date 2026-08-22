package handler

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/knnedy/daraja-local/internal/auth"
	"github.com/knnedy/daraja-local/internal/repository"
	"github.com/knnedy/daraja-local/internal/response"
	"github.com/knnedy/daraja-local/internal/stk"
)

type STKService interface {
	ProcessRequest(ctx context.Context, project repository.Project, req stk.Request) (stk.Session, *stk.ValidationError)
}

type STKHandler struct {
	service STKService
}

func NewSTKHandler(s STKService) *STKHandler {
	return &STKHandler{service: s}
}

// Real Daraja's immediate accept response — before an outcome exists.
type stkPushResponse struct {
	MerchantRequestID   string `json:"MerchantRequestID"`
	CheckoutRequestID   string `json:"CheckoutRequestID"`
	ResponseCode        string `json:"ResponseCode"`
	ResponseDescription string `json:"ResponseDescription"`
	CustomerMessage     string `json:"CustomerMessage"`
}

func (h *STKHandler) ProcessRequest(w http.ResponseWriter, r *http.Request) {
	project, ok := auth.ProjectFromContext(r.Context())
	if !ok {
		response.DarajaJSON(w, http.StatusNotFound, "404.001.03", "Invalid Access Token")
		return
	}

	var req stk.Request
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.DarajaJSON(w, http.StatusBadRequest, "400.002.02", "Bad Request - Invalid request body")
		return
	}

	session, validationErr := h.service.ProcessRequest(r.Context(), project, req)
	if validationErr != nil {
		response.DarajaJSON(w, validationErr.HTTPStatus, validationErr.ErrorCode, validationErr.ErrorMessage)
		return
	}

	response.JSON(w, http.StatusOK, stkPushResponse{
		MerchantRequestID:   session.MerchantRequestID,
		CheckoutRequestID:   session.CheckoutRequestID,
		ResponseCode:        "0",
		ResponseDescription: "Success. Request accepted for processing",
		CustomerMessage:     "Success. Request accepted for processing",
	})
}
