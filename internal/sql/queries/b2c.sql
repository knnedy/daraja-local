-- name: EnsureAccount :exec
INSERT INTO "accounts" ("project_id") VALUES (?)
ON CONFLICT ("project_id") DO NOTHING;

-- name: GetAccount :one
SELECT * FROM "accounts" WHERE "project_id" = ?;

-- name: DebitUtilityAccount :one
UPDATE "accounts"
SET "utility_cents" = "utility_cents" - sqlc.arg(cents)
WHERE "project_id" = sqlc.arg(project_id) AND "utility_cents" >= sqlc.arg(cents)
RETURNING *;

-- name: SetUtilityBalance :one
UPDATE "accounts"
SET "utility_cents" = ?
WHERE "project_id" = ?
RETURNING *;

-- name: SetB2CNextOutcome :exec
UPDATE "project_settings" SET "b2c_next_outcome" = ? WHERE "project_id" = ?;

-- name: CreateB2CPayment :one
INSERT INTO "b2c_payments" (
    "project_id", "originator_conversation_id", "conversation_id", "transaction_id", "command_id",
    "amount", "party_b", "remarks", "occasion", "result_url", "queue_timeout_url"
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
RETURNING *;

-- name: CompleteB2CPayment :exec
UPDATE "b2c_payments"
SET "status" = ?, "result_code" = ?, "completed_at" = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE "id" = ?;
