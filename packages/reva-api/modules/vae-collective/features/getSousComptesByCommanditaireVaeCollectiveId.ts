import { Prisma } from "@prisma/client";

import { processPaginationInfo } from "@/modules/shared/list/pagination";
import { prismaClient } from "@/prisma/client";

export const getSousComptesByCommanditaireVaeCollectiveId = async ({
  commanditaireVaeCollectiveId,
  offset = 0,
  limit = 10,
  searchFilter,
}: {
  commanditaireVaeCollectiveId: string;
  offset?: number;
  limit?: number;
  searchFilter?: string;
}) => {
  const whereClause: Prisma.SousCompteVaeCollectiveWhereInput = {
    commanditaireVaeCollectiveId,
  };

  if (searchFilter) {
    whereClause.account = {
      OR: [
        { firstname: { contains: searchFilter, mode: "insensitive" } },
        { lastname: { contains: searchFilter, mode: "insensitive" } },
        { email: { contains: searchFilter, mode: "insensitive" } },
      ],
    };
  }

  const sousComptes = await prismaClient.sousCompteVaeCollective.findMany({
    where: whereClause,
    skip: offset,
    take: limit,
    orderBy: [
      { account: { lastname: "asc" } },
      { account: { firstname: "asc" } },
    ],
  });

  const sousComptesCount = await prismaClient.sousCompteVaeCollective.count({
    where: whereClause,
  });

  return {
    rows: sousComptes,
    info: processPaginationInfo({
      limit,
      offset,
      totalRows: sousComptesCount,
    }),
  };
};
