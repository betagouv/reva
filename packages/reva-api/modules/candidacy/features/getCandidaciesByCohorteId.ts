import { Candidacy } from "@prisma/client";

import { processPaginationInfo } from "@/modules/shared/list/pagination";
import { prismaClient } from "@/prisma/client";

export const getCandidaciesByCohorteId = async ({
  limit,
  offset,
  cohorteVaeCollectiveId,
}: {
  limit?: number;
  offset?: number;
  cohorteVaeCollectiveId: string;
}) => {
  const realOffset = offset || 0;
  const realLimit = limit || 10000;
  let candidaciesAndTotal: {
    total: number;
    candidacies: Candidacy[];
  } = {
    total: 0,
    candidacies: [],
  };

  candidaciesAndTotal = await getCandidaciesFromDb({
    offset: realOffset,
    limit: realLimit,
    cohorteVaeCollectiveId,
  });

  return {
    rows: candidaciesAndTotal.candidacies,
    info: processPaginationInfo({
      totalRows: candidaciesAndTotal.total,
      limit: realLimit,
      offset: realOffset,
    }),
  };
};

const getCandidaciesFromDb = async ({
  limit,
  offset,
  cohorteVaeCollectiveId,
}: {
  limit: number;
  offset: number;
  cohorteVaeCollectiveId?: string;
}) => {
  const candidaciesCount = await prismaClient.candidacy.count({
    where: {
      cohorteVaeCollectiveId,
    },
  });

  const candidacies = await prismaClient.candidacy.findMany({
    orderBy: {
      createdAt: "desc",
    },
    where: {
      cohorteVaeCollectiveId,
    },
    skip: offset,
    take: limit,
  });

  return {
    total: candidaciesCount,
    candidacies,
  };
};
