-- +goose Up
-- An Initiator signs B2C-style requests. The key pair stands in for Safaricom's
-- certificate, so apps encrypt SecurityCredential exactly as they will for real.
CREATE TABLE "initiators" (
    "project_id"       INTEGER PRIMARY KEY,
    "name"             TEXT NOT NULL,
    "password"         TEXT NOT NULL,
    "private_key_pem"  TEXT NOT NULL,
    "certificate_pem"  TEXT NOT NULL,
    "created_at"       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    CONSTRAINT "initiators_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE
);

-- +goose Down
DROP TABLE "initiators";
