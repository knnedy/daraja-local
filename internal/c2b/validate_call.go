package c2b

import (
	"bytes"
	"encoding/json"
	"net/http"

	"github.com/knnedy/daraja-local/internal/delivery"
)

// ValidationResult is the decision on a simulated payment after asking
// the project's ValidationURL. Field names are read by the dashboard.
type ValidationResult struct {
	Accepted   bool
	ResultCode string
	ResultDesc string
	// Fallback is true when the ValidationURL couldn't answer and
	// ResponseType decided instead (Completed accepts, Cancelled rejects).
	Fallback   bool
	HTTPStatus int
	Err        string
}

type validationResponseBody struct {
	ResultCode string `json:"ResultCode"`
	ResultDesc string `json:"ResultDesc"`
}

// DecideValidation turns the ValidationURL's reply (or the error reaching it)
// into a decision, falling back to responseType when the reply is unusable.
func DecideValidation(reply delivery.Reply, postErr error, responseType string) ValidationResult {
	fallback := func(errMsg string, status int) ValidationResult {
		accepted := responseType == "Completed"
		desc := "Rejected — ValidationURL unreachable, ResponseType=Cancelled"
		if accepted {
			desc = "Accepted — ValidationURL unreachable, ResponseType=Completed"
		}
		// ResultCode stays empty: this outcome is Daraja Local's own.
		return ValidationResult{
			Accepted:   accepted,
			ResultDesc: desc,
			Fallback:   true,
			HTTPStatus: status,
			Err:        errMsg,
		}
	}

	if postErr != nil {
		return fallback(postErr.Error(), 0)
	}
	if reply.StatusCode != http.StatusOK {
		return fallback("", reply.StatusCode)
	}

	var parsed validationResponseBody
	if err := json.NewDecoder(bytes.NewReader(reply.Body)).Decode(&parsed); err != nil {
		return fallback("unparseable response body: "+err.Error(), reply.StatusCode)
	}

	return ValidationResult{
		Accepted:   parsed.ResultCode == "0",
		ResultCode: parsed.ResultCode,
		ResultDesc: parsed.ResultDesc,
		HTTPStatus: reply.StatusCode,
	}
}
