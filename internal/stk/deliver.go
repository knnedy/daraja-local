package stk

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type DeliveryResult struct {
	Delivered bool
	Attempts  []AttemptResult
}

type AttemptResult struct {
	At         time.Time
	StatusCode int
	Err        string
}

var httpClient = &http.Client{Timeout: 10 * time.Second}

// DeliverCallback POSTs body to callbackURL, retrying up to 3 times on
// any non-200 response or network error which matches real Daraja's
// confirmed behavior of retrying failed callback deliveries before
// giving up.
func DeliverCallback(ctx context.Context, callbackURL string, body CallbackBody) DeliveryResult {
	payload, err := json.Marshal(body)
	if err != nil {
		return DeliveryResult{
			Delivered: false,
			Attempts:  []AttemptResult{{At: time.Now(), Err: fmt.Sprintf("marshal callback body: %v", err)}},
		}
	}

	const maxAttempts = 3
	var attempts []AttemptResult

	for i := 0; i < maxAttempts; i++ {
		result := attemptDelivery(ctx, callbackURL, payload)
		attempts = append(attempts, result)

		if result.StatusCode == http.StatusOK {
			return DeliveryResult{Delivered: true, Attempts: attempts}
		}

		if i < maxAttempts-1 {
			time.Sleep(time.Duration(i+1) * time.Second)
		}
	}

	return DeliveryResult{Delivered: false, Attempts: attempts}
}

func attemptDelivery(ctx context.Context, callbackURL string, payload []byte) AttemptResult {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, callbackURL, bytes.NewReader(payload))
	if err != nil {
		return AttemptResult{At: time.Now(), Err: err.Error()}
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := httpClient.Do(req)
	if err != nil {
		return AttemptResult{At: time.Now(), Err: err.Error()}
	}
	defer resp.Body.Close()

	return AttemptResult{At: time.Now(), StatusCode: resp.StatusCode}
}
