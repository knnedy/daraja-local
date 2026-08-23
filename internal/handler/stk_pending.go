package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/knnedy/daraja-local/internal/response"
	"github.com/knnedy/daraja-local/internal/stk"
)

type pendingSessionResponse struct {
	MerchantRequestID string `json:"merchantRequestId"`
	CheckoutRequestID string `json:"checkoutRequestId"`
	PhoneNumber       string `json:"phoneNumber"`
	Amount            int64  `json:"amount"`
	AccountReference  string `json:"accountReference"`
	TransactionDesc   string `json:"transactionDesc"`
	CreatedAt         string `json:"createdAt"`
	TimeoutAt         string `json:"timeoutAt"`
}

func toPendingSessionResponse(s stk.Session) pendingSessionResponse {
	return pendingSessionResponse{
		MerchantRequestID: s.MerchantRequestID,
		CheckoutRequestID: s.CheckoutRequestID,
		PhoneNumber:       s.PhoneNumber,
		Amount:            s.Amount,
		AccountReference:  s.AccountReference,
		TransactionDesc:   s.TransactionDesc,
		CreatedAt:         s.CreatedAt.Format(time.RFC3339),
		TimeoutAt:         s.TimeoutAt.Format(time.RFC3339),
	}
}

// ListPending handles GET /api/projects/{slug}/stk/pending.
func (h *STKHandler) ListPending(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")

	project, err := h.projectService.Get(r.Context(), slug)
	if err != nil {
		writeServiceError(w, err, "failed to get project")
		return
	}

	sessions := h.service.ListPending(project.ID)
	out := make([]pendingSessionResponse, len(sessions))
	for i, s := range sessions {
		out[i] = toPendingSessionResponse(s)
	}
	response.JSON(w, http.StatusOK, out)
}

type resolveSessionRequest struct {
	Outcome string `json:"outcome"`
}

// Resolve handles POST /api/projects/{slug}/stk/{checkoutRequestId}/resolve.
func (h *STKHandler) Resolve(w http.ResponseWriter, r *http.Request) {
	checkoutRequestID := chi.URLParam(r, "checkoutRequestId")

	var req resolveSessionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.service.Resolve(r.Context(), checkoutRequestID, stk.Outcome(req.Outcome)); err != nil {
		writeServiceError(w, err, "failed to resolve session")
		return
	}
	response.JSON(w, http.StatusNoContent, nil)
}
