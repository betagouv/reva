import { prismaClient } from "@/prisma/client";

import { getPermissionsForRoles } from "./getPermissionsForRole";

export const getUserPermissionsSpecificToSousCompteAndCohorte = async ({
  sousCompteVaeCollectiveId,
  cohorteVaeCollectiveId,
}: {
  sousCompteVaeCollectiveId: string;
  cohorteVaeCollectiveId: string;
}) => {
  if (!sousCompteVaeCollectiveId) {
    return [];
  }
  const rolesSpecificToCohorte = await prismaClient.sousCompteVaeCollective
    .findUnique({
      where: {
        id: sousCompteVaeCollectiveId,
      },
    })
    .roleSpecificToSousCompteAndCohorteVaeCollectives({
      where: {
        cohorteVaeCollectiveId,
      },
    })
    .then((rstsc) => rstsc?.map((r) => r.role) ?? []);

  const permissions = await getPermissionsForRoles({
    roles: rolesSpecificToCohorte,
  });

  return permissions;
};
