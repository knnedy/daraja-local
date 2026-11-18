package main

import (
	"context"
	"errors"
	"fmt"
	"io/fs"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/knnedy/daraja-local/internal/b2c"
	"github.com/knnedy/daraja-local/internal/c2b"
	"github.com/knnedy/daraja-local/internal/config"
	"github.com/knnedy/daraja-local/internal/delivery"
	"github.com/knnedy/daraja-local/internal/initiator"
	"github.com/knnedy/daraja-local/internal/project"
	"github.com/knnedy/daraja-local/internal/repository"
	"github.com/knnedy/daraja-local/internal/requestlog"
	"github.com/knnedy/daraja-local/internal/router"
	"github.com/knnedy/daraja-local/internal/stk"
	"github.com/knnedy/daraja-local/internal/token"
)

const deliveryGrace = 10 * time.Second

// b2cProcessingDelay stands in for the seconds Safaricom takes to post a B2C result.
const b2cProcessingDelay = 2 * time.Second

func main() {
	if err := run(); err != nil {
		slog.Error("daraja-local: fatal", "error", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	db, err := repository.Open(cfg.DBPath)
	if err != nil {
		return fmt.Errorf("open database: %w", err)
	}
	defer db.Close()

	staticFS, err := fs.Sub(staticFiles, "out")
	if err != nil {
		return fmt.Errorf("prepare static assets: %w", err)
	}

	projectSvc := project.NewProjects(db)
	settingsSvc := project.NewSettings(db)
	tokenSvc := token.NewIssuer(db)
	deliverer := delivery.New(delivery.NewHTTPPoster(), delivery.LinearBackoff)
	requestLog := requestlog.New(db)
	stkSessions := stk.NewLifecycle(db, requestLog, deliverer, stk.SystemClock())
	c2bFlow := c2b.NewFlow(db, requestLog, deliverer)
	initiators := initiator.New(db)
	b2cPayouts := b2c.NewPayouts(db, requestLog, deliverer, initiators, b2cProcessingDelay)
	r := router.New(projectSvc, settingsSvc, tokenSvc, stkSessions, c2bFlow, requestLog, initiators, b2cPayouts, staticFS, cfg.IsDev)

	srv := &http.Server{
		Addr:         fmt.Sprintf("127.0.0.1:%d", cfg.Port),
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	serveErr := make(chan error, 1)
	go func() {
		printBanner(srv.Addr, cfg.DBPath)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serveErr <- err
			return
		}
		serveErr <- nil
	}()

	select {
	case err := <-serveErr:
		if err != nil {
			return fmt.Errorf("serve: %w", err)
		}
	case <-ctx.Done():
		slog.Info("daraja-local shutting down")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := srv.Shutdown(shutdownCtx); err != nil {
			return fmt.Errorf("shutdown: %w", err)
		}
		finishDeliveries(stkSessions.Wait, c2bFlow.Wait, b2cPayouts.Wait)
	}

	return nil
}

// finishDeliveries lets callbacks already being delivered finish, for up to
// deliveryGrace, so their request log entries are written before exit.
func finishDeliveries(waits ...func()) {
	done := make(chan struct{})
	go func() {
		for _, wait := range waits {
			wait()
		}
		close(done)
	}()

	select {
	case <-done:
	case <-time.After(deliveryGrace):
		slog.Warn("daraja-local: exiting with callback deliveries still in flight")
	}
}
