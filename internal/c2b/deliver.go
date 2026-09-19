package c2b

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/knnedy/daraja-local/internal/daraja"
)

// DeliveryResult and AttemptResult are shared across all Daraja-
// mirroring endpoints — see daraja.DeliveryResult/daraja.AttemptResult.
type DeliveryResult = daraja.DeliveryResult
type AttemptResult = daraja.AttemptResult

// Deliver marshals payload and POSTs it to url via the shared
// retry-with-backoff delivery mechanic.
func Deliver(ctx context.Context, url string, payload Payload) DeliveryResult {
	body, err := json.Marshal(payload)
	if err != nil {
		return DeliveryResult{
			Delivered: false,
			Attempts:  []AttemptResult{{At: time.Now(), Err: fmt.Sprintf("marshal payload: %v", err)}},
		}
	}
	return daraja.DeliverJSON(ctx, url, body)
}
