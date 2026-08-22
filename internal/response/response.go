package response

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
)

// JSON writes payload as a JSON response with the given status code
func JSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if payload == nil {
		return
	}
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		slog.Error("response: encode json", "error", err)
	}
}

type errorBody struct {
	Error string `json:"error"`
}

// Error writes a {"error": message} body with a given status code
func Error(w http.ResponseWriter, status int, message string) {
	JSON(w, status, errorBody{Error: message})
}

// GenerateRequestID mimics the shape of real Daraja requestId values
// for fidelity in simulated error responses —
func GenerateRequestID() string {
	buf := make([]byte, 4)
	_, _ = rand.Read(buf)
	a := int(buf[0])<<8 | int(buf[1])
	b := int(buf[2])<<8 | int(buf[3])
	return fmt.Sprintf("%d-%d-1", a, b)
}
