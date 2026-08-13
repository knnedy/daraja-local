// Package migrations embeds the goose migration files so they can be
// compiled into the daraja-local binary
package migration

import "embed"

//go:embed *.sql
var FS embed.FS
