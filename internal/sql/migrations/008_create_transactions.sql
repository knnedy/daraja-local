-- +goose Up
-- Every completed M-Pesa transaction, whichever API made it, so Transaction
-- Status and Reversal can find it by receipt.
CREATE TABLE "transactions" (
    "id"                         INTEGER PRIMARY KEY,
    "project_id"                 INTEGER NOT NULL,
    "receipt"                    TEXT NOT NULL,
    "kind"                       TEXT NOT NULL,
    "originator_conversation_id" TEXT NOT NULL DEFAULT '',
    "conversation_id"            TEXT NOT NULL DEFAULT '',
    "amount"                     INTEGER NOT NULL,
    "debit_party"                TEXT NOT NULL,
    "credit_party"               TEXT NOT NULL,
    "reason_type"                TEXT NOT NULL,
    "reversed_by"                TEXT NOT NULL DEFAULT '',
    "initiated_at"               TEXT NOT NULL,
    "finalised_at"               TEXT NOT NULL,
    CONSTRAINT "transactions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE,
    CONSTRAINT "transactions_receipt_key" UNIQUE ("project_id", "receipt"),
    CONSTRAINT "transactions_kind_check" CHECK ("kind" IN ('stk_push', 'c2b', 'b2c', 'reversal'))
);

CREATE INDEX "idx_transactions_originator" ON "transactions" ("project_id", "originator_conversation_id");

-- +goose Down
DROP INDEX "idx_transactions_originator";
DROP TABLE "transactions";
