/*
  Warnings:

  - You are about to drop the column `jury_id` on the `amenagement_specifique` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[dossier_de_validation_id]` on the table `amenagement_specifique` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `dossier_de_validation_id` to the `amenagement_specifique` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "amenagement_specifique" DROP CONSTRAINT "amenagement_specifique_jury_id_fkey";

-- DropIndex
DROP INDEX "amenagement_specifique_jury_id_idx";

-- DropIndex
DROP INDEX "amenagement_specifique_jury_id_key";

-- AlterTable
ALTER TABLE "amenagement_specifique" DROP COLUMN "jury_id",
ADD COLUMN     "dossier_de_validation_id" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "amenagement_specifique_dossier_de_validation_id_idx" ON "amenagement_specifique"("dossier_de_validation_id");

-- CreateIndex
CREATE UNIQUE INDEX "amenagement_specifique_dossier_de_validation_id_key" ON "amenagement_specifique"("dossier_de_validation_id");

-- AddForeignKey
ALTER TABLE "amenagement_specifique" ADD CONSTRAINT "amenagement_specifique_dossier_de_validation_id_fkey" FOREIGN KEY ("dossier_de_validation_id") REFERENCES "dossier_de_validation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
