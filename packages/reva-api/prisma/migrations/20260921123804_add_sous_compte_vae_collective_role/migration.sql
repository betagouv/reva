-- AlterEnum
ALTER TYPE "RoleVaeCollective" ADD VALUE 'SOUS_COMPTE_VAE_COLLECTIVE';

COMMIT;

INSERT INTO
    "role_permission_vae_collective" ("role", "permission")
VALUES
    (
        'SOUS_COMPTE_VAE_COLLECTIVE',
        'VOIR_LISTE_COHORTES'
    );

INSERT INTO
    "keycloak_role_on_role_vae_collective" ("keycloak_role", "role")
VALUES
    (
        'sous_compte_vae_collective',
        'SOUS_COMPTE_VAE_COLLECTIVE'
    );