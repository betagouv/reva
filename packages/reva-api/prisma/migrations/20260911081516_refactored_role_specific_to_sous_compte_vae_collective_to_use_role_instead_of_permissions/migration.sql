/*
  Warnings:

  - You are about to drop the `permission_specific_to_sous_compte_vae_collective` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "permission_specific_to_sous_compte_vae_collective" DROP CONSTRAINT "permission_specific_to_sous_compte_vae_collective_sous_com_fkey";

-- DropTable
DROP TABLE "permission_specific_to_sous_compte_vae_collective";

-- CreateTable
CREATE TABLE "role_specific_to_sous_compte_vae_collective" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "role" "RoleVaeCollective" NOT NULL,
    "sous_compte_vae_collective_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "role_specific_to_sous_compte_vae_collective_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "role_specific_to_sous_compte_vae_collective_role_sous_compt_key" ON "role_specific_to_sous_compte_vae_collective"("role", "sous_compte_vae_collective_id");

-- AddForeignKey
ALTER TABLE "role_specific_to_sous_compte_vae_collective" ADD CONSTRAINT "role_specific_to_sous_compte_vae_collective_sous_compte_va_fkey" FOREIGN KEY ("sous_compte_vae_collective_id") REFERENCES "sous_compte_vae_collective"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
