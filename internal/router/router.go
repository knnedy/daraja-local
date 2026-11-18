package router

import (
	"io/fs"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/knnedy/daraja-local/internal/auth"
	"github.com/knnedy/daraja-local/internal/b2c"
	"github.com/knnedy/daraja-local/internal/c2b"
	"github.com/knnedy/daraja-local/internal/handler"
	"github.com/knnedy/daraja-local/internal/requestlog"
	"github.com/knnedy/daraja-local/internal/token"
)

func New(
	projectSvc handler.ProjectService,
	settingsSvc handler.SettingsService,
	tokenSvc *token.Issuer,
	stkSessions handler.STKSessions,
	c2bSvc handler.C2BService,
	requestLog handler.RequestLog,
	initiators handler.Initiators,
	b2cPayouts handler.B2CPayouts,
	transactions handler.Ledger,
	accounts handler.Accounts,
	b2bPayments handler.B2BPayments,
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
	stkHandler := handler.NewSTKHandler(projectSvc, stkSessions)
	c2bHandler := handler.NewC2BHandler(projectSvc, c2bSvc)
	initiatorHandler := handler.NewInitiatorHandler(projectSvc, initiators)
	b2cHandler := handler.NewB2CHandler(projectSvc, b2cPayouts, initiators)
	transactionsHandler := handler.NewTransactionsHandler(projectSvc, transactions, initiators)
	accountsHandler := handler.NewAccountsHandler(projectSvc, accounts, initiators)
	b2bHandler := handler.NewB2BHandler(projectSvc, b2bPayments, initiators)
	requestLogHandler := handler.NewRequestLogHandler(projectSvc, requestLog)

	r.Route("/api", func(r chi.Router) {
		r.Route("/projects", func(r chi.Router) {
			r.Post("/", projectHandler.Create)
			r.Get("/", projectHandler.List)

			r.Route("/{slug}", func(r chi.Router) {
				r.Get("/", projectHandler.Get)
				r.Patch("/", projectHandler.Update)
				r.Delete("/", projectHandler.Delete)
				r.Post("/touch", projectHandler.Touch)
				r.Post("/credentials/regenerate", projectHandler.RegenerateCredentials)
				r.Get("/initiator", initiatorHandler.Get)
				r.Get("/initiator/certificate", initiatorHandler.Certificate)

				r.Get("/settings", settingsHandler.Get)
				r.Put("/settings", settingsHandler.Update)

				r.Get("/request-log", requestLogHandler.List(""))
				r.Delete("/request-log", requestLogHandler.Clear)

				r.Route("/stk", func(r chi.Router) {
					r.Get("/pending", stkHandler.ListPending)
					r.Post("/{checkoutRequestId}/resolve", stkHandler.Resolve)
					r.Post("/{checkoutRequestId}/resend", stkHandler.ResendCallback)
					r.Get("/request-log", requestLogHandler.List(requestlog.KindSTKPush))
				})

				r.Route("/c2b", func(r chi.Router) {
					r.Get("/registration", c2bHandler.Registration)
					r.Post("/simulate", c2bHandler.SimulatePayment)
					r.Post("/{transactionId}/replay", c2bHandler.ReplayConfirmation)
					r.Get("/request-log", requestLogHandler.List(requestlog.KindC2B))
				})

				r.Route("/b2c", func(r chi.Router) {
					r.Get("/", b2cHandler.State)
					r.Put("/", b2cHandler.UpdateState)
					r.Post("/payouts", b2cHandler.SendPayout)
					r.Get("/request-log", requestLogHandler.List(requestlog.KindB2C))
				})

				r.Route("/accounts", func(r chi.Router) {
					r.Get("/", accountsHandler.Get)
					r.Put("/", accountsHandler.Update)
					r.Post("/query", accountsHandler.SendQuery)
					r.Get("/request-log", requestLogHandler.List(requestlog.KindAccountBalance))
				})
				r.Route("/b2b", func(r chi.Router) {
					r.Post("/payments", b2bHandler.SendPayment)
					r.Get("/request-log", requestLogHandler.List(requestlog.KindB2B))
				})
				r.Route("/transactions", func(r chi.Router) {
					r.Get("/", transactionsHandler.List)
					r.Post("/{receipt}/status", transactionsHandler.SendStatusQuery)
					r.Post("/{receipt}/reverse", transactionsHandler.SendReversal)
				})
				r.Get("/transaction-status/request-log", requestLogHandler.List(requestlog.KindTransactionStatus))
				r.Get("/reversal/request-log", requestLogHandler.List(requestlog.KindReversal))
			})
		})
	})

	r.Get("/oauth/v1/generate", oauthHandler.Generate)

	r.Group(func(r chi.Router) {
		r.Use(auth.RequireBearer(tokenSvc))
		r.Post("/mpesa/stkpush/v1/processrequest", stkHandler.ProcessRequest)
		r.Post("/mpesa/stkpushquery/v1/query", stkHandler.Query)
		r.Post("/mpesa/c2b/v1/registerurl", c2bHandler.RegisterURL(c2b.V1))
		r.Post("/mpesa/c2b/v1/simulate", c2bHandler.Simulate)
		r.Post("/mpesa/c2b/v2/registerurl", c2bHandler.RegisterURL(c2b.V2))
		r.Post("/mpesa/c2b/v2/simulate", c2bHandler.Simulate)
		r.Post("/mpesa/b2c/v1/paymentrequest", b2cHandler.PaymentRequest(b2c.V1))
		r.Post("/mpesa/b2c/v3/paymentrequest", b2cHandler.PaymentRequest(b2c.V3))
		r.Post("/mpesa/transactionstatus/v1/query", transactionsHandler.QueryStatus)
		r.Post("/mpesa/reversal/v1/request", transactionsHandler.Reverse)
		r.Post("/mpesa/accountbalance/v1/query", accountsHandler.QueryBalance)
		r.Post("/mpesa/b2b/v1/paymentrequest", b2bHandler.PaymentRequest)
	})

	r.Handle("/*", http.FileServerFS(staticFS))

	return r
}
