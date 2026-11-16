-- name: CreateDefaultSettings :one
INSERT INTO "project_settings" ("project_id")
VALUES (?)
RETURNING *;

-- name: GetSettingsByProjectID :one
SELECT * FROM "project_settings" WHERE "project_id" = ?;

-- name: UpdateSimulationDefaults :one
UPDATE "project_settings"
SET "stk_timeout_seconds" = ?,
    "default_phone_number" = ?
WHERE "project_id" = ?
RETURNING *;

-- name: UpdateRegistration :one
UPDATE "project_settings"
SET "callback_url" = ?,
    "validation_url" = ?,
    "c2b_response_type" = ?,
    "external_validation_default" = ?
WHERE "project_id" = ?
RETURNING *;
