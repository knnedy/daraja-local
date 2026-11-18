-- +goose Up
-- Unquoted table name: sqlc cannot parse a quoted one in ALTER TABLE.
-- Registrations made before this were through the v2 paths the dashboard shows.
ALTER TABLE project_settings ADD COLUMN c2b_api_version TEXT NOT NULL DEFAULT 'v2' CHECK (c2b_api_version IN ('v1', 'v2'));

-- +goose Down
ALTER TABLE project_settings DROP COLUMN c2b_api_version;
