package service

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/knnedy/daraja-local/internal/repository"
	"github.com/knnedy/daraja-local/internal/stk"
)

// STKService owns the STK Push simulation lifecycle: accepting and
// validating incoming requests, tracking pending sessions and
// resolving them into delivered callbacks.
type STKService struct {
	db    *repository.DB
	store *stk.Store
}

func NewSTKService(db *repository.DB, store *stk.Store) *STKService {
	return &STKService{db: db, store: store}
}

// ProcessRequest validates an incoming STK Push request against the
// project's real credentials and if valid it creates a pending
// session and schedules its automatic timeout.
func (s *STKService) ProcessRequest(ctx context.Context, project repository.Project, req stk.Request) (stk.Session, *stk.ValidationError) {
	validationErr := stk.Validate(req, project)

	if validationErr != nil {
		s.logInbound(ctx, project.ID, "", req, "rejected")
		s.logSyncError(ctx, project.ID, validationErr)
		return stk.Session{}, validationErr
	}

	settings, err := s.db.Queries().GetSettingsByProjectID(ctx, project.ID)
	if err != nil {
		return stk.Session{}, &stk.ValidationError{
			HTTPStatus:   500,
			ErrorCode:    "500.001.1001",
			ErrorMessage: "internal error resolving project settings",
		}
	}

	amount, _ := parseAmount(req.Amount)

	session := stk.Session{
		MerchantRequestID: stk.GenerateMerchantRequestID(),
		CheckoutRequestID: stk.GenerateCheckoutRequestID(),
		ProjectID:         strconv.FormatInt(project.ID, 10),
		BusinessShortCode: req.BusinessShortCode,
		PartyA:            req.PartyA,
		PartyB:            req.PartyB,
		PhoneNumber:       req.PhoneNumber,
		Amount:            amount,
		AccountReference:  req.AccountReference,
		TransactionDesc:   req.TransactionDesc,
		CallbackURL:       req.CallbackURL,
		CreatedAt:         time.Now(),
		TimeoutAt:         time.Now().Add(time.Duration(settings.StkTimeoutSeconds) * time.Second),
	}

	s.store.Create(session)
	s.logInbound(ctx, project.ID, session.CheckoutRequestID, req, "accepted")
	s.logSyncAccept(ctx, project.ID, session)

	// Automatic resolution if nobody acts on it via the Virtual Phone so it
	// matches real Daraja's own DS-timeout behavior.
	time.AfterFunc(time.Duration(settings.StkTimeoutSeconds)*time.Second, func() {
		s.autoTimeout(session.CheckoutRequestID)
	})

	return session, nil
}

func (s *STKService) ListPending(projectID int64) []stk.Session {
	return s.store.ListPending(projectID)
}

func (s *STKService) logInbound(ctx context.Context, projectID int64, correlationID string, req stk.Request, status string) {
	payload, err := json.Marshal(req)
	if err != nil {
		return
	}

	var corrID sql.NullString
	if correlationID != "" {
		corrID = sql.NullString{String: correlationID, Valid: true}
	}

	_, _ = s.db.Queries().CreateRequestLogEntry(ctx, repository.CreateRequestLogEntryParams{
		ProjectID:     projectID,
		CorrelationID: corrID,
		Kind:          "stk_push",
		Direction:     "inbound",
		Status:        status,
		Attempts:      1,
		Payload:       string(payload),
	})
}

// syncAcceptPayload mirrors handler.stkPushResponse — the immediate 200
// accept sent on the wire — so the console shows exactly what the caller
// received. Kept in sync manually with the handler's literal for now.
type syncAcceptPayload struct {
	MerchantRequestID   string `json:"MerchantRequestID"`
	CheckoutRequestID   string `json:"CheckoutRequestID"`
	ResponseCode        string `json:"ResponseCode"`
	ResponseDescription string `json:"ResponseDescription"`
	CustomerMessage     string `json:"CustomerMessage"`
}

func (s *STKService) logSyncAccept(ctx context.Context, projectID int64, session stk.Session) {
	payload, err := json.Marshal(syncAcceptPayload{
		MerchantRequestID:   session.MerchantRequestID,
		CheckoutRequestID:   session.CheckoutRequestID,
		ResponseCode:        "0",
		ResponseDescription: "Success. Request accepted for processing",
		CustomerMessage:     "Success. Request accepted for processing",
	})
	if err != nil {
		return
	}

	_, _ = s.db.Queries().CreateRequestLogEntry(ctx, repository.CreateRequestLogEntryParams{
		ProjectID:     projectID,
		CorrelationID: sql.NullString{String: session.CheckoutRequestID, Valid: true},
		Kind:          "stk_push",
		Direction:     "outbound",
		Status:        "accepted",
		Attempts:      1,
		Payload:       string(payload),
	})
}

// syncErrorPayload logs the essential fields of a rejected request. This is
// not necessarily byte-identical to whatever envelope response.DarajaJSON
// wraps them in on the wire — that file wasn't available when writing this
// — but carries the same errorCode/errorMessage/httpStatus the caller
// actually received.
type syncErrorPayload struct {
	HTTPStatus   int    `json:"httpStatus"`
	ErrorCode    string `json:"errorCode"`
	ErrorMessage string `json:"errorMessage"`
}

func (s *STKService) logSyncError(ctx context.Context, projectID int64, validationErr *stk.ValidationError) {
	payload, err := json.Marshal(syncErrorPayload{
		HTTPStatus:   validationErr.HTTPStatus,
		ErrorCode:    validationErr.ErrorCode,
		ErrorMessage: validationErr.ErrorMessage,
	})
	if err != nil {
		return
	}

	_, _ = s.db.Queries().CreateRequestLogEntry(ctx, repository.CreateRequestLogEntryParams{
		ProjectID: projectID,
		Kind:      "stk_push",
		Direction: "outbound",
		Status:    "rejected",
		Attempts:  1,
		Payload:   string(payload),
	})
}

func parseAmount(raw string) (int64, error) {
	var amount int64
	_, err := fmt.Sscanf(raw, "%d", &amount)
	return amount, err
}
