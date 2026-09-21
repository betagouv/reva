import { PermissionVaeCollective } from "@prisma/client";
import { IFieldResolver, MercuriusContext } from "mercurius";

import { NOT_AUTHORIZED_RESOURCE_ACCESS } from "@/modules/shared/security/messages";
import { hasRole, whenHasRole } from "@/modules/shared/security/middlewares";
import { isGestionnaireOfCohorteVaeCollective } from "@/modules/shared/security/middlewares/isGestionnaireOfCohorteVaeCollective";
import { isGestionnaireOfCommanditaireVaeCollective } from "@/modules/shared/security/middlewares/isGestionnaireOfCommanditaireVaeCollective";
import { isGestionnaireOfSousCompteVaeCollective } from "@/modules/shared/security/middlewares/isGestionnaireOfSousCompteVaeCollective";

import { getUserPermissions } from "../features/getUserPermissions";

// Permissions portant sur une cohorte précise : le simple rattachement au
// commanditaire ne suffit pas, il faut aussi vérifier que la cohorte visée
// (args.cohorteVaeCollectiveId) appartient bien à ce commanditaire.
const COHORTE_SCOPED_PERMISSIONS: ReadonlySet<PermissionVaeCollective> =
  new Set([
    "VOIR_COHORTE",
    "MODIFIER_COHORTE",
    "SUPPRIMER_COHORTE",
    "MODIFIER_DROITS_ACCES_COHORTE",
  ]);

// Permissions portant sur un sous-compte précis : le simple rattachement au
// commanditaire ne suffit pas, il faut aussi vérifier que le sous-compte visé
// (args.sousCompteVaeCollectiveId) appartient bien à ce commanditaire.
const SOUS_COMPTE_SCOPED_PERMISSIONS: ReadonlySet<PermissionVaeCollective> =
  new Set([
    "VOIR_SOUS_COMPTE",
    "MODIFIER_SOUS_COMPTE",
    "SUPPRIMER_SOUS_COMPTE",
  ]);

export const hasVaeCollectivePermission = (
  permission: PermissionVaeCollective,
) => [
  hasRole(["admin", "manage_vae_collective", "sous_compte_vae_collective"]),

  // Dans le cas d'un profil gestionnaire
  // Si la permission est portée sur une cohorte, on vérifie que l'utilisateur
  // est gestionnaire de la cohorte. Sinon, on vérifie que l'utilisateur est gestionnaire du commanditaire.
  whenHasRole(
    "manage_vae_collective",
    COHORTE_SCOPED_PERMISSIONS.has(permission)
      ? isGestionnaireOfCohorteVaeCollective
      : isGestionnaireOfCommanditaireVaeCollective,
  ),

  // Dans le cas d'un profil gestionnaire
  // Si la permission est portée sur un sous-compte, on vérifie que l'utilisateur
  // est gestionnaire du sous-compte. Sinon, on vérifie que l'utilisateur est gestionnaire du commanditaire.
  whenHasRole(
    "manage_vae_collective",
    SOUS_COMPTE_SCOPED_PERMISSIONS.has(permission)
      ? isGestionnaireOfSousCompteVaeCollective
      : isGestionnaireOfCommanditaireVaeCollective,
  ),
  whenHasRole("manage_vae_collective", checkUserPermission(permission)),
  whenHasRole("sous_compte_vae_collective", checkUserPermission(permission)),
];

const checkUserPermission =
  (permission: PermissionVaeCollective) =>
  (next: IFieldResolver<unknown>) =>
  async (
    root: any,
    args: Record<string, any>,
    context: MercuriusContext,
    info: any,
  ) => {
    const userKeycloakId = context.auth?.userInfo?.sub || "";
    const userKeycloakRoles = context.auth?.userInfo?.realm_access?.roles || [];
    const cohorteVaeCollectiveId = args.cohorteVaeCollectiveId || "";

    const userPermissions = await getUserPermissions({
      userKeycloakId,
      userKeycloakRoles,
      cohorteVaeCollectiveId,
    });
    const hasPermission = userPermissions.includes(permission);

    if (!hasPermission) {
      throw new Error(NOT_AUTHORIZED_RESOURCE_ACCESS);
    }

    return next(root, args, context, info);
  };
