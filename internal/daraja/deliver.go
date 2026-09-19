package daraja

import (
	"bytes"
	"context"
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

// DeliverJSON POSTs a pre-marshaled JSON payload to url, retrying up to
// 3 times on any non-200 response or network error, matching real
// Daraja's confirmed behavior of retrying failed callback deliveries
// before giving up.
func DeliverJSON(ctx context.Context, url string, payload []byte) DeliveryResult {
	const maxAttempts = 3
	var attempts []AttemptResult

	for i := 0; i < maxAttempts; i++ {
		result := attemptDelivery(ctx, url, payload)
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

func attemptDelivery(ctx context.Context, url string, payload []byte) AttemptResult {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
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
