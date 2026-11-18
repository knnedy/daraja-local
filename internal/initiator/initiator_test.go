package initiator

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"path/filepath"
	"testing"

	"github.com/knnedy/daraja-local/internal/repository"
)

func newStore(t *testing.T) (*Store, int64, int64) {
	t.Helper()
	ctx := context.Background()
	db, err := repository.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })

	var ids []int64
	for _, slug := range []string{"shop", "other"} {
		project, err := db.Queries().CreateProject(ctx, repository.CreateProjectParams{
			Slug: slug, Name: slug, ShortCode: "600000", ConsumerKey: slug + "k", ConsumerSecret: "s", Passkey: "p",
		})
		if err != nil {
			t.Fatalf("create project: %v", err)
		}
		ids = append(ids, project.ID)
	}
	return New(db), ids[0], ids[1]
}

// encrypt builds a SecurityCredential the way a developer's app does.
func encrypt(t *testing.T, certificatePEM, password string) string {
	t.Helper()
	block, _ := pem.Decode([]byte(certificatePEM))
	if block == nil || block.Type != "CERTIFICATE" {
		t.Fatalf("certificate is not PEM: %q", certificatePEM)
	}
	cert, err := x509.ParseCertificate(block.Bytes)
	if err != nil {
		t.Fatalf("parse certificate: %v", err)
	}
	ciphertext, err := rsa.EncryptPKCS1v15(rand.Reader, cert.PublicKey.(*rsa.PublicKey), []byte(password))
	if err != nil {
		t.Fatalf("encrypt: %v", err)
	}
	return base64.StdEncoding.EncodeToString(ciphertext)
}

func TestAnInitiatorIsCreatedOnceAndKept(t *testing.T) {
	store, shop, other := newStore(t)
	ctx := context.Background()

	first, err := store.Get(ctx, shop)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if first.Name != Name || len(first.Password) < 12 {
		t.Errorf("initiator = %+v", first)
	}
	again, _ := store.Get(ctx, shop)
	if again != first {
		t.Error("the initiator changed between reads")
	}
	if otherInitiator, _ := store.Get(ctx, other); otherInitiator.Password == first.Password || otherInitiator.CertificatePEM == first.CertificatePEM {
		t.Error("two projects share an initiator")
	}
}

func TestVerify(t *testing.T) {
	store, shop, other := newStore(t)
	ctx := context.Background()
	mine, _ := store.Get(ctx, shop)
	theirs, _ := store.Get(ctx, other)

	tests := []struct {
		name       string
		initiator  string
		credential string
		want       bool
	}{
		{"right password and name", Name, encrypt(t, mine.CertificatePEM, mine.Password), true},
		{"wrong password", Name, encrypt(t, mine.CertificatePEM, "nope"), false},
		{"wrong initiator name", "someone", encrypt(t, mine.CertificatePEM, mine.Password), false},
		{"another project's certificate", Name, encrypt(t, theirs.CertificatePEM, mine.Password), false},
		{"plain password, not encrypted", Name, mine.Password, false},
		{"not base64", Name, "%%%", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := store.Verify(ctx, shop, tt.initiator, tt.credential)
			if err != nil || got != tt.want {
				t.Errorf("Verify = %v, %v; want %v", got, err, tt.want)
			}
		})
	}
}

func TestSecurityCredentialVerifies(t *testing.T) {
	store, projectID, _ := newStore(t)
	found, err := store.Get(context.Background(), projectID)
	if err != nil {
		t.Fatal(err)
	}
	credential, err := SecurityCredential(found)
	if err != nil {
		t.Fatal(err)
	}
	if ok, err := store.Verify(context.Background(), projectID, found.Name, credential); err != nil || !ok {
		t.Errorf("own credential did not verify: %v %v", ok, err)
	}
}
