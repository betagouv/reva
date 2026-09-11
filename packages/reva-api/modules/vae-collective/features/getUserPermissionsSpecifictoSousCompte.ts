import { prismaClient } from "@/prisma/client";

import { getPermissionsForRoles } from "./getPermissionsForRole";

export const getUserPermissionsSpecificToSousCompte = async ({
  sousCompteVaeCollectiveId,
}: {
  sousCompteVaeCollectiveId: string;
}) => {
  if (!sousCompteVaeCollectiveId) {
    return [];
  }
  const rolesSpecificToSousCompte = await prismaClient.sousCompteVaeCollective
    .findUnique({
      where: {
        id: sousCompteVaeCollectiveId,
      },
    })
    .roleSpecificToSousCompteVaeCollective()
    .then((rstsc) => rstsc?.map((r) => r.role) ?? []);

  const permissions = await getPermissionsForRoles({
    roles: rolesSpecificToSousCompte,
  });

  return permissions;
};
