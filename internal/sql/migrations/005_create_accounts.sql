-- +goose Up
-- A project's simulated M-Pesa accounts, in cents. Created on first use.
CREATE TABLE "accounts" (
    "project_id"          INTEGER PRIMARY KEY,
    "utility_cents"       INTEGER NOT NULL DEFAULT 100000000,
    "working_cents"       INTEGER NOT NULL DEFAULT 0,
    "charges_paid_cents"  INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "accounts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE,
    CONSTRAINT "accounts_utility_cents_check" CHECK ("utility_cents" >= 0),
    CONSTRAINT "accounts_working_cents_check" CHECK ("working_cents" >= 0)
);

-- +goose Down
DROP TABLE "accounts";
