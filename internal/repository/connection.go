package repository

import (
	"context"
	"database/sql"
	"embed"
	"fmt"

	"github.com/pressly/goose/v3"
	_ "modernc.org/sqlite"
)

//go:embed all:../sql/migrations
var migrations embed.FS

type DB struct {
	conn *sql.DB
}

func Open(path string) (*DB, error) {
	dsn := fmt.Sprintf(
		"file:%s?_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)&_pragma=foreign_keys(ON)",
		path,
	)

	conn, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("repository: open %s: %w", path, err)
	}
	conn.SetMaxOpenConns(1)

	if err := conn.Ping(); err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("repository: ping %s: %w", path, err)
	}

	if err := migrate(conn); err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("repository: migrate: %w", err)
	}

	return &DB{conn: conn}, nil
}

func migrate(conn *sql.DB) error {
	goose.SetBaseFS(migrations)
	defer goose.SetBaseFS(nil)

	if err := goose.SetDialect("sqlite3"); err != nil {
		return err
	}
	return goose.Up(conn, "../sql/migrations")
}

// Queries returns a *Queries bound to the base connection, for reads and
// single-statement writes outside a transaction.
func (d *DB) Queries() *Queries {
	return New(d.conn)
}

func (d *DB) WithTransaction(ctx context.Context, fn func(q *Queries) error) error {
	tx, err := d.conn.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("repository: begin transaction: %w", err)
	}

	q := New(tx)

	if err := fn(q); err != nil {
		_ = tx.Rollback()
		return err
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("repository: commit transaction: %w", err)
	}
	return nil
}

func (d *DB) Close() error {
	return d.conn.Close()
}
