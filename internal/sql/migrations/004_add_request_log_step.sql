-- +goose Up
-- Unquoted on purpose: sqlc cannot parse a quoted table name in ALTER TABLE.
ALTER TABLE request_log ADD COLUMN operation TEXT NOT NULL DEFAULT '';
ALTER TABLE request_log ADD COLUMN step TEXT NOT NULL DEFAULT '';

UPDATE "request_log" SET "step" = CASE
    WHEN "direction" = 'inbound' THEN 'request'
    WHEN "status" = 'rejected' AND "outcome" IS NULL THEN 'rejection'
    WHEN "status" = 'accepted' AND "outcome" IS NULL THEN 'acceptance'
    WHEN "kind" = 'c2b' AND "outcome" IN ('accepted', 'rejected') THEN 'validation'
    WHEN "kind" = 'c2b' THEN 'confirmation'
    ELSE 'callback'
END;

UPDATE "request_log" SET "operation" = 'stk_push' WHERE "kind" = 'stk_push';

UPDATE "request_log" SET "operation" = CASE
    WHEN json_valid("payload") AND json_extract("payload", '$.ConfirmationURL') IS NOT NULL THEN 'c2b_register'
    WHEN json_valid("payload") AND json_extract("payload", '$.CommandID') IS NOT NULL THEN 'c2b_simulate'
    ELSE ''
END
WHERE "kind" = 'c2b' AND "direction" = 'inbound';

-- Outbound entries take the operation of the request they answer.
UPDATE "request_log" SET "operation" = COALESCE((
    SELECT r."operation" FROM "request_log" r
    WHERE r."project_id" = "request_log"."project_id"
      AND r."direction" = 'inbound'
      AND r."correlation_id" = "request_log"."correlation_id"
    LIMIT 1
), '')
WHERE "kind" = 'c2b' AND "direction" = 'outbound' AND "correlation_id" IS NOT NULL;

-- A rejection has no transaction ID; it was written right after its request.
UPDATE "request_log" SET "operation" = COALESCE((
    SELECT r."operation" FROM "request_log" r
    WHERE r."id" = "request_log"."id" - 1
      AND r."project_id" = "request_log"."project_id"
      AND r."direction" = 'inbound'
      AND r."status" = 'rejected'
), '')
WHERE "kind" = 'c2b' AND "step" = 'rejection';

-- +goose Down
ALTER TABLE "request_log" DROP COLUMN "step";
ALTER TABLE "request_log" DROP COLUMN "operation";
