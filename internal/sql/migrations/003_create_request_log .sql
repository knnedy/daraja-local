-- +goose Up
CREATE TABLE "request_log" (
    "id"          INTEGER PRIMARY KEY AUTOINCREMENT,
    "project_id"  INTEGER NOT NULL,
    "kind"        TEXT NOT NULL,
    "direction"   TEXT NOT NULL,
    "status"      TEXT NOT NULL,
    "attempts"    INTEGER NOT NULL DEFAULT 1,
    "payload"     TEXT NOT NULL,
    "created_at"  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    CONSTRAINT "request_log_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE,
    CONSTRAINT "request_log_kind_check" CHECK ("kind" IN ('stk_push', 'c2b')),
    CONSTRAINT "request_log_direction_check" CHECK ("direction" IN ('inbound', 'outbound')),
    CONSTRAINT "request_log_attempts_check" CHECK ("attempts" >= 1)
);

CREATE INDEX "idx_request_log_project_id_created_at" ON "request_log" ("project_id", "created_at" DESC);

-- +goose Down
DROP INDEX "idx_request_log_project_id_created_at";
DROP TABLE "request_log";