package project

import (
	"context"
	"errors"
	"path/filepath"
	"testing"

	"github.com/knnedy/daraja-local/internal/repository"
	"github.com/knnedy/daraja-local/internal/response"
)

func newProjects(t *testing.T) *Projects {
	t.Helper()
	db, err := repository.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return NewProjects(db)
}

func TestCreateGeneratesCredentialsAndAUniqueSlug(t *testing.T) {
	ctx := context.Background()
	projects := newProjects(t)

	first, err := projects.Create(ctx, CreateInput{Name: "My Shop"})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	second, err := projects.Create(ctx, CreateInput{Name: "My Shop"})
	if err != nil {
		t.Fatalf("create again: %v", err)
	}

	if first.Slug != "my-shop" || second.Slug == first.Slug {
		t.Errorf("slugs = %q, %q", first.Slug, second.Slug)
	}
	if len(first.ShortCode) != 6 || len(first.ConsumerKey) != 40 || len(first.ConsumerSecret) != 40 || len(first.Passkey) != 64 {
		t.Errorf("credentials = %+v", first)
	}
	if first.ConsumerKey == second.ConsumerKey || first.Passkey == second.Passkey {
		t.Error("two projects share credentials")
	}
}

func TestRegenerateCredentialsKeepsTheShortcode(t *testing.T) {
	ctx := context.Background()
	projects := newProjects(t)
	before, _ := projects.Create(ctx, CreateInput{Name: "Shop"})

	after, err := projects.RegenerateCredentials(ctx, before.Slug)
	if err != nil {
		t.Fatalf("regenerate: %v", err)
	}
	if after.ShortCode != before.ShortCode {
		t.Errorf("shortcode changed: %s -> %s", before.ShortCode, after.ShortCode)
	}
	if after.ConsumerKey == before.ConsumerKey || after.ConsumerSecret == before.ConsumerSecret || after.Passkey == before.Passkey {
		t.Error("a credential was not rotated")
	}
}

func ptr(s string) *string { return &s }

func TestUpdateChangesOnlyTheFieldsGiven(t *testing.T) {
	ctx := context.Background()
	projects := newProjects(t)
	created, _ := projects.Create(ctx, CreateInput{Name: "Shop", CallbackBaseUrl: "http://localhost:8000"})

	renamed, err := projects.Update(ctx, created.Slug, UpdateInput{Name: ptr("Duka")})
	if err != nil {
		t.Fatalf("rename: %v", err)
	}
	if renamed.Name != "Duka" || renamed.CallbackBaseUrl != "http://localhost:8000" {
		t.Errorf("after rename = %q, %q", renamed.Name, renamed.CallbackBaseUrl)
	}

	moved, err := projects.Update(ctx, created.Slug, UpdateInput{CallbackBaseUrl: ptr("https://duka.ngrok.app")})
	if err != nil {
		t.Fatalf("move: %v", err)
	}
	if moved.Name != "Duka" || moved.CallbackBaseUrl != "https://duka.ngrok.app" {
		t.Errorf("after move = %q, %q", moved.Name, moved.CallbackBaseUrl)
	}
}

func TestAnUnknownSlugIsNotFound(t *testing.T) {
	ctx := context.Background()
	projects := newProjects(t)

	if _, err := projects.Get(ctx, "nope"); !errors.Is(err, response.ErrNotFound) {
		t.Errorf("Get: err = %v", err)
	}
	if _, err := projects.Update(ctx, "nope", UpdateInput{Name: ptr("X")}); !errors.Is(err, response.ErrNotFound) {
		t.Errorf("Update: err = %v", err)
	}
	if _, err := projects.RegenerateCredentials(ctx, "nope"); !errors.Is(err, response.ErrNotFound) {
		t.Errorf("RegenerateCredentials: err = %v", err)
	}
}
