-- +goose Up
CREATE TABLE "project_settings" (
    "project_id"                   INTEGER PRIMARY KEY,
    "callback_url"                 TEXT NOT NULL DEFAULT '',
    "stk_timeout_seconds"          INTEGER NOT NULL DEFAULT 20,
    "c2b_response_type"            TEXT NOT NULL DEFAULT 'Completed',
    "external_validation_default"  INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "project_settings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE,
    CONSTRAINT "project_settings_c2b_response_type_check" CHECK ("c2b_response_type" IN ('Completed', 'Cancelled')),
    CONSTRAINT "project_settings_external_validation_default_check" CHECK ("external_validation_default" IN (0, 1))
);

-- +goose Down
DROP TABLE "project_settings";