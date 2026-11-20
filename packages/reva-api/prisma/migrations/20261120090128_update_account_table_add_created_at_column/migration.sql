-- AlterTable
ALTER TABLE "account"
ADD COLUMN "created_at" TIMESTAMPTZ (6) DEFAULT CURRENT_TIMESTAMP;

UPDATE "account"
SET
    "created_at" = NULL;