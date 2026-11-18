-- name: GetInitiator :one
SELECT * FROM "initiators" WHERE "project_id" = ?;

-- name: CreateInitiator :exec
INSERT INTO "initiators" ("project_id", "name", "password", "private_key_pem", "certificate_pem")
VALUES (?, ?, ?, ?, ?)
ON CONFLICT ("project_id") DO NOTHING;
