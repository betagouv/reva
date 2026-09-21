import { prismaClient } from "@/prisma/client";

import { getPermissionsForRoles } from "./getPermissionsForRole";
import { getUserPermissionsSpecificToSousCompte } from "./getUserPermissionsSpecifictoSousCompte";
import { getUserPermissionsSpecificToSousCompteAndCohorte } from "./getUserPermissionsSpecificToSousCompteAndCohorte";
import { getVaeCollectiveRolesFromKeycloakRoles } from "./getVaeCollectiveRolesFromKeycloakRoles";

export const getUserPermissions = async ({
  userKeycloakId,
  userKeycloakRoles,
  cohorteVaeCollectiveId,
}: {
  userKeycloakId: string;
  userKeycloakRoles: string[];
  cohorteVaeCollectiveId?: string;
}) => {
  const permissions = [];
  const vaeCollectiveRoles = await getVaeCollectiveRolesFromKeycloakRoles({
    userKeycloakRoles,
  });

  const permissionsFromRoles = await getPermissionsForRoles({
    roles: vaeCollectiveRoles,
  });

  permissions.push(...permissionsFromRoles);

  const sousCompteVaeCollective =
    await prismaClient.sousCompteVaeCollective.findFirst({
      where: { account: { keycloakId: userKeycloakId } },
    });

  if (sousCompteVaeCollective) {
    const permissionsSpecificToSousCompte =
      await getUserPermissionsSpecificToSousCompte({
        sousCompteVaeCollectiveId: sousCompteVaeCollective.id,
      });
    permissions.push(...permissionsSpecificToSousCompte);

    if (cohorteVaeCollectiveId) {
      const permissionsSpecificToCohorte =
        await getUserPermissionsSpecificToSousCompteAndCohorte({
          sousCompteVaeCollectiveId: sousCompteVaeCollective.id,
          cohorteVaeCollectiveId,
        });
      permissions.push(...permissionsSpecificToCohorte);
    }
  }

  return Array.from(permissions);
};
