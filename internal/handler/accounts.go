package handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/knnedy/daraja-local/internal/daraja"
	"github.com/knnedy/daraja-local/internal/ledger"
	"github.com/knnedy/daraja-local/internal/repository"
	"github.com/knnedy/daraja-local/internal/response"
)

type Accounts interface {
	QueryBalance(ctx context.Context, project repository.Project, req ledger.BalanceRequest) (ledger.AcceptResponse, *daraja.ValidationError)
	Accounts(ctx context.Context, projectID int64) (ledger.Accounts, error)
	SetBalance(ctx context.Context, projectID int64, account ledger.Account, cents int64) (ledger.Accounts, error)
}

type AccountsHandler struct {
	projectService ProjectService
	accounts       Accounts
	initiators     Initiators
}

func NewAccountsHandler(projectService ProjectService, accounts Accounts, initiators Initiators) *AccountsHandler {
	return &AccountsHandler{projectService: projectService, accounts: accounts, initiators: initiators}
}

// QueryBalance handles POST /mpesa/accountbalance/v1/query.
func (h *AccountsHandler) QueryBalance(w http.ResponseWriter, r *http.Request) {
	var req ledger.BalanceRequest
	project, ok := decodeDaraja(w, r, &req)
	if !ok {
		return
	}
	accept, vErr := h.accounts.QueryBalance(r.Context(), project, req)
	writeDarajaResult(w, accept, vErr)
}

type accountsResponse struct {
	Utility     float64 `json:"utility"`
	Working     float64 `json:"working"`
	ChargesPaid float64 `json:"chargesPaid"`
}

type updateAccountsRequest struct {
	Utility *float64 `json:"utility"`
	Working *float64 `json:"working"`
}

// Get handles GET /api/projects/{slug}/accounts.
func (h *AccountsHandler) Get(w http.ResponseWriter, r *http.Request) {
	project, err := h.projectService.Get(r.Context(), chi.URLParam(r, "slug"))
	if err != nil {
		writeServiceError(w, err, "failed to get project")
		return
	}
	accounts, err := h.accounts.Accounts(r.Context(), project.ID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to get accounts")
		return
	}
	response.JSON(w, http.StatusOK, toAccountsResponse(accounts))
}

// Update handles PUT /api/projects/{slug}/accounts: top up or drain a balance.
func (h *AccountsHandler) Update(w http.ResponseWriter, r *http.Request) {
	project, err := h.projectService.Get(r.Context(), chi.URLParam(r, "slug"))
	if err != nil {
		writeServiceError(w, err, "failed to get project")
		return
	}
	var body updateAccountsRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	for account, amount := range map[ledger.Account]*float64{ledger.Utility: body.Utility, ledger.Working: body.Working} {
		if amount == nil {
			continue
		}
		if _, err := h.accounts.SetBalance(r.Context(), project.ID, account, int64(*amount*100+0.5)); err != nil {
			if errors.Is(err, response.ErrValidation) {
				response.Error(w, http.StatusUnprocessableEntity, "Balance must be zero or more.")
				return
			}
			response.Error(w, http.StatusInternalServerError, "failed to update accounts")
			return
		}
	}
	h.Get(w, r)
}

// SendQuery handles POST /api/projects/{slug}/accounts/query: the Account
// Balance query a developer's app would make, signed with the project's initiator.
func (h *AccountsHandler) SendQuery(w http.ResponseWriter, r *http.Request) {
	project, err := h.projectService.Get(r.Context(), chi.URLParam(r, "slug"))
	if err != nil {
		writeServiceError(w, err, "failed to get project")
		return
	}
	var body dashboardInitiatorRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	name, credential, err := signedCredential(r.Context(), h.initiators, project.ID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to build SecurityCredential")
		return
	}
	accept, vErr := h.accounts.QueryBalance(r.Context(), project, ledger.BalanceRequest{
		Initiator: name, SecurityCredential: credential, CommandID: "AccountBalance",
		PartyA: daraja.Flexible(project.ShortCode), IdentifierType: "4", Remarks: "Balance check from the dashboard",
		ResultURL: body.ResultURL, QueueTimeOutURL: body.QueueTimeOutURL,
	})
	writeDashboardAccept(w, accept, vErr)
}

func toAccountsResponse(a ledger.Accounts) accountsResponse {
	return accountsResponse{
		Utility: float64(a.UtilityCents) / 100, Working: float64(a.WorkingCents) / 100, ChargesPaid: float64(a.ChargesPaidCents) / 100,
	}
}
