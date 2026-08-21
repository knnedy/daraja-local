// Package auth provides Bearer-token middleware for routes that emulate
// real Daraja's authenticated endpoints (STK Push, C2B).
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

// RequireBearer validates Authorization: Bearer <token> and injects the
// resolved project into request context on success.
func RequireBearer(tokenService TokenService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			value, ok := parseBearer(r)
			if !ok {
				response.Error(w, http.StatusUnauthorized, "missing or malformed Authorization header")
				return
			}

			project, err := tokenService.Validate(r.Context(), value)
			if err != nil {
				response.Error(w, http.StatusUnauthorized, "invalid or expired access token")
				return
			}

			ctx := context.WithValue(r.Context(), projectContextKey, project)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
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
