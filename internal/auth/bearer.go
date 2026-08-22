package auth

import (
	"context"
	"net/http"
	"strings"

	"github.com/knnedy/daraja-local/internal/repository"
	"github.com/knnedy/daraja-local/internal/response"
)

type TokenService interface {
	Validate(ctx context.Context, value string) (repository.Project, error)
}

type contextKey string

const projectContextKey contextKey = "auth.project"

func RequireBearer(tokenService TokenService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			value, ok := parseBearer(r)
			if !ok {
				writeInvalidToken(w)
				return
			}

			project, err := tokenService.Validate(r.Context(), value)
			if err != nil {
				writeInvalidToken(w)
				return
			}

			ctx := context.WithValue(r.Context(), projectContextKey, project)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func writeInvalidToken(w http.ResponseWriter) {
	response.DarajaJSON(w, http.StatusNotFound, "404.001.03", "Invalid Access Token")
}

func ProjectFromContext(ctx context.Context) (repository.Project, bool) {
	project, ok := ctx.Value(projectContextKey).(repository.Project)
	return project, ok
}

func parseBearer(r *http.Request) (string, bool) {
	header := r.Header.Get("Authorization")
	const prefix = "Bearer "
	if !strings.HasPrefix(header, prefix) {
		return "", false
	}
	return strings.TrimPrefix(header, prefix), true
}
