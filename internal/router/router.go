package router

import (
	"io/fs"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/knnedy/daraja-local/internal/handler"
)

func New(projectSvc handler.ProjectService, settingsSvc handler.SettingsService, staticFS fs.FS, isDev bool) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.Recoverer)

	if isDev {
		r.Use(cors.Handler(cors.Options{
			AllowedOrigins:   []string{"http://localhost:3000", "http://127.0.0.1:3000"},
			AllowedMethods:   []string{http.MethodGet, http.MethodPost, http.MethodPatch, http.MethodPut, http.MethodDelete, http.MethodOptions},
			AllowedHeaders:   []string{"Content-Type"},
			AllowCredentials: false,
			MaxAge:           300,
		}))
	}

	projectHandler := handler.NewProjectHandler(projectSvc)
	settingsHandler := handler.NewSettingsHandler(settingsSvc)

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

	r.Handle("/*", http.FileServerFS(staticFS))

	return r
}
