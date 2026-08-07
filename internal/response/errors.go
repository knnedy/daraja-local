package response

import "errors"

// Sentinel errors the service layer returns and the handler layer maps to
// HTTP status codes via errors.Is, keeping that mapping in one place
// (handler) instead of scattered http.Error calls in service methods.

var (
	ErrNotFound   = errors.New("not found")
	ErrValidation = errors.New("validation error")
)
