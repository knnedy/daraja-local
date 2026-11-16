package service

import (
	"context"
	"errors"
	"path/filepath"
	"testing"
	"time"

	"github.com/knnedy/daraja-local/internal/c2b"
	"github.com/knnedy/daraja-local/internal/delivery"
	"github.com/knnedy/daraja-local/internal/repository"
)

const (
	confirmationURL = "http://127.0.0.1:4000/c2b/confirmation"
	validationURL   = "http://127.0.0.1:4000/c2b/validation"
)

// developerServer stands in for the developer's app at the Delivery seam.
type developerServer struct {
	validationReply delivery.Reply
	validationErr   error
	posts           chan string
}

func (d *developerServer) Post(_ context.Context, url string, _ []byte) (delivery.Reply, error) {
	d.posts <- url
	if url == validationURL {
		return d.validationReply, d.validationErr
	}
	return delivery.Reply{StatusCode: 200}, nil
}

func (d *developerServer) next(t *testing.T) string {
	t.Helper()
	select {
	case url := <-d.posts:
		return url
	case <-time.After(2 * time.Second):
		t.Fatal("no POST reached the developer's server")
		return ""
	}
}

func simulateWithValidation(t *testing.T, server *developerServer, responseType string) {
	t.Helper()
	ctx := context.Background()
	db, err := repository.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })

	project, err := NewProjectService(db).Create(ctx, CreateProjectInput{Name: "Shop"})
	if err != nil {
		t.Fatalf("create project: %v", err)
	}

	svc := NewC2BService(db, delivery.New(server, delivery.NoBackoff))
	if _, vErr := svc.RegisterURL(ctx, project, c2b.RegisterURLRequest{
		ShortCode:       project.ShortCode,
		ResponseType:    responseType,
		ConfirmationURL: confirmationURL,
		ValidationURL:   validationURL,
	}); vErr != nil {
		t.Fatalf("register: %v", vErr)
	}
	if _, vErr := svc.Simulate(ctx, project, c2b.SimulateRequest{
		ShortCode:     project.ShortCode,
		CommandID:     "CustomerPayBillOnline",
		Amount:        "500",
		Msisdn:        "254708374149",
		BillRefNumber: "INV1001",
	}); vErr != nil {
		t.Fatalf("simulate: %v", vErr)
	}
}

func TestSimulatedPaymentIsConfirmedAfterValidationAccepts(t *testing.T) {
	server := &developerServer{
		validationReply: delivery.Reply{StatusCode: 200, Body: []byte(`{"ResultCode":"0","ResultDesc":"Accepted"}`)},
		posts:           make(chan string, 4),
	}
	simulateWithValidation(t, server, "Cancelled")

	if got := server.next(t); got != validationURL {
		t.Fatalf("first POST = %s, want the ValidationURL", got)
	}
	if got := server.next(t); got != confirmationURL {
		t.Fatalf("second POST = %s, want the ConfirmationURL", got)
	}
}

func TestSimulatedPaymentIsConfirmedWhenValidationURLIsDownAndResponseTypeCompleted(t *testing.T) {
	server := &developerServer{validationErr: errors.New("connection refused"), posts: make(chan string, 4)}
	simulateWithValidation(t, server, "Completed")

	if got := server.next(t); got != validationURL {
		t.Fatalf("first POST = %s, want the ValidationURL", got)
	}
	if got := server.next(t); got != confirmationURL {
		t.Fatalf("second POST = %s, want the ConfirmationURL", got)
	}
}
