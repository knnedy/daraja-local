// Package initiator owns each Project's Initiator: the name, password and
// certificate an app uses to build a SecurityCredential, and checking one.
package initiator

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"crypto/x509/pkix"
	"database/sql"
	"encoding/base64"
	"encoding/pem"
	"errors"
	"math/big"
	"time"

	"github.com/knnedy/daraja-local/internal/repository"
)

// Name matches the initiator Safaricom's sandbox gives every app.
const Name = "testapi"

// Initiator is what a developer needs to build a SecurityCredential.
type Initiator struct {
	Name           string
	Password       string
	CertificatePEM string
}

type Store struct {
	db *repository.DB
}

func New(db *repository.DB) *Store {
	return &Store{db: db}
}

// Get returns a project's Initiator, creating it on first use.
func (s *Store) Get(ctx context.Context, projectID int64) (Initiator, error) {
	row, err := s.ensure(ctx, projectID)
	if err != nil {
		return Initiator{}, err
	}
	return Initiator{Name: row.Name, Password: row.Password, CertificatePEM: row.CertificatePem}, nil
}

// Verify reports whether name and securityCredential identify the project's
// Initiator: the password RSA-encrypted (PKCS#1 v1.5) with its certificate, base64.
func (s *Store) Verify(ctx context.Context, projectID int64, name, securityCredential string) (bool, error) {
	row, err := s.ensure(ctx, projectID)
	if err != nil {
		return false, err
	}
	if name != row.Name {
		return false, nil
	}

	ciphertext, err := base64.StdEncoding.DecodeString(securityCredential)
	if err != nil {
		return false, nil
	}
	key, err := parsePrivateKey(row.PrivateKeyPem)
	if err != nil {
		return false, err
	}
	password, err := rsa.DecryptPKCS1v15(nil, key, ciphertext)
	if err != nil {
		return false, nil
	}
	return string(password) == row.Password, nil
}

func (s *Store) ensure(ctx context.Context, projectID int64) (repository.Initiator, error) {
	row, err := s.db.Queries().GetInitiator(ctx, projectID)
	if err == nil {
		return row, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return repository.Initiator{}, err
	}

	created, err := generate(projectID)
	if err != nil {
		return repository.Initiator{}, err
	}
	// A concurrent first use may win the insert; either way, read back the stored one.
	if err := s.db.Queries().CreateInitiator(ctx, created); err != nil {
		return repository.Initiator{}, err
	}
	return s.db.Queries().GetInitiator(ctx, projectID)
}

func generate(projectID int64) (repository.CreateInitiatorParams, error) {
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return repository.CreateInitiatorParams{}, err
	}
	serial, err := rand.Int(rand.Reader, new(big.Int).Lsh(big.NewInt(1), 62))
	if err != nil {
		return repository.CreateInitiatorParams{}, err
	}
	template := &x509.Certificate{
		SerialNumber: serial,
		Subject:      pkix.Name{CommonName: "Daraja Local initiator", Organization: []string{"Daraja Local"}},
		NotBefore:    time.Now().Add(-time.Hour),
		NotAfter:     time.Now().AddDate(20, 0, 0),
		KeyUsage:     x509.KeyUsageKeyEncipherment,
	}
	der, err := x509.CreateCertificate(rand.Reader, template, template, &key.PublicKey, key)
	if err != nil {
		return repository.CreateInitiatorParams{}, err
	}
	password, err := randomPassword(14)
	if err != nil {
		return repository.CreateInitiatorParams{}, err
	}

	return repository.CreateInitiatorParams{
		ProjectID:      projectID,
		Name:           Name,
		Password:       password,
		PrivateKeyPem:  string(pem.EncodeToMemory(&pem.Block{Type: "RSA PRIVATE KEY", Bytes: x509.MarshalPKCS1PrivateKey(key)})),
		CertificatePem: string(pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der})),
	}, nil
}

func parsePrivateKey(encoded string) (*rsa.PrivateKey, error) {
	block, _ := pem.Decode([]byte(encoded))
	if block == nil {
		return nil, errors.New("initiator: stored private key is not PEM")
	}
	return x509.ParsePKCS1PrivateKey(block.Bytes)
}

func randomPassword(length int) (string, error) {
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
	out := make([]byte, length)
	for i := range out {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(alphabet))))
		if err != nil {
			return "", err
		}
		out[i] = alphabet[n.Int64()]
	}
	return string(out), nil
}
