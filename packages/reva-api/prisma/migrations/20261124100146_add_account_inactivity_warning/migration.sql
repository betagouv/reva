-- CreateEnum
CREATE TYPE "TimeBeforeAccountDisabling" AS ENUM ('SIX_WEEKS', 'TWO_WEEKS', 'ONE_DAY');

-- CreateTable
CREATE TABLE "account_inactivity_warning" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "account_id" UUID NOT NULL,
    "time_before_disabling" "TimeBeforeAccountDisabling" NOT NULL,
    "sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_inactivity_warning_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "account_inactivity_warning_account_id_idx" ON "account_inactivity_warning"("account_id");

-- AddForeignKey
ALTER TABLE "account_inactivity_warning" ADD CONSTRAINT "account_inactivity_warning_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
