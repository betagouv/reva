import { PermissionVaeCollective, Prisma } from "@prisma/client";

import { processPaginationInfo } from "@/modules/shared/list/pagination";
import { prismaClient } from "@/prisma/client";

export const getCohortesVaeCollectivesByCommanditaireVaeCollectiveId = async ({
  commanditaireVaeCollectiveId,
  offset = 0,
  limit = 10,
  userKeycloakId,
  userKeycloakRoles,
}: {
  commanditaireVaeCollectiveId: string;
  offset: number;
  limit: number;
  userKeycloakId: string;
  userKeycloakRoles: KeyCloakUserRole[];
}) => {
  const isSousCompte = userKeycloakRoles.includes("sous_compte_vae_collective");
  const cohorteWhereClause: Prisma.CohorteVaeCollectiveWhereInput = {};
  if (isSousCompte) {
    const sousCompte = await prismaClient.sousCompteVaeCollective.findFirst({
      where: {
        account: { keycloakId: userKeycloakId },
      },
    });
    if (!sousCompte) {
      throw new Error("Sous-compte non trouvé");
    }

    const authorizedCohorteVaeCollectiveIds =
      await getCohorteVaeCollectiveIdsWithVoirCohortePermissionForSousCompte({
        sousCompteVaeCollectiveId: sousCompte.id,
      });

    cohorteWhereClause.id = { in: authorizedCohorteVaeCollectiveIds };
  }

  const cohorteVaeCollectives = await prismaClient.commanditaireVaeCollective
    .findUnique({
      where: { id: commanditaireVaeCollectiveId },
    })
    .cohorteVaeCollectives({
      skip: offset,
      take: limit,
      where: cohorteWhereClause,
      orderBy: {
        createdAt: "desc",
      },
    });

  const cohorteVaeCollectivesCount =
    await prismaClient.cohorteVaeCollective.count({
      where: {
        commanditaireVaeCollectiveId,
        ...cohorteWhereClause,
      },
    });

  return {
    rows: cohorteVaeCollectives,
    info: processPaginationInfo({
      limit,
      offset,
      totalRows: cohorteVaeCollectivesCount,
    }),
  };
};

const getCohorteVaeCollectiveIdsWithVoirCohortePermissionForSousCompte =
  async ({
    sousCompteVaeCollectiveId,
  }: {
    sousCompteVaeCollectiveId: string;
  }) => {
    const sousCompte = await prismaClient.sousCompteVaeCollective.findUnique({
      where: { id: sousCompteVaeCollectiveId },
    });

    if (!sousCompte) {
      return [];
    }

    const rolesWithVoirCohortePermission =
      await prismaClient.rolePermissionVaeCollective.findMany({
        where: { permission: PermissionVaeCollective.VOIR_COHORTE },
        select: { role: true },
      });
    const roles = rolesWithVoirCohortePermission.map((r) => r.role);

    const hasVoirCohorteRoleForAllCohortes =
      await prismaClient.roleSpecificToSousCompteVaeCollective.findFirst({
        where: { sousCompteVaeCollectiveId, role: { in: roles } },
      });

    // A role granted commanditaire-wide gives VOIR_COHORTE on every cohorte
    // of that commanditaire, not just specific ones.
    if (hasVoirCohorteRoleForAllCohortes) {
      const cohortes = await prismaClient.cohorteVaeCollective.findMany({
        where: {
          commanditaireVaeCollectiveId: sousCompte.commanditaireVaeCollectiveId,
        },
        select: { id: true },
      });
      return cohortes.map((c) => c.id);
    }

    const rolesSpecificToCohortes =
      await prismaClient.roleSpecificToSousCompteAndCohorteVaeCollective.findMany(
        {
          where: { sousCompteVaeCollectiveId, role: { in: roles } },
          select: { cohorteVaeCollectiveId: true },
        },
      );

    return Array.from(
      new Set(rolesSpecificToCohortes.map((r) => r.cohorteVaeCollectiveId)),
    );
  };
