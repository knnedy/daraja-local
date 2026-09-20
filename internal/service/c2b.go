package service

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/knnedy/daraja-local/internal/c2b"
	"github.com/knnedy/daraja-local/internal/repository"
)

// C2BService owns the C2B simulation lifecycle: URL registration and
// simulated payments, including calling a project's own registered
// ValidationURL/ConfirmationURL.
type C2BService struct {
	db *repository.DB
}

func NewC2BService(db *repository.DB) *C2BService {
	return &C2BService{db: db}
}

func (s *C2BService) RegisterURL(ctx context.Context, project repository.Project, req c2b.RegisterURLRequest) (c2b.AcceptResponse, *c2b.ValidationError) {
	if err := c2b.ValidateRegisterURL(req, project); err != nil {
		s.logInbound(ctx, project.ID, "", req, "rejected")
		s.logSyncError(ctx, project.ID, err)
		return c2b.AcceptResponse{}, err
	}

	current, dbErr := s.db.Queries().GetSettingsByProjectID(ctx, project.ID)
	if dbErr != nil {
		return c2b.AcceptResponse{}, internalError()
	}

	externalValidation := int64(0)
	if req.ResponseType == "Cancelled" {
		externalValidation = 1
	}

	if _, dbErr := s.db.Queries().UpdateSettings(ctx, repository.UpdateSettingsParams{
		CallbackUrl:               req.ConfirmationURL,
		ValidationUrl:             req.ValidationURL,
		StkTimeoutSeconds:         current.StkTimeoutSeconds,
		C2bResponseType:           req.ResponseType,
		ExternalValidationDefault: externalValidation,
		DefaultPhoneNumber:        current.DefaultPhoneNumber,
		ProjectID:                 project.ID,
	}); dbErr != nil {
		return c2b.AcceptResponse{}, internalError()
	}

	accept := c2b.NewAcceptResponse("Success")
	s.logInbound(ctx, project.ID, accept.ConversationID, req, "accepted")
	s.logSyncAccept(ctx, project.ID, accept)
	return accept, nil
}

func (s *C2BService) Simulate(ctx context.Context, project repository.Project, req c2b.SimulateRequest) (c2b.AcceptResponse, *c2b.ValidationError) {
	settings, dbErr := s.db.Queries().GetSettingsByProjectID(ctx, project.ID)
	if dbErr != nil {
		return c2b.AcceptResponse{}, internalError()
	}

	if err := c2b.ValidateSimulate(req, project, settings); err != nil {
		s.logInbound(ctx, project.ID, "", req, "rejected")
		s.logSyncError(ctx, project.ID, err)
		return c2b.AcceptResponse{}, err
	}

	accept := c2b.NewAcceptResponse("Accept the service request successfully.")
	s.logInbound(ctx, project.ID, accept.ConversationID, req, "accepted")
	s.logSyncAccept(ctx, project.ID, accept)

	payload := c2b.BuildPayload(req, project.ShortCode)

	// Runs after the synchronous response above has already returned —
	// same "respond first, notify after" shape as STK's autoTimeout,
	// just dispatched immediately rather than on a timer since there's
	// no waiting-on-a-human step in C2B.
	go s.runValidationAndConfirmation(context.Background(), project.ID, settings, payload, accept.ConversationID)

	return accept, nil
}

func (s *C2BService) runValidationAndConfirmation(ctx context.Context, projectID int64, settings repository.ProjectSetting, payload c2b.Payload, correlationID string) {
	accepted := true

	if settings.C2bResponseType == "Cancelled" && settings.ValidationUrl != "" {
		result := c2b.CallValidation(ctx, settings.ValidationUrl, payload, settings.C2bResponseType)
		s.logValidation(ctx, projectID, correlationID, result)
		accepted = result.Accepted
	}

	if !accepted {
		return
	}

	s.deliverConfirmationAndLog(ctx, projectID, settings.CallbackUrl, payload, correlationID)
}

func internalError() *c2b.ValidationError {
	return &c2b.ValidationError{
		HTTPStatus:   500,
		ErrorCode:    "500.001.1001",
		ErrorMessage: "internal error resolving project settings",
	}
}

func (s *C2BService) logInbound(ctx context.Context, projectID int64, correlationID string, req any, status string) {
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
		Kind:          "c2b",
		Direction:     "inbound",
		Status:        status,
		Attempts:      1,
		Payload:       string(payload),
	})
}

func (s *C2BService) logSyncAccept(ctx context.Context, projectID int64, accept c2b.AcceptResponse) {
	payload, err := json.Marshal(accept)
	if err != nil {
		return
	}

	_, _ = s.db.Queries().CreateRequestLogEntry(ctx, repository.CreateRequestLogEntryParams{
		ProjectID:     projectID,
		CorrelationID: sql.NullString{String: accept.ConversationID, Valid: true},
		Kind:          "c2b",
		Direction:     "outbound",
		Status:        "accepted",
		Attempts:      1,
		Payload:       string(payload),
	})
}

func (s *C2BService) logSyncError(ctx context.Context, projectID int64, validationErr *c2b.ValidationError) {
	payload, err := json.Marshal(struct {
		HTTPStatus   int    `json:"httpStatus"`
		ErrorCode    string `json:"errorCode"`
		ErrorMessage string `json:"errorMessage"`
	}{validationErr.HTTPStatus, validationErr.ErrorCode, validationErr.ErrorMessage})
	if err != nil {
		return
	}

	_, _ = s.db.Queries().CreateRequestLogEntry(ctx, repository.CreateRequestLogEntryParams{
		ProjectID: projectID,
		Kind:      "c2b",
		Direction: "outbound",
		Status:    "rejected",
		Attempts:  1,
		Payload:   string(payload),
	})
}

func (s *C2BService) logValidation(ctx context.Context, projectID int64, correlationID string, result c2b.ValidationResult) {
	payload, err := json.Marshal(result)
	if err != nil {
		return
	}

	status := "delivered"
	if result.Fallback {
		status = "fallback"
	}
	outcome := "rejected"
	if result.Accepted {
		outcome = "accepted"
	}

	_, _ = s.db.Queries().CreateRequestLogEntry(ctx, repository.CreateRequestLogEntryParams{
		ProjectID:     projectID,
		CorrelationID: sql.NullString{String: correlationID, Valid: true},
		Kind:          "c2b",
		Direction:     "outbound",
		Status:        status,
		Outcome:       sql.NullString{String: outcome, Valid: true},
		Attempts:      1,
		Payload:       string(payload),
	})
}

func (s *C2BService) deliverConfirmationAndLog(ctx context.Context, projectID int64, confirmationURL string, payload c2b.Payload, correlationID string) {
	result := c2b.Deliver(ctx, confirmationURL, payload)

	status := "delivered"
	if !result.Delivered {
		status = "failed"
	}

	logPayload, err := json.Marshal(struct {
		Payload  c2b.Payload         `json:"payload"`
		Attempts []c2b.AttemptResult `json:"attempts"`
	}{payload, result.Attempts})
	if err != nil {
		return
	}

	_, _ = s.db.Queries().CreateRequestLogEntry(ctx, repository.CreateRequestLogEntryParams{
		ProjectID:     projectID,
		CorrelationID: sql.NullString{String: correlationID, Valid: true},
		Kind:          "c2b",
		Direction:     "outbound",
		Status:        status,
		Outcome:       sql.NullString{String: "confirmed", Valid: true},
		Attempts:      int64(len(result.Attempts)),
		Payload:       string(logPayload),
	})
}
