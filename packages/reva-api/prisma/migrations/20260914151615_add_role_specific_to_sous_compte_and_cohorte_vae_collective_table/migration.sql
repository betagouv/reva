-- CreateTable
CREATE TABLE "role_specific_to_sous_compte_and_cohorte_vae_collective" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "role" "RoleVaeCollective" NOT NULL,
    "sous_compte_vae_collective_id" UUID NOT NULL,
    "cohorteVaeCollectiveId" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "role_specific_to_sous_compte_and_cohorte_vae_collective_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "role_specific_to_sous_compte_and_cohorte_vae_collective_rol_key" ON "role_specific_to_sous_compte_and_cohorte_vae_collective"("role", "sous_compte_vae_collective_id", "cohorteVaeCollectiveId");

-- AddForeignKey
ALTER TABLE "role_specific_to_sous_compte_and_cohorte_vae_collective" ADD CONSTRAINT "role_specific_to_sous_compte_and_cohorte_vae_collective_so_fkey" FOREIGN KEY ("sous_compte_vae_collective_id") REFERENCES "sous_compte_vae_collective"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_specific_to_sous_compte_and_cohorte_vae_collective" ADD CONSTRAINT "role_specific_to_sous_compte_and_cohorte_vae_collective_co_fkey" FOREIGN KEY ("cohorteVaeCollectiveId") REFERENCES "cohorte_vae_collective"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
