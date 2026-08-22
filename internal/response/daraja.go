package response

import (
	"crypto/rand"
	"fmt"
	"net/http"
)

// DarajaError is real Daraja's confirmed error envelope shape.
type DarajaError struct {
	RequestID    string `json:"requestId"`
	ErrorCode    string `json:"errorCode"`
	ErrorMessage string `json:"errorMessage"`
}

// DarajaJSON writes a DarajaError with a freshly generated requestId.
// status should match the errorCode's leading digits
func DarajaJSON(w http.ResponseWriter, status int, errorCode, errorMessage string) {
	JSON(w, status, DarajaError{
		RequestID:    GenerateRequestID(),
		ErrorCode:    errorCode,
		ErrorMessage: errorMessage,
	})
}

// GenerateRequestID mimics the shape of real Daraja requestId values
// like "21604-273291-1", two random digit groups and a trailing
// counter segment, not a UUID.
func GenerateRequestID() string {
	buf := make([]byte, 4)
	_, _ = rand.Read(buf)
	a := int(buf[0])<<8 | int(buf[1])
	b := int(buf[2])<<8 | int(buf[3])
	return fmt.Sprintf("%d-%d-1", a, b)
}
