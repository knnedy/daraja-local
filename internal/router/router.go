package router

import (
	"io/fs"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/knnedy/daraja-local/internal/handler"
)

func New(projectSvc handler.ProjectService, settingsSvc handler.SettingsService, staticFS fs.FS) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	projectHandler := handler.NewProjectHandler(projectSvc)
	settingsHandler := handler.NewSettingsHandler(settingsSvc)

	r.Route("/api/projects", func(r chi.Router) {
		r.Post("/", projectHandler.Create)
		r.Get("/", projectHandler.List)

		r.Route("/{slug}", func(r chi.Router) {
			r.Get("/", projectHandler.Get)
			r.Delete("/", projectHandler.Delete)
			r.Post("/touch", projectHandler.Touch)
			r.Post("/credentials/regenerate", projectHandler.RegenerateCredentials)

			r.Get("/settings", settingsHandler.Get)
			r.Put("/settings", settingsHandler.Update)
		})
	})

	r.Handle("/*", http.FileServerFS(staticFS))

	return r
}
