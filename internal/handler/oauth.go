package handler

import (
	"context"
	"crypto/rand"
	"fmt"
	"net/http"
	"strconv"

	"github.com/knnedy/daraja-local/internal/response"
	"github.com/knnedy/daraja-local/internal/token"
)

type TokenService interface {
	Generate(ctx context.Context, consumerKey, consumerSecret string) (token.Token, error)
}

type OAuthHandler struct {
	service TokenService
}

func NewOAuthHandler(s TokenService) *OAuthHandler {
	return &OAuthHandler{service: s}
}

// generateTokenResponse matches real Daraja's response shape exactly —
// notably, expires_in is a STRING ("3599"), not a number. This
// matches the real API, not a mistake here.
type generateTokenResponse struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   string `json:"expires_in"`
}

// oauthErrorResponse matches real Daraja's confirmed error envelope
// shape, verified against real captured API responses.
type oauthErrorResponse struct {
	RequestID    string `json:"requestId"`
	ErrorCode    string `json:"errorCode"`
	ErrorMessage string `json:"errorMessage"`
}

// Generate handles GET /oauth/v1/generate?grant_type=client_credentials.
// Real Daraja sends credentials as Authorization: Basic
// base64(consumer_key:consumer_secret) — no request body.
func (h *OAuthHandler) Generate(w http.ResponseWriter, r *http.Request) {
	consumerKey, consumerSecret, ok := parseBasicAuth(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "missing or malformed Authorization header")
		return
	}

	t, err := h.service.Generate(r.Context(), consumerKey, consumerSecret)
	if err != nil {
		// 400.008.01 "Invalid Authentication passed" — confirmed real
		// Daraja error for wrong consumer key/secret at this endpoint.
		response.JSON(w, http.StatusBadRequest, oauthErrorResponse{
			RequestID:    generateRequestID(),
			ErrorCode:    "400.008.01",
			ErrorMessage: "Invalid Authentication passed",
		})
		return
	}

	response.JSON(w, http.StatusOK, generateTokenResponse{
		AccessToken: t.Value,
		ExpiresIn:   strconv.Itoa(int(token.TTL.Seconds())),
	})
}

// parseBasicAuth extracts consumer key/secret from an Authorization
func parseBasicAuth(r *http.Request) (consumerKey, consumerSecret string, ok bool) {
	return r.BasicAuth()
}

// generateRequestID mimics the shape of real Daraja requestId values
// (e.g. "21604-273291-1") for fidelity — not a UUID, just two random
// digit groups and a trailing counter segment.
func generateRequestID() string {
	buf := make([]byte, 4)
	_, _ = rand.Read(buf)
	a := int(buf[0])<<8 | int(buf[1])
	b := int(buf[2])<<8 | int(buf[3])
	return fmt.Sprintf("%d-%d-1", a, b)
}
