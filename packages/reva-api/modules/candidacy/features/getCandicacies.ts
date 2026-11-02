import { Candidacy, Prisma } from "@prisma/client";

import { processPaginationInfo } from "@/modules/shared/list/pagination";
import { getWhereClauseFromSearchFilter } from "@/modules/shared/search/search";
import { prismaClient } from "@/prisma/client";

import {
  CandidacySortByFilter,
  CandidacyStatusFilter,
} from "../candidacy.types";
import {
  candidacySearchWord,
  getWhereClauseFromStatusFilter,
} from "../utils/candidacy.helper";

export const getCandidacies = async ({
  hasRole,
  iAMId,
  limit,
  offset,
  statusFilter,
  searchFilter,
  sortByFilter,
  maisonMereAAPId,
  cohorteVaeCollectiveId,
}: {
  hasRole(role: string): boolean;
  iAMId: string;
  limit?: number;
  offset?: number;
  statusFilter?: CandidacyStatusFilter;
  searchFilter?: string;
  sortByFilter?: CandidacySortByFilter;
  maisonMereAAPId?: string;
  cohorteVaeCollectiveId?: string;
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

  if (hasRole("admin")) {
    let organismAccountKeycloakId: string | undefined;
    if (maisonMereAAPId) {
      const maisonMereAAP = await prismaClient.maisonMereAAP.findUnique({
        where: { id: maisonMereAAPId },
        select: {
          gestionnaire: {
            select: {
              keycloakId: true,
            },
          },
        },
      });

      if (maisonMereAAP?.gestionnaire.keycloakId) {
        organismAccountKeycloakId = maisonMereAAP?.gestionnaire.keycloakId;
      }
    }

    candidaciesAndTotal = await getCandidaciesFromDb({
      organismAccountKeycloakId,
      offset: realOffset,
      limit: realLimit,
      statusFilter,
      searchFilter,
      sortByFilter,
      cohorteVaeCollectiveId,
    });
  } else if (hasRole("manage_candidacy")) {
    candidaciesAndTotal = await getCandidaciesFromDb({
      organismAccountKeycloakId: iAMId,
      offset: realOffset,
      limit: realLimit,
      statusFilter,
      searchFilter,
      sortByFilter,
      cohorteVaeCollectiveId,
    });
  }

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
  organismAccountKeycloakId,
  statusFilter,
  searchFilter,
  sortByFilter,
  cohorteVaeCollectiveId,
}: {
  limit: number;
  offset: number;
  organismAccountKeycloakId?: string;
  statusFilter?: CandidacyStatusFilter;
  searchFilter?: string;
  sortByFilter?: CandidacySortByFilter;
  cohorteVaeCollectiveId?: string;
}) => {
  let whereClause: Prisma.CandidacyWhereInput = organismAccountKeycloakId
    ? {
        organism: {
          OR: [
            {
              organismOnAccounts: {
                some: {
                  account: {
                    keycloakId: organismAccountKeycloakId,
                  },
                },
              },
            },
            {
              maisonMereAAP: {
                gestionnaire: {
                  keycloakId: organismAccountKeycloakId,
                },
              },
            },
          ],
        },
      }
    : {};

  whereClause = {
    ...whereClause,
    ...getWhereClauseFromStatusFilter(statusFilter),
    ...getWhereClauseFromSearchFilter(candidacySearchWord, searchFilter),
  };

  if (cohorteVaeCollectiveId) {
    whereClause = {
      ...whereClause,
      cohorteVaeCollectiveId,
    };
  }

  const candidaciesCount = await prismaClient.candidacy.count({
    where: whereClause,
  });

  const candidacies = await prismaClient.candidacy.findMany({
    orderBy: getOrderByClauseFromSortByFilter(sortByFilter),
    where: whereClause,
    skip: offset,
    take: limit,
  });

  return {
    total: candidaciesCount,
    candidacies,
  };
};

const getOrderByClauseFromSortByFilter = (
  sortByFilter: CandidacySortByFilter = "DATE_CREATION_DESC",
):
  | Prisma.CandidacyOrderByWithRelationInput
  | Prisma.CandidacyOrderByWithRelationInput[]
  | undefined => {
  if (sortByFilter == "DATE_CREATION_DESC") {
    return [{ createdAt: "desc" }];
  } else if (sortByFilter == "DATE_CREATION_ASC") {
    return [{ createdAt: "asc" }];
  } else if (sortByFilter == "DATE_ENVOI_DESC") {
    return [{ sentAt: "desc" }];
  } else if (sortByFilter == "DATE_ENVOI_ASC") {
    return [{ sentAt: "asc" }];
  }

  return undefined;
};
