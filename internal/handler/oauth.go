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

// expires_in is a string ("3599"), matching real Daraja exactly.
type generateTokenResponse struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   string `json:"expires_in"`
}

func (h *OAuthHandler) Generate(w http.ResponseWriter, r *http.Request) {
	consumerKey, consumerSecret, ok := parseBasicAuth(r)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "missing or malformed Authorization header")
		return
	}

	t, err := h.service.Generate(r.Context(), consumerKey, consumerSecret)
	if err != nil {
		response.DarajaJSON(w, http.StatusBadRequest, "400.008.01", "Invalid Authentication passed")
		return
	}

	response.JSON(w, http.StatusOK, generateTokenResponse{
		AccessToken: t.Value,
		ExpiresIn:   strconv.Itoa(int(token.TTL.Seconds())),
	})
}

func parseBasicAuth(r *http.Request) (consumerKey, consumerSecret string, ok bool) {
	return r.BasicAuth()
}
