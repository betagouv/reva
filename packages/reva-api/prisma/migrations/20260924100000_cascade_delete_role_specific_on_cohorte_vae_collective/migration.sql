-- DropForeignKey
ALTER TABLE "role_specific_to_sous_compte_and_cohorte_vae_collective" DROP CONSTRAINT "role_specific_to_sous_compte_and_cohorte_vae_collective_co_fkey";

-- AddForeignKey
ALTER TABLE "role_specific_to_sous_compte_and_cohorte_vae_collective" ADD CONSTRAINT "role_specific_to_sous_compte_and_cohorte_vae_collective_co_fkey" FOREIGN KEY ("cohorteVaeCollectiveId") REFERENCES "cohorte_vae_collective"("id") ON DELETE CASCADE ON UPDATE CASCADE;
