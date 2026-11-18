package handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/knnedy/daraja-local/internal/auth"
	"github.com/knnedy/daraja-local/internal/b2c"
	"github.com/knnedy/daraja-local/internal/daraja"
	"github.com/knnedy/daraja-local/internal/repository"
	"github.com/knnedy/daraja-local/internal/response"
)

type B2CPayouts interface {
	Request(ctx context.Context, project repository.Project, version b2c.APIVersion, req b2c.PaymentRequest) (b2c.AcceptResponse, *daraja.ValidationError)
	Account(ctx context.Context, projectID int64) (b2c.Account, error)
	SetUtilityBalance(ctx context.Context, projectID, cents int64) (b2c.Account, error)
	NextOutcome(ctx context.Context, projectID int64) (b2c.Outcome, error)
	SetNextOutcome(ctx context.Context, projectID int64, outcome b2c.Outcome) error
}

type B2CHandler struct {
	projectService ProjectService
	payouts        B2CPayouts
	initiators     Initiators
}

func NewB2CHandler(projectService ProjectService, payouts B2CPayouts, initiators Initiators) *B2CHandler {
	return &B2CHandler{projectService: projectService, payouts: payouts, initiators: initiators}
}

// PaymentRequest handles POST /mpesa/b2c/{version}/paymentrequest.
func (h *B2CHandler) PaymentRequest(version b2c.APIVersion) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		project, ok := auth.ProjectFromContext(r.Context())
		if !ok {
			response.DarajaJSON(w, http.StatusNotFound, "404.001.03", "Invalid Access Token")
			return
		}

		var req b2c.PaymentRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			response.DarajaJSON(w, http.StatusBadRequest, "400.002.02", "Bad Request - Invalid request body")
			return
		}

		accept, validationErr := h.payouts.Request(r.Context(), project, version, req)
		if validationErr != nil {
			response.DarajaJSON(w, validationErr.HTTPStatus, validationErr.ErrorCode, validationErr.ErrorMessage)
			return
		}
		response.JSON(w, http.StatusOK, accept)
	}
}

type sendPayoutRequest struct {
	CommandID       string `json:"commandId"`
	Amount          string `json:"amount"`
	PartyB          string `json:"partyB"`
	Remarks         string `json:"remarks"`
	ResultURL       string `json:"resultUrl"`
	QueueTimeOutURL string `json:"queueTimeOutUrl"`
}

type sendPayoutResponse struct {
	ConversationID           string `json:"conversationId"`
	OriginatorConversationID string `json:"originatorConversationId"`
}

// SendPayout handles POST /api/projects/{slug}/b2c/payouts: a payout made as
// the developer's app would, with the project's own initiator credential.
func (h *B2CHandler) SendPayout(w http.ResponseWriter, r *http.Request) {
	project, err := h.projectService.Get(r.Context(), chi.URLParam(r, "slug"))
	if err != nil {
		writeServiceError(w, err, "failed to get project")
		return
	}

	var body sendPayoutRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	name, credential, err := signedCredential(r.Context(), h.initiators, project.ID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to build SecurityCredential")
		return
	}

	accept, validationErr := h.payouts.Request(r.Context(), project, b2c.V3, b2c.PaymentRequest{
		OriginatorConversationID: daraja.NewOriginatorConversationID(),
		InitiatorName:            name,
		SecurityCredential:       credential,
		CommandID:                body.CommandID,
		Amount:                   b2c.Flexible(body.Amount),
		PartyA:                   b2c.Flexible(project.ShortCode),
		PartyB:                   b2c.Flexible(body.PartyB),
		Remarks:                  body.Remarks,
		QueueTimeOutURL:          body.QueueTimeOutURL,
		ResultURL:                body.ResultURL,
	})
	if validationErr != nil {
		response.Error(w, http.StatusUnprocessableEntity, validationErr.ErrorMessage)
		return
	}
	response.JSON(w, http.StatusOK, sendPayoutResponse{
		ConversationID:           accept.ConversationID,
		OriginatorConversationID: accept.OriginatorConversationID,
	})
}

type b2cStateResponse struct {
	UtilityBalance     float64  `json:"utilityBalance"`
	WorkingBalance     float64  `json:"workingBalance"`
	ChargesPaidBalance float64  `json:"chargesPaidBalance"`
	NextOutcome        string   `json:"nextOutcome"`
	ForcibleOutcomes   []string `json:"forcibleOutcomes"`
}

type updateB2CStateRequest struct {
	UtilityBalance *float64 `json:"utilityBalance"`
	NextOutcome    *string  `json:"nextOutcome"`
}

// State handles GET /api/projects/{slug}/b2c: balances and the forced next outcome.
func (h *B2CHandler) State(w http.ResponseWriter, r *http.Request) {
	project, err := h.projectService.Get(r.Context(), chi.URLParam(r, "slug"))
	if err != nil {
		writeServiceError(w, err, "failed to get project")
		return
	}
	h.writeState(w, r, project.ID)
}

// UpdateState handles PUT /api/projects/{slug}/b2c. Omitted fields are left alone.
func (h *B2CHandler) UpdateState(w http.ResponseWriter, r *http.Request) {
	project, err := h.projectService.Get(r.Context(), chi.URLParam(r, "slug"))
	if err != nil {
		writeServiceError(w, err, "failed to get project")
		return
	}

	var body updateB2CStateRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if body.UtilityBalance != nil {
		if _, err := h.payouts.SetUtilityBalance(r.Context(), project.ID, int64(*body.UtilityBalance*100+0.5)); err != nil {
			writeB2CError(w, err, "Balance must be zero or more.")
			return
		}
	}
	if body.NextOutcome != nil {
		if err := h.payouts.SetNextOutcome(r.Context(), project.ID, b2c.Outcome(*body.NextOutcome)); err != nil {
			writeB2CError(w, err, "Unknown outcome.")
			return
		}
	}
	h.writeState(w, r, project.ID)
}

func (h *B2CHandler) writeState(w http.ResponseWriter, r *http.Request, projectID int64) {
	account, err := h.payouts.Account(r.Context(), projectID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to get account")
		return
	}
	next, err := h.payouts.NextOutcome(r.Context(), projectID)
	if err != nil {
		writeServiceError(w, err, "failed to get settings")
		return
	}

	forcible := make([]string, 0, len(b2c.ForcibleOutcomes))
	for _, o := range b2c.ForcibleOutcomes {
		forcible = append(forcible, string(o))
	}
	response.JSON(w, http.StatusOK, b2cStateResponse{
		UtilityBalance:     float64(account.UtilityCents) / 100,
		WorkingBalance:     float64(account.WorkingCents) / 100,
		ChargesPaidBalance: float64(account.ChargesPaidCents) / 100,
		NextOutcome:        string(next),
		ForcibleOutcomes:   forcible,
	})
}

func writeB2CError(w http.ResponseWriter, err error, validationMessage string) {
	if errors.Is(err, response.ErrValidation) {
		response.Error(w, http.StatusUnprocessableEntity, validationMessage)
		return
	}
	response.Error(w, http.StatusInternalServerError, "failed to update B2C state")
}
