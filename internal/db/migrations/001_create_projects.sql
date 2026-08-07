-- +goose Up
CREATE TABLE "projects" (
    "id"                    INTEGER PRIMARY KEY AUTOINCREMENT,
    "slug"                  TEXT NOT NULL,
    "name"                  TEXT NOT NULL,
    "short_code"            TEXT NOT NULL,
    "consumer_key"          TEXT NOT NULL,
    "consumer_secret"       TEXT NOT NULL,
    "passkey"               TEXT NOT NULL,
    "callback_base_url"     TEXT NOT NULL,
    "created_at"            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    "last_active_at"        TEXT,
    CONSTRAINT "projects_slug_key" UNIQUE ("slug")
);

-- +goose Down
DROP TABLE "projects";