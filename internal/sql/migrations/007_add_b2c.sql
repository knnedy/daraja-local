-- +goose Up
-- SQLite cannot alter a CHECK, so request_log is rebuilt to allow the kinds of
-- every planned Daraja API, not only STK Push and C2B.
CREATE TABLE "request_log_new" (
    "id"             INTEGER PRIMARY KEY AUTOINCREMENT,
    "project_id"     INTEGER NOT NULL,
    "correlation_id" TEXT,
    "kind"           TEXT NOT NULL,
    "operation"      TEXT NOT NULL DEFAULT '',
    "step"           TEXT NOT NULL DEFAULT '',
    "direction"      TEXT NOT NULL,
    "status"         TEXT NOT NULL,
    "outcome"        TEXT,
    "attempts"       INTEGER NOT NULL DEFAULT 1,
    "payload"        TEXT NOT NULL,
    "created_at"     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    CONSTRAINT "request_log_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE,
    CONSTRAINT "request_log_kind_check" CHECK ("kind" IN ('stk_push', 'c2b', 'b2c', 'b2b', 'transaction_status', 'reversal', 'account_balance')),
    CONSTRAINT "request_log_direction_check" CHECK ("direction" IN ('inbound', 'outbound')),
    CONSTRAINT "request_log_attempts_check" CHECK ("attempts" >= 1)
);

INSERT INTO "request_log_new" ("id", "project_id", "correlation_id", "kind", "operation", "step", "direction", "status", "outcome", "attempts", "payload", "created_at")
SELECT "id", "project_id", "correlation_id", "kind", "operation", "step", "direction", "status", "outcome", "attempts", "payload", "created_at"
FROM "request_log";

DROP INDEX "idx_request_log_correlation_id";
DROP INDEX "idx_request_log_project_id_created_at";
DROP TABLE "request_log";
-- Unquoted: sqlc cannot parse quoted table names in ALTER TABLE.
ALTER TABLE request_log_new RENAME TO request_log;
CREATE INDEX "idx_request_log_project_id_created_at" ON "request_log" ("project_id", "created_at" DESC);
CREATE INDEX "idx_request_log_correlation_id" ON "request_log" ("correlation_id");

-- A project's simulated M-Pesa accounts, in cents. Created on first use.
CREATE TABLE "accounts" (
    "project_id"             INTEGER PRIMARY KEY,
    "utility_cents"          INTEGER NOT NULL DEFAULT 100000000,
    "working_cents"          INTEGER NOT NULL DEFAULT 0,
    "charges_paid_cents"     INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "accounts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE,
    CONSTRAINT "accounts_utility_cents_check" CHECK ("utility_cents" >= 0)
);

-- The result the next B2C payment gets instead of its natural one; '' for none.
ALTER TABLE project_settings ADD COLUMN b2c_next_outcome TEXT NOT NULL DEFAULT '';

CREATE TABLE "b2c_payments" (
    "id"                          INTEGER PRIMARY KEY,
    "project_id"                  INTEGER NOT NULL,
    "originator_conversation_id"  TEXT NOT NULL,
    "conversation_id"             TEXT NOT NULL,
    "transaction_id"              TEXT NOT NULL,
    "command_id"                  TEXT NOT NULL,
    "amount"                      INTEGER NOT NULL,
    "party_b"                     TEXT NOT NULL,
    "remarks"                     TEXT NOT NULL,
    "occasion"                    TEXT NOT NULL DEFAULT '',
    "result_url"                  TEXT NOT NULL,
    "queue_timeout_url"           TEXT NOT NULL,
    "status"                      TEXT NOT NULL DEFAULT 'pending',
    "result_code"                 INTEGER,
    "created_at"                  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    "completed_at"                TEXT,
    CONSTRAINT "b2c_payments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE,
    CONSTRAINT "b2c_payments_originator_key" UNIQUE ("project_id", "originator_conversation_id"),
    CONSTRAINT "b2c_payments_status_check" CHECK ("status" IN ('pending', 'completed', 'failed', 'timed_out'))
);

CREATE INDEX "idx_b2c_payments_conversation_id" ON "b2c_payments" ("conversation_id");

-- +goose Down
DROP INDEX "idx_b2c_payments_conversation_id";
DROP TABLE "b2c_payments";
ALTER TABLE project_settings DROP COLUMN b2c_next_outcome;
DROP TABLE "accounts";
DELETE FROM "request_log" WHERE "kind" NOT IN ('stk_push', 'c2b');
