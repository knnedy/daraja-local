package service

import (
	"context"

	"github.com/knnedy/daraja-local/internal/c2b"
	"github.com/knnedy/daraja-local/internal/delivery"
	"github.com/knnedy/daraja-local/internal/repository"
	"github.com/knnedy/daraja-local/internal/requestlog"
)

type C2BService struct {
	db        *repository.DB
	log       *requestlog.Log
	deliverer *delivery.Deliverer
}

func NewC2BService(db *repository.DB, log *requestlog.Log, deliverer *delivery.Deliverer) *C2BService {
	return &C2BService{db: db, log: log, deliverer: deliverer}
}

func (s *C2BService) RegisterURL(ctx context.Context, project repository.Project, req c2b.RegisterURLRequest) (c2b.AcceptResponse, *c2b.ValidationError) {
	if err := c2b.ValidateRegisterURL(req, project); err != nil {
		s.log.Rejected(ctx, project.ID, requestlog.KindC2B, req, err)
		return c2b.AcceptResponse{}, err
	}

	current, dbErr := s.db.Queries().GetSettingsByProjectID(ctx, project.ID)
	if dbErr != nil {
		return c2b.AcceptResponse{}, internalError()
	}

	externalValidation := int64(0)
	if req.ValidationURL != "" {
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

	accept := c2b.NewAcceptResponse("success")
	s.log.Accepted(ctx, project.ID, requestlog.KindC2B, accept.ConversationID, req, accept)
	return accept, nil
}

func (s *C2BService) Simulate(ctx context.Context, project repository.Project, req c2b.SimulateRequest) (c2b.AcceptResponse, *c2b.ValidationError) {
	settings, dbErr := s.db.Queries().GetSettingsByProjectID(ctx, project.ID)
	if dbErr != nil {
		return c2b.AcceptResponse{}, internalError()
	}

	if err := c2b.ValidateSimulate(req, project, settings); err != nil {
		s.log.Rejected(ctx, project.ID, requestlog.KindC2B, req, err)
		return c2b.AcceptResponse{}, err
	}

	accept := c2b.NewAcceptResponse("Accept the service request successfully.")
	s.log.Accepted(ctx, project.ID, requestlog.KindC2B, accept.ConversationID, req, accept)

	payload := c2b.BuildPayload(req, project.ShortCode)

	// Respond first, then validate and confirm in the background.
	go s.runValidationAndConfirmation(context.Background(), project.ID, settings, payload, accept.ConversationID)

	return accept, nil
}

func (s *C2BService) runValidationAndConfirmation(ctx context.Context, projectID int64, settings repository.ProjectSetting, payload c2b.Payload, transactionID string) {
	accepted := true

	// A registered ValidationURL turns validation on. ResponseType is only
	// the fallback when that URL can't answer.
	if settings.ValidationUrl != "" {
		reply, err := s.deliverer.PostOnce(ctx, settings.ValidationUrl, payload)
		result := c2b.DecideValidation(reply, err, settings.C2bResponseType)
		s.log.Validation(ctx, projectID, transactionID, result.Accepted, result.Fallback, result)
		accepted = result.Accepted
	}

	if !accepted {
		return
	}

	result := s.deliverer.Deliver(ctx, settings.CallbackUrl, payload)
	s.log.Delivery(ctx, projectID, requestlog.KindC2B, transactionID, "confirmed", payload, result)
}

func internalError() *c2b.ValidationError {
	return &c2b.ValidationError{
		HTTPStatus:   500,
		ErrorCode:    "500.001.1001",
		ErrorMessage: "internal error resolving project settings",
	}
}
