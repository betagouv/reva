/*
  Warnings:

  - You are about to drop the column `certificationAuthorityId` on the `account` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "account" DROP CONSTRAINT "account_certificationAuthorityId_fkey";

-- DropIndex
DROP INDEX "account_certificationAuthorityId_idx";

-- AlterTable
ALTER TABLE "account" DROP COLUMN "certificationAuthorityId";
