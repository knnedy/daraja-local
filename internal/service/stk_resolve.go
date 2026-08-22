package service

import (
	"context"
	"encoding/json"
	"strconv"
	"time"

	"github.com/knnedy/daraja-local/internal/repository"
	"github.com/knnedy/daraja-local/internal/response"
	"github.com/knnedy/daraja-local/internal/stk"
)

// Resolve marks a pending session resolved with the given outcome, then
// delivers the callback with retries and logs the outbound delivery.
func (s *STKService) Resolve(ctx context.Context, checkoutRequestID string, outcome stk.Outcome) error {
	resultCode, resultDesc, ok := outcome.Result()
	if !ok {
		return response.ErrValidation
	}

	session, ok := s.store.Resolve(checkoutRequestID, resultCode, resultDesc)
	if !ok {
		return response.ErrNotFound
	}

	s.deliverAndLog(ctx, session)
	return nil
}

// deliverAndLog builds the callback body, delivers it with retries, and
// writes a single outbound request_log row summarizing the whole
// delivery attempts count and final status but not one row per attempt.
func (s *STKService) deliverAndLog(ctx context.Context, session stk.Session) {
	var callback stk.CallbackBody
	if session.ResultCode == stk.ResultCodeSuccess {
		callback = stk.BuildCallback(session, stk.GenerateMpesaReceiptNumber(), time.Now().Unix())
	} else {
		callback = stk.BuildCallback(session, "", 0)
	}

	result := stk.DeliverCallback(ctx, session.CallbackURL, callback)

	status := "delivered"
	if !result.Delivered {
		status = "failed"
	}

	payload, err := json.Marshal(struct {
		Callback stk.CallbackBody    `json:"callback"`
		Attempts []stk.AttemptResult `json:"attempts"`
	}{Callback: callback, Attempts: result.Attempts})
	if err != nil {
		return
	}
	projectID, err := strconv.ParseInt(session.ProjectID, 10, 64)
	if err != nil {
		return
	}

	_, _ = s.db.Queries().CreateRequestLogEntry(ctx, repository.CreateRequestLogEntryParams{
		ProjectID: projectID,
		Kind:      "stk_push",
		Direction: "outbound",
		Status:    status,
		Attempts:  int64(len(result.Attempts)),
		Payload:   string(payload),
	})
}
