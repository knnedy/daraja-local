-- name: CreateRequestLogEntry :one
INSERT INTO "request_log" ("project_id", "correlation_id", "kind", "operation", "step", "direction", "status", "outcome", "attempts", "payload")
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
RETURNING *;

-- name: ListRequestLogEntries :many
SELECT * FROM "request_log"
WHERE "project_id" = sqlc.arg(project_id)
  AND (sqlc.narg(kind) IS NULL OR "kind" = sqlc.narg(kind))
  AND (sqlc.narg(before_id) IS NULL OR "id" < sqlc.narg(before_id))
ORDER BY "id" DESC
LIMIT sqlc.arg(row_limit);

-- name: ClearRequestLog :exec
DELETE FROM "request_log" WHERE "project_id" = ?;

-- name: GetLatestRequestLogEntryByStep :one
SELECT * FROM "request_log"
WHERE "project_id" = ? AND "correlation_id" = ? AND "step" = ?
ORDER BY "id" DESC
LIMIT 1;
