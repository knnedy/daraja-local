package router

import (
	"io/fs"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/knnedy/daraja-local/internal/handler"
)

func New(projectSvc handler.ProjectService, settingsSvc handler.SettingsService, tokenSvc handler.TokenService, staticFS fs.FS) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.Recoverer)

	projectHandler := handler.NewProjectHandler(projectSvc)
	settingsHandler := handler.NewSettingsHandler(settingsSvc)
	oauthHandler := handler.NewOAuthHandler(tokenSvc)

	r.Route("/api", func(r chi.Router) {
		r.Use(middleware.Logger)

		r.Route("/projects", func(r chi.Router) {
			r.Post("/", projectHandler.Create)
			r.Get("/", projectHandler.List)

			r.Route("/{slug}", func(r chi.Router) {
				r.Get("/", projectHandler.Get)
				r.Patch("/", projectHandler.Update)
				r.Delete("/", projectHandler.Delete)
				r.Post("/touch", projectHandler.Touch)
				r.Post("/credentials/regenerate", projectHandler.RegenerateCredentials)

				r.Get("/settings", settingsHandler.Get)
				r.Put("/settings", settingsHandler.Update)
			})
		})
	})

	// Real Daraja-compatible routes — no project identifier in the path
	// at all, matching the actual API surface. The token itself resolves
	// to a project, not a URL segment.
	r.Get("/oauth/v1/generate", oauthHandler.Generate)

	r.Handle("/*", http.FileServerFS(staticFS))

	return r
}
