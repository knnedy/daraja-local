package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/knnedy/daraja-local/internal/b2b"
	"github.com/knnedy/daraja-local/internal/daraja"
	"github.com/knnedy/daraja-local/internal/repository"
	"github.com/knnedy/daraja-local/internal/response"
)

type B2BPayments interface {
	Request(ctx context.Context, project repository.Project, req b2b.PaymentRequest) (b2b.AcceptResponse, *daraja.ValidationError)
}

type B2BHandler struct {
	projectService ProjectService
	payments       B2BPayments
	initiators     Initiators
}

func NewB2BHandler(projectService ProjectService, payments B2BPayments, initiators Initiators) *B2BHandler {
	return &B2BHandler{projectService: projectService, payments: payments, initiators: initiators}
}

// PaymentRequest handles POST /mpesa/b2b/v1/paymentrequest.
func (h *B2BHandler) PaymentRequest(w http.ResponseWriter, r *http.Request) {
	var req b2b.PaymentRequest
	project, ok := decodeDaraja(w, r, &req)
	if !ok {
		return
	}
	accept, vErr := h.payments.Request(r.Context(), project, req)
	if vErr != nil {
		response.DarajaJSON(w, vErr.HTTPStatus, vErr.ErrorCode, vErr.ErrorMessage)
		return
	}
	response.JSON(w, http.StatusOK, accept)
}

type dashboardB2BRequest struct {
	CommandID        string `json:"commandId"`
	Amount           int64  `json:"amount"`
	PartyB           string `json:"partyB"`
	AccountReference string `json:"accountReference"`
	ResultURL        string `json:"resultUrl"`
	QueueTimeOutURL  string `json:"queueTimeOutUrl"`
}

// SendPayment handles POST /api/projects/{slug}/b2b/payments: the payment a
// developer's app would request, signed with the project's initiator.
func (h *B2BHandler) SendPayment(w http.ResponseWriter, r *http.Request) {
	project, err := h.projectService.Get(r.Context(), chi.URLParam(r, "slug"))
	if err != nil {
		writeServiceError(w, err, "failed to get project")
		return
	}
	var body dashboardB2BRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	name, credential, err := signedCredential(r.Context(), h.initiators, project.ID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to build SecurityCredential")
		return
	}
	accept, vErr := h.payments.Request(r.Context(), project, b2b.PaymentRequest{
		Initiator: name, SecurityCredential: credential, CommandID: body.CommandID,
		SenderIdentifierType: "4", RecieverIdentifierType: "4", Amount: daraja.Flexible(strconv.FormatInt(body.Amount, 10)),
		PartyA: daraja.Flexible(project.ShortCode), PartyB: daraja.Flexible(body.PartyB), AccountReference: body.AccountReference,
		Remarks: "Payment from the dashboard", ResultURL: body.ResultURL, QueueTimeOutURL: body.QueueTimeOutURL,
	})
	if vErr != nil {
		response.Error(w, http.StatusUnprocessableEntity, vErr.ErrorMessage)
		return
	}
	response.JSON(w, http.StatusOK, dashboardAcceptResponse{ConversationID: accept.ConversationID})
}
