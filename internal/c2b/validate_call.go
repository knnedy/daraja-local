package c2b

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"time"
)

var validationHTTPClient = &http.Client{Timeout: 10 * time.Second}

// ValidationResult captures the outcome of calling a project's
// registered ValidationURL for a simulated payment.
type ValidationResult struct {
	Accepted   bool
	ResultCode string
	ResultDesc string
	// Fallback is true when the outcome was NOT determined by the dev's
	// own response — the call failed, timed out, or returned something
	// unparseable, and responseType's documented fallback rule was used
	// instead (Completed -> accept, Cancelled -> reject).
	Fallback   bool
	HTTPStatus int
	Err        string
}

type validationResponseBody struct {
	ResultCode string `json:"ResultCode"`
	ResultDesc string `json:"ResultDesc"`
}

// CallValidation POSTs payload to validationURL onc— no retry,
func CallValidation(ctx context.Context, validationURL string, payload Payload, responseType string) ValidationResult {
	fallback := func(errMsg string, status int) ValidationResult {
		accepted := responseType == "Completed"
		desc := "Rejected — ValidationURL unreachable, ResponseType=Cancelled"
		if accepted {
			desc = "Accepted — ValidationURL unreachable, ResponseType=Completed"
		}
		// ResultCode intentionally left empty here: this outcome is
		// synthesized by Daraja Local's own fallback logic
		return ValidationResult{
			Accepted:   accepted,
			ResultCode: "",
			ResultDesc: desc,
			Fallback:   true,
			HTTPStatus: status,
			Err:        errMsg,
		}
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fallback(err.Error(), 0)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, validationURL, bytes.NewReader(body))
	if err != nil {
		return fallback(err.Error(), 0)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := validationHTTPClient.Do(req)
	if err != nil {
		return fallback(err.Error(), 0)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fallback("", resp.StatusCode)
	}

	var parsed validationResponseBody
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return fallback("unparseable response body: "+err.Error(), resp.StatusCode)
	}

	return ValidationResult{
		Accepted:   parsed.ResultCode == "0",
		ResultCode: parsed.ResultCode,
		ResultDesc: parsed.ResultDesc,
		HTTPStatus: resp.StatusCode,
	}
}
