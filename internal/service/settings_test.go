package service

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/knnedy/daraja-local/internal/repository"
)

func TestSettingsUpdateKeepsRegisteredValidationURL(t *testing.T) {
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

	const validationURL = "http://127.0.0.1:4000/c2b/validation"
	if _, err := db.Queries().UpdateSettings(ctx, repository.UpdateSettingsParams{
		CallbackUrl:        "http://127.0.0.1:4000/c2b/confirmation",
		ValidationUrl:      validationURL,
		StkTimeoutSeconds:  20,
		C2bResponseType:    "Completed",
		DefaultPhoneNumber: "254708374149",
		ProjectID:          project.ID,
	}); err != nil {
		t.Fatalf("register urls: %v", err)
	}

	updated, err := NewSettingsService(db).Update(ctx, project.Slug, UpdateSettingsInput{
		CallbackUrl:        "http://127.0.0.1:4000/c2b/confirmation",
		StkTimeoutSeconds:  30,
		C2bResponseType:    "Completed",
		DefaultPhoneNumber: "254708374149",
	})
	if err != nil {
		t.Fatalf("update settings: %v", err)
	}

	if updated.ValidationUrl != validationURL {
		t.Errorf("ValidationUrl = %q, want %q", updated.ValidationUrl, validationURL)
	}
	if updated.StkTimeoutSeconds != 30 {
		t.Errorf("StkTimeoutSeconds = %d, want 30", updated.StkTimeoutSeconds)
	}
}
