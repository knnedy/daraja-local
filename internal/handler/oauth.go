package handler

import (
	"context"
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
		response.Error(w, http.StatusUnauthorized, "invalid consumer key or secret")
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
