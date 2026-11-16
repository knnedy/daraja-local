package project

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/knnedy/daraja-local/internal/repository"
)

const (
	confirmationURL = "http://127.0.0.1:4000/c2b/confirmation"
	validationURL   = "http://127.0.0.1:4000/c2b/validation"
)

func TestSettingsUpdateLeavesRegistrationAlone(t *testing.T) {
	ctx := context.Background()
	db, err := repository.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })

	project, err := NewProjects(db).Create(ctx, CreateInput{Name: "Shop"})
	if err != nil {
		t.Fatalf("create project: %v", err)
	}

	if _, err := db.Queries().UpdateRegistration(ctx, repository.UpdateRegistrationParams{
		CallbackUrl:     confirmationURL,
		ValidationUrl:   validationURL,
		C2bResponseType: "Cancelled",
		ProjectID:       project.ID,
	}); err != nil {
		t.Fatalf("register urls: %v", err)
	}

	updated, err := NewSettings(db).Update(ctx, project.Slug, UpdateSettingsInput{
		StkTimeoutSeconds:  30,
		DefaultPhoneNumber: "254712345678",
	})
	if err != nil {
		t.Fatalf("update settings: %v", err)
	}

	if updated.ValidationUrl != validationURL || updated.CallbackUrl != confirmationURL || updated.C2bResponseType != "Cancelled" {
		t.Errorf("registration changed: %+v", updated)
	}
	if updated.StkTimeoutSeconds != 30 || updated.DefaultPhoneNumber != "254712345678" {
		t.Errorf("defaults not saved: %+v", updated)
	}
}
