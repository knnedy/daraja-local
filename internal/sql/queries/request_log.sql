-- name: CreateRequestLogEntry :one
INSERT INTO "request_log" ("project_id", "kind", "direction", "status", "attempts", "payload")
VALUES (?, ?, ?, ?, ?, ?)
RETURNING *;

-- name: ListRequestLogEntries :many
SELECT * FROM "request_log"
WHERE "project_id" = ?
ORDER BY "created_at" DESC
LIMIT ?;

-- name: ClearRequestLog :exec
DELETE FROM "request_log" WHERE "project_id" = ?;