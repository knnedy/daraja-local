-- +goose Up
CREATE TABLE "project_settings" (
    "project_id"                   INTEGER PRIMARY KEY,
    "callback_url"                 TEXT NOT NULL DEFAULT '',
    "validation_url"               TEXT NOT NULL DEFAULT '',
    "stk_timeout_seconds"          INTEGER NOT NULL DEFAULT 20,
    "c2b_response_type"            TEXT NOT NULL DEFAULT 'Completed',
    -- The registerurl path version; it decides how C2B MSISDN is hidden.
    "c2b_api_version"              TEXT NOT NULL DEFAULT 'v2',
    "external_validation_default"  INTEGER NOT NULL DEFAULT 0,
    "default_phone_number"         TEXT NOT NULL DEFAULT '254708374149',
    -- The result the next B2C payment gets instead of its natural one; '' for none.
    "b2c_next_outcome"             TEXT NOT NULL DEFAULT '',
    CONSTRAINT "project_settings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE,
    CONSTRAINT "project_settings_c2b_response_type_check" CHECK ("c2b_response_type" IN ('Completed', 'Cancelled')),
    CONSTRAINT "project_settings_c2b_api_version_check" CHECK ("c2b_api_version" IN ('v1', 'v2')),
    CONSTRAINT "project_settings_external_validation_default_check" CHECK ("external_validation_default" IN (0, 1)),
    CONSTRAINT "project_settings_default_phone_number_check" CHECK (length("default_phone_number") = 12)
);

-- +goose Down
DROP TABLE "project_settings";
