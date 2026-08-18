-- name: CreateProject :one
INSERT INTO "projects" ("slug", "name", "short_code", "consumer_key", "consumer_secret", "passkey", "callback_base_url")
VALUES (?, ?, ?, ?, ?, ?, ?)
RETURNING *;

-- name: UpdateProjectName :one
UPDATE projects
SET name = ?
WHERE slug = ?
RETURNING *;

-- name: GetProjectBySlug :one
SELECT * FROM "projects" WHERE "slug" = ?;

-- name: SlugExists :one
SELECT EXISTS (SELECT 1 FROM "projects" WHERE "slug" = ?);

-- name: ListProjects :many
SELECT * FROM "projects"
ORDER BY COALESCE("last_active_at", "created_at") DESC;

-- name: TouchProjectLastActive :exec
UPDATE "projects"
SET "last_active_at" = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE "slug" = ?;

-- name: RegenerateProjectCredentials :one
UPDATE "projects"
SET "consumer_key" = ?, "consumer_secret" = ?, "passkey" = ?
WHERE "slug" = ?
RETURNING *;

-- name: GetProjectByCredentials :one
SELECT * FROM "projects" WHERE "consumer_key" = ? AND "consumer_secret" = ?;

-- name: DeleteProject :exec
DELETE FROM "projects" WHERE "slug" = ?;
