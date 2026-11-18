-- name: CreateTransaction :exec
INSERT INTO "transactions" (
    "project_id", "receipt", "kind", "originator_conversation_id", "conversation_id",
    "amount", "debit_party", "credit_party", "reason_type", "initiated_at", "finalised_at"
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);

-- name: GetTransactionByReceipt :one
SELECT * FROM "transactions" WHERE "project_id" = ? AND "receipt" = ?;

-- name: GetTransactionByOriginator :one
SELECT * FROM "transactions"
WHERE "project_id" = ? AND "originator_conversation_id" = ? AND "originator_conversation_id" != ''
ORDER BY "id" DESC
LIMIT 1;

-- name: MarkTransactionReversed :execrows
UPDATE "transactions" SET "reversed_by" = sqlc.arg(reversed_by)
WHERE "project_id" = sqlc.arg(project_id) AND "receipt" = sqlc.arg(receipt) AND "reversed_by" = '';

-- name: CreditUtilityAccount :exec
UPDATE "accounts" SET "utility_cents" = "utility_cents" + sqlc.arg(cents)
WHERE "project_id" = sqlc.arg(project_id);

-- name: SetWorkingBalance :one
UPDATE "accounts" SET "working_cents" = ?
WHERE "project_id" = ?
RETURNING *;

-- name: DebitWorkingAccount :one
UPDATE "accounts"
SET "working_cents" = "working_cents" - sqlc.arg(cents)
WHERE "project_id" = sqlc.arg(project_id) AND "working_cents" >= sqlc.arg(cents)
RETURNING *;

-- name: ListTransactions :many
SELECT * FROM "transactions"
WHERE "project_id" = sqlc.arg(project_id)
ORDER BY "id" DESC
LIMIT sqlc.arg(row_limit);
