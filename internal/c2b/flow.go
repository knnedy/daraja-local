package c2b

import (
	"context"
	"sync"

	"github.com/knnedy/daraja-local/internal/daraja"
	"github.com/knnedy/daraja-local/internal/delivery"
	"github.com/knnedy/daraja-local/internal/repository"
	"github.com/knnedy/daraja-local/internal/requestlog"
)

// Flow owns C2B end to end: registration, and each simulated payment
// from acceptance through validation to its delivered confirmation.
type Flow struct {
	db        *repository.DB
	log       *requestlog.Log
	deliverer *delivery.Deliverer
	inFlight  sync.WaitGroup
}

func NewFlow(db *repository.DB, log *requestlog.Log, deliverer *delivery.Deliverer) *Flow {
	return &Flow{db: db, log: log, deliverer: deliverer}
}

func (f *Flow) RegisterURL(ctx context.Context, project repository.Project, req RegisterURLRequest) (AcceptResponse, *daraja.ValidationError) {
	if err := ValidateRegisterURL(req, project); err != nil {
		f.log.Rejected(ctx, project.ID, requestlog.C2BRegister, req, err)
		return AcceptResponse{}, err
	}

	externalValidation := int64(0)
	if req.ValidationURL != "" {
		externalValidation = 1
	}

	// Registering again replaces the previous registration.
	if _, dbErr := f.db.Queries().UpdateRegistration(ctx, repository.UpdateRegistrationParams{
		CallbackUrl:               req.ConfirmationURL,
		ValidationUrl:             req.ValidationURL,
		C2bResponseType:           req.ResponseType,
		ExternalValidationDefault: externalValidation,
		ProjectID:                 project.ID,
	}); dbErr != nil {
		return AcceptResponse{}, internalError()
	}

	accept := NewAcceptResponse("success")
	f.log.Accepted(ctx, project.ID, requestlog.C2BRegister, accept.ConversationID, req, accept)
	return accept, nil
}

// Registration returns a project's current C2B registration, and false if
// registerurl has never been called.
func (f *Flow) Registration(ctx context.Context, projectID int64) (Registration, bool, error) {
	settings, err := f.db.Queries().GetSettingsByProjectID(ctx, projectID)
	if err != nil {
		return Registration{}, false, err
	}
	return Registration{
		ConfirmationURL: settings.CallbackUrl,
		ValidationURL:   settings.ValidationUrl,
		ResponseType:    settings.C2bResponseType,
	}, settings.CallbackUrl != "", nil
}

func (f *Flow) Simulate(ctx context.Context, project repository.Project, req SimulateRequest) (AcceptResponse, *daraja.ValidationError) {
	settings, dbErr := f.db.Queries().GetSettingsByProjectID(ctx, project.ID)
	if dbErr != nil {
		return AcceptResponse{}, internalError()
	}

	if err := ValidateSimulate(req, project, settings); err != nil {
		f.log.Rejected(ctx, project.ID, requestlog.C2BSimulate, req, err)
		return AcceptResponse{}, err
	}

	accept := NewAcceptResponse("Accept the service request successfully.")
	f.log.Accepted(ctx, project.ID, requestlog.C2BSimulate, accept.ConversationID, req, accept)

	payload := BuildPayload(req, project.ShortCode)

	// Respond first, then validate and confirm in the background.
	f.inFlight.Add(1)
	go func() {
		defer f.inFlight.Done()
		f.validateAndConfirm(context.Background(), project.ID, settings, payload, accept.ConversationID)
	}()

	return accept, nil
}

// Wait blocks until every simulated payment in flight has finished.
func (f *Flow) Wait() {
	f.inFlight.Wait()
}

func (f *Flow) validateAndConfirm(ctx context.Context, projectID int64, settings repository.ProjectSetting, payload Payload, transactionID string) {
	accepted := true

	// A registered ValidationURL turns validation on. ResponseType is only
	// the fallback when that URL can't answer.
	if settings.ValidationUrl != "" {
		reply, err := f.deliverer.PostOnce(ctx, settings.ValidationUrl, payload)
		result := DecideValidation(reply, err, settings.C2bResponseType)
		f.log.Validation(ctx, projectID, transactionID, result.Accepted, result.Fallback, result)
		accepted = result.Accepted
	}

	if !accepted {
		return
	}

	result := f.deliverer.Deliver(ctx, settings.CallbackUrl, payload)
	f.log.Delivery(ctx, projectID, requestlog.C2BSimulate, transactionID, "confirmed", payload, result)
}

func internalError() *daraja.ValidationError {
	return &daraja.ValidationError{
		HTTPStatus:   500,
		ErrorCode:    "500.001.1001",
		ErrorMessage: "internal error resolving project settings",
	}
}
