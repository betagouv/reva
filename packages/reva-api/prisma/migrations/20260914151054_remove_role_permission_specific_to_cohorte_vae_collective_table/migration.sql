/*
  Warnings:

  - You are about to drop the `role_permission_specific_to_cohorte_vae_collective` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "role_permission_specific_to_cohorte_vae_collective" DROP CONSTRAINT "role_permission_specific_to_cohorte_vae_collective_cohorte_fkey";

-- DropTable
DROP TABLE "role_permission_specific_to_cohorte_vae_collective";
