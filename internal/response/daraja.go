package response

import (
	"net/http"

	"github.com/knnedy/daraja-local/internal/daraja"
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

// GenerateRequestID mimics Daraja's requestId, such as "104b-4235-9328-5de584002ffd785653".
func GenerateRequestID() string {
	return daraja.NewRequestID()
}
