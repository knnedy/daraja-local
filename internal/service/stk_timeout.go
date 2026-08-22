package service

import (
	"context"

	"github.com/knnedy/daraja-local/internal/stk"
)

// autoTimeout fires when a session's configured STK timeout elapses
// with nobody having resolved it via the Virtual Phone.
func (s *STKService) autoTimeout(checkoutRequestID string) {
	// Uses a fresh background context, not a request-scoped one, this
	// runs on a timer well after the original HTTP request that created
	// the session has already returned and its context been cancelled.
	ctx := context.Background()
	_ = s.Resolve(ctx, checkoutRequestID, stk.OutcomeTimeout)
}
