import { RoleVaeCollective } from "@prisma/client";

import { COHORTE_NON_TROUVEE } from "@/modules/shared/errors/messages";
import { prismaClient } from "@/prisma/client";

export const updateRolesSpecificToCohorteOfSousCompteVaeCollective = async ({
  commanditaireVaeCollectiveId,
  cohorteVaeCollectiveId,
  sousComptesIdsAndRoles,
}: {
  commanditaireVaeCollectiveId: string;
  cohorteVaeCollectiveId: string;
  sousComptesIdsAndRoles: {
    sousCompteVaeCollectiveId: string;
    roles: RoleVaeCollective[];
  }[];
}) => {
  const cohorteVaeCollective =
    await prismaClient.cohorteVaeCollective.findUnique({
      where: {
        id: cohorteVaeCollectiveId,
        commanditaireVaeCollectiveId,
      },
    });

  if (!cohorteVaeCollective) {
    throw new Error(COHORTE_NON_TROUVEE);
  }

  const sousComptesVaeCollectiveIds = [
    ...new Set(
      sousComptesIdsAndRoles.map(
        ({ sousCompteVaeCollectiveId }) => sousCompteVaeCollectiveId,
      ),
    ),
  ];

  const sousComptesBelongingToCommanditaireCount =
    await prismaClient.sousCompteVaeCollective.count({
      where: {
        id: { in: sousComptesVaeCollectiveIds },
        commanditaireVaeCollectiveId,
      },
    });

  //check that each sous-compte exists and is associated to the commanditaire
  if (
    sousComptesBelongingToCommanditaireCount !==
    sousComptesVaeCollectiveIds.length
  ) {
    throw new Error("Sous-compte non trouvé ou non associé au commanditaire");
  }

  await prismaClient.$transaction(async (tx) => {
    await tx.roleSpecificToSousCompteAndCohorteVaeCollective.deleteMany({
      where: {
        cohorteVaeCollectiveId,
        sousCompteVaeCollectiveId: { in: sousComptesVaeCollectiveIds },
      },
    });

    const data = sousComptesIdsAndRoles.flatMap(
      ({ sousCompteVaeCollectiveId, roles }) =>
        [...new Set(roles)].map((role) => ({
          sousCompteVaeCollectiveId,
          cohorteVaeCollectiveId,
          role,
        })),
    );

    if (data.length) {
      await tx.roleSpecificToSousCompteAndCohorteVaeCollective.createMany({
        data,
      });
    }
  });

  return cohorteVaeCollective;
};
