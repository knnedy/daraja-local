package router

import (
	"io/fs"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/knnedy/daraja-local/internal/auth"
	"github.com/knnedy/daraja-local/internal/handler"
	"github.com/knnedy/daraja-local/internal/service"
)

func New(
	projectSvc handler.ProjectService,
	settingsSvc handler.SettingsService,
	tokenSvc *service.TokenService,
	stkSvc handler.STKService,
	c2bSvc handler.C2BService,
	staticFS fs.FS,
	isDev bool,
) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.Recoverer)

	if isDev {
		r.Use(cors.Handler(cors.Options{
			AllowedOrigins:   []string{"http://localhost:3000"},
			AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
			AllowedHeaders:   []string{"Content-Type", "Authorization"},
			AllowCredentials: false,
			MaxAge:           300,
		}))
	}

	projectHandler := handler.NewProjectHandler(projectSvc)
	settingsHandler := handler.NewSettingsHandler(settingsSvc)
	oauthHandler := handler.NewOAuthHandler(tokenSvc)
	stkHandler := handler.NewSTKHandler(projectSvc, stkSvc)
	c2bHandler := handler.NewC2BHandler(c2bSvc)

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

				r.Route("/stk", func(r chi.Router) {
					r.Get("/pending", stkHandler.ListPending)
					r.Post("/{checkoutRequestId}/resolve", stkHandler.Resolve)
					r.Get("/request-log", stkHandler.ListRequestLog)
				})
			})
		})
	})

	r.Get("/oauth/v1/generate", oauthHandler.Generate)

	r.Group(func(r chi.Router) {
		r.Use(auth.RequireBearer(tokenSvc))
		r.Post("/mpesa/stkpush/v1/processrequest", stkHandler.ProcessRequest)
		r.Post("/mpesa/c2b/v2/registerurl", c2bHandler.RegisterURL)
		r.Post("/mpesa/c2b/v2/simulate", c2bHandler.Simulate)
	})

	r.Handle("/*", http.FileServerFS(staticFS))

	return r
}
