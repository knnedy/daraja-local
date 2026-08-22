package service

import (
	"context"
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
		s.logInbound(ctx, project.ID, req, "rejected")
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
	s.logInbound(ctx, project.ID, req, "accepted")

	// Automatic resolution if nobody acts on it via the Virtual Phone so it
	// matches real Daraja's own DS-timeout behavior.
	time.AfterFunc(time.Duration(settings.StkTimeoutSeconds)*time.Second, func() {
		s.autoTimeout(session.CheckoutRequestID)
	})

	return session, nil
}

func (s *STKService) logInbound(ctx context.Context, projectID int64, req stk.Request, status string) {
	payload, err := json.Marshal(req)
	if err != nil {
		return
	}

	_, _ = s.db.Queries().CreateRequestLogEntry(ctx, repository.CreateRequestLogEntryParams{
		ProjectID: projectID,
		Kind:      "stk_push",
		Direction: "inbound",
		Status:    status,
		Attempts:  1,
		Payload:   string(payload),
	})
}

func parseAmount(raw string) (int64, error) {
	var amount int64
	_, err := fmt.Sscanf(raw, "%d", &amount)
	return amount, err
}
