package stk

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/knnedy/daraja-local/internal/daraja"
)

// DeliveryResult and AttemptResult are shared across all Daraja-
// mirroring endpoints. Aliased here so every existing stk.DeliveryResult/stk.AttemptResult
// reference in this codebase keeps compiling unchanged.
type DeliveryResult = daraja.DeliveryResult
type AttemptResult = daraja.AttemptResult

// DeliverCallback marshals body and POSTs it to callbackURL via the
// shared retry-with-backoff delivery mechanic.
func DeliverCallback(ctx context.Context, callbackURL string, body CallbackBody) DeliveryResult {
	payload, err := json.Marshal(body)
	if err != nil {
		return DeliveryResult{
			Delivered: false,
			Attempts:  []AttemptResult{{At: time.Now(), Err: fmt.Sprintf("marshal callback body: %v", err)}},
		}
	}
	return daraja.DeliverJSON(ctx, callbackURL, payload)
}
