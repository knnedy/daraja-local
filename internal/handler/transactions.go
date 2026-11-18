package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/knnedy/daraja-local/internal/auth"
	"github.com/knnedy/daraja-local/internal/daraja"
	"github.com/knnedy/daraja-local/internal/ledger"
	"github.com/knnedy/daraja-local/internal/repository"
	"github.com/knnedy/daraja-local/internal/response"
)

type Ledger interface {
	QueryStatus(ctx context.Context, project repository.Project, req ledger.StatusRequest) (ledger.AcceptResponse, *daraja.ValidationError)
	Reverse(ctx context.Context, project repository.Project, req ledger.ReversalRequest) (ledger.AcceptResponse, *daraja.ValidationError)
	List(ctx context.Context, projectID, limit int64) ([]ledger.Transaction, error)
}

type TransactionsHandler struct {
	projectService ProjectService
	ledger         Ledger
	initiators     Initiators
}

func NewTransactionsHandler(projectService ProjectService, l Ledger, initiators Initiators) *TransactionsHandler {
	return &TransactionsHandler{projectService: projectService, ledger: l, initiators: initiators}
}

// QueryStatus handles POST /mpesa/transactionstatus/v1/query.
func (h *TransactionsHandler) QueryStatus(w http.ResponseWriter, r *http.Request) {
	var req ledger.StatusRequest
	project, ok := decodeDaraja(w, r, &req)
	if !ok {
		return
	}
	accept, vErr := h.ledger.QueryStatus(r.Context(), project, req)
	writeDarajaResult(w, accept, vErr)
}

// Reverse handles POST /mpesa/reversal/v1/request.
func (h *TransactionsHandler) Reverse(w http.ResponseWriter, r *http.Request) {
	var req ledger.ReversalRequest
	project, ok := decodeDaraja(w, r, &req)
	if !ok {
		return
	}
	accept, vErr := h.ledger.Reverse(r.Context(), project, req)
	writeDarajaResult(w, accept, vErr)
}

func decodeDaraja(w http.ResponseWriter, r *http.Request, into any) (repository.Project, bool) {
	project, ok := auth.ProjectFromContext(r.Context())
	if !ok {
		response.DarajaJSON(w, http.StatusNotFound, "404.001.03", "Invalid Access Token")
		return repository.Project{}, false
	}
	if err := json.NewDecoder(r.Body).Decode(into); err != nil {
		response.DarajaJSON(w, http.StatusBadRequest, "400.002.02", "Bad Request - ")
		return repository.Project{}, false
	}
	return project, true
}

func writeDarajaResult(w http.ResponseWriter, accept ledger.AcceptResponse, vErr *daraja.ValidationError) {
	if vErr != nil {
		response.DarajaJSON(w, vErr.HTTPStatus, vErr.ErrorCode, vErr.ErrorMessage)
		return
	}
	response.JSON(w, http.StatusOK, accept)
}

type transactionResponse struct {
	Receipt                  string `json:"receipt"`
	Kind                     string `json:"kind"`
	Amount                   int64  `json:"amount"`
	DebitParty               string `json:"debitParty"`
	CreditParty              string `json:"creditParty"`
	ReasonType               string `json:"reasonType"`
	OriginatorConversationID string `json:"originatorConversationId"`
	ReversedBy               string `json:"reversedBy"`
	FinalisedAt              string `json:"finalisedAt"`
}

// List handles GET /api/projects/{slug}/transactions.
func (h *TransactionsHandler) List(w http.ResponseWriter, r *http.Request) {
	project, err := h.projectService.Get(r.Context(), chi.URLParam(r, "slug"))
	if err != nil {
		writeServiceError(w, err, "failed to get project")
		return
	}
	limit, err := strconv.ParseInt(r.URL.Query().Get("limit"), 10, 64)
	if err != nil || limit <= 0 || limit > 200 {
		limit = 50
	}
	rows, err := h.ledger.List(r.Context(), project.ID, limit)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to list transactions")
		return
	}
	out := make([]transactionResponse, 0, len(rows))
	for _, t := range rows {
		out = append(out, transactionResponse{
			Receipt: t.Receipt, Kind: string(t.Kind), Amount: t.Amount, DebitParty: t.DebitParty, CreditParty: t.CreditParty,
			ReasonType: t.ReasonType, OriginatorConversationID: t.OriginatorConversationID, ReversedBy: t.ReversedBy,
			FinalisedAt: t.FinalisedAt.UTC().Format("2006-01-02T15:04:05.000Z"),
		})
	}
	response.JSON(w, http.StatusOK, out)
}

type dashboardInitiatorRequest struct {
	Amount          int64  `json:"amount"`
	ResultURL       string `json:"resultUrl"`
	QueueTimeOutURL string `json:"queueTimeOutUrl"`
}

type dashboardAcceptResponse struct {
	ConversationID string `json:"conversationId"`
}

// SendStatusQuery handles POST /api/projects/{slug}/transactions/{receipt}/status:
// the query a developer's app would make, signed with the project's initiator.
func (h *TransactionsHandler) SendStatusQuery(w http.ResponseWriter, r *http.Request) {
	project, body, name, credential, ok := h.dashboardRequest(w, r)
	if !ok {
		return
	}
	accept, vErr := h.ledger.QueryStatus(r.Context(), project, ledger.StatusRequest{
		Initiator: name, SecurityCredential: credential, CommandID: "TransactionStatusQuery",
		TransactionID: chi.URLParam(r, "receipt"), PartyA: daraja.Flexible(project.ShortCode), IdentifierType: "4",
		ResultURL: body.ResultURL, QueueTimeOutURL: body.QueueTimeOutURL, Remarks: "Status check from the dashboard",
	})
	writeDashboardAccept(w, accept, vErr)
}

// SendReversal handles POST /api/projects/{slug}/transactions/{receipt}/reverse.
func (h *TransactionsHandler) SendReversal(w http.ResponseWriter, r *http.Request) {
	project, body, name, credential, ok := h.dashboardRequest(w, r)
	if !ok {
		return
	}
	accept, vErr := h.ledger.Reverse(r.Context(), project, ledger.ReversalRequest{
		Initiator: name, SecurityCredential: credential, CommandID: "TransactionReversal",
		TransactionID: chi.URLParam(r, "receipt"), Amount: daraja.Flexible(strconv.FormatInt(body.Amount, 10)),
		ReceiverParty: daraja.Flexible(project.ShortCode), RecieverIdentifierType: "11",
		ResultURL: body.ResultURL, QueueTimeOutURL: body.QueueTimeOutURL, Remarks: "Reversal from the dashboard",
	})
	writeDashboardAccept(w, accept, vErr)
}

func (h *TransactionsHandler) dashboardRequest(w http.ResponseWriter, r *http.Request) (repository.Project, dashboardInitiatorRequest, string, string, bool) {
	var body dashboardInitiatorRequest
	project, err := h.projectService.Get(r.Context(), chi.URLParam(r, "slug"))
	if err != nil {
		writeServiceError(w, err, "failed to get project")
		return project, body, "", "", false
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return project, body, "", "", false
	}
	name, credential, err := signedCredential(r.Context(), h.initiators, project.ID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to build SecurityCredential")
		return project, body, "", "", false
	}
	return project, body, name, credential, true
}

func writeDashboardAccept(w http.ResponseWriter, accept ledger.AcceptResponse, vErr *daraja.ValidationError) {
	if vErr != nil {
		response.Error(w, http.StatusUnprocessableEntity, vErr.ErrorMessage)
		return
	}
	response.JSON(w, http.StatusOK, dashboardAcceptResponse{ConversationID: accept.ConversationID})
}
