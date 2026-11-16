-- CreateEnum
CREATE TYPE "JuryResult" AS ENUM (
  'FULL_SUCCESS_OF_FULL_CERTIFICATION',
  'FULL_SUCCESS_OF_PARTIAL_CERTIFICATION',
  'PARTIAL_SUCCESS_OF_FULL_CERTIFICATION',
  'PARTIAL_SUCCESS_OF_PARTIAL_CERTIFICATION',
  'PARTIAL_SUCCESS_PENDING_CONFIRMATION',
  'FAILURE',
  'CANDIDATE_EXCUSED',
  'CANDIDATE_ABSENT'
);

-- AlterTable
-- Cast existing text in place. NULL stays NULL. Any value that is not one of
-- the enum labels fails the migration instead of being dropped.
ALTER TABLE "jury"
ALTER COLUMN "result" TYPE "JuryResult" USING ("result"::text::"JuryResult");
