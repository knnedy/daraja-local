package response

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

// JSON writs payload as a JSON response with the given status code
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

// Error writs a {"error": message} body with a given status code
func Error(w http.ResponseWriter, status int, message string) {
	JSON(w, status, errorBody{Error: message})
}
