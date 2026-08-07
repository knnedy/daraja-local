-- name: CreateDefaultSettings :one
INSERT INTO "project_settings" ("project_id")
VALUES (?)
RETURNING *;

-- name: GetSettingsByProjectID :one
SELECT * FROM "project_settings" WHERE "project_id" = ?;

-- name: UpdateSettings :one
UPDATE "project_settings"
SET "callback_url" = ?,
    "stk_timeout_seconds" = ?,
    "c2b_response_type" = ?,
    "external_validation_default" = ?
WHERE "project_id" = ?
RETURNING *;