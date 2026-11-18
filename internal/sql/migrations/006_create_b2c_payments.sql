-- +goose Up
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
DROP TABLE "b2c_payments";
