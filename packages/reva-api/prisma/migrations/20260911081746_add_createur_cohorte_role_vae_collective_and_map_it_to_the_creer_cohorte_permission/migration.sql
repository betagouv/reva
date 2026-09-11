-- AlterEnum
ALTER TYPE "RoleVaeCollective" ADD VALUE 'CREATEUR_COHORTE';

COMMIT;

Insert into
    "role_permission_vae_collective" ("role", "permission")
values
    ('CREATEUR_COHORTE', 'CREER_COHORTE');