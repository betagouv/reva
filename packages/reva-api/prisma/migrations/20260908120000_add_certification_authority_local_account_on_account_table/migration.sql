-- CreateTable
CREATE TABLE
    "certification_authority_local_account_on_account" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4 (),
        "certification_authority_local_account_id" UUID NOT NULL,
        "account_id" UUID NOT NULL,
        "created_at" TIMESTAMPTZ (6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ (6),
        CONSTRAINT "certification_authority_local_account_on_account_pkey" PRIMARY KEY ("id")
    );

-- CreateIndex
CREATE UNIQUE INDEX "cala_on_account_account_id_key" ON "certification_authority_local_account_on_account" ("account_id");

-- CreateIndex
CREATE INDEX "cala_on_account_cala_id_idx" ON "certification_authority_local_account_on_account" ("certification_authority_local_account_id");

-- AddForeignKey
ALTER TABLE "certification_authority_local_account_on_account" ADD CONSTRAINT "cala_on_account_cala" FOREIGN KEY ("certification_authority_local_account_id") REFERENCES "certification_authority_local_account" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certification_authority_local_account_on_account" ADD CONSTRAINT "cala_on_account_account" FOREIGN KEY ("account_id") REFERENCES "account" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill existing 1:N links
INSERT INTO
    "certification_authority_local_account_on_account" (
        "certification_authority_local_account_id",
        "account_id"
    )
SELECT
    "certification_authority_local_account_id",
    "id"
FROM
    "account"
WHERE
    "certification_authority_local_account_id" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "account" DROP CONSTRAINT "account_certification_authority_local_account_id_fkey";

-- DropIndex
DROP INDEX "account_certification_authority_local_account_id_idx";

-- AlterTable
ALTER TABLE "account" DROP COLUMN "certification_authority_local_account_id";
