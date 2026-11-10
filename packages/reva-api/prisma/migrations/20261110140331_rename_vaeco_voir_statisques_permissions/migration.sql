-- Rename VOIR_STATISTIQUES to VOIR_STATISTIQUES_COMMANDITAIRE, add
-- VOIR_STATISTIQUES_SOUS_COMPTE, and point the sous-compte role at the new value.
-- The enum is rebuilt so the new label can be written in this same migration:
-- PostgreSQL will not accept a value added with ALTER TYPE ... ADD VALUE until
-- the surrounding transaction commits, and Prisma runs each migration in one.

CREATE TYPE "PermissionVaeCollective_new" AS ENUM (
    'CREER_COHORTE',
    'MODIFIER_COHORTE',
    'SUPPRIMER_COHORTE',
    'VOIR_LISTE_COHORTES',
    'VOIR_COHORTE',
    'VOIR_STATISTIQUES_COMMANDITAIRE',
    'CREER_SOUS_COMPTE',
    'MODIFIER_SOUS_COMPTE',
    'SUPPRIMER_SOUS_COMPTE',
    'VOIR_LISTE_SOUS_COMPTES',
    'VOIR_SOUS_COMPTE',
    'MODIFIER_DROITS_ACCES_COHORTE',
    'VOIR_STATISTIQUES_SOUS_COMPTE'
);

ALTER TABLE "role_permission_vae_collective"
    ALTER COLUMN "permission" TYPE "PermissionVaeCollective_new"
    USING (
        CASE
            WHEN "role" = 'SOUS_COMPTE_VAE_COLLECTIVE'
                AND "permission"::text = 'VOIR_STATISTIQUES'
                THEN 'VOIR_STATISTIQUES_SOUS_COMPTE'
            WHEN "permission"::text = 'VOIR_STATISTIQUES'
                THEN 'VOIR_STATISTIQUES_COMMANDITAIRE'
            ELSE "permission"::text
        END
    )::"PermissionVaeCollective_new";

ALTER TYPE "PermissionVaeCollective" RENAME TO "PermissionVaeCollective_old";
ALTER TYPE "PermissionVaeCollective_new" RENAME TO "PermissionVaeCollective";
DROP TYPE "PermissionVaeCollective_old";
