import { Jury, Prisma } from "@prisma/client";

import { candidacySearchWord } from "@/modules/candidacy/utils/candidacy.helper";
import { getCertificationAuthorityIdForAccount } from "@/modules/certification-authority/features/getCertificationAuthorityIdForAccount";
import { getCertificationAuthorityLocalAccountByAccountId } from "@/modules/certification-authority/features/getCertificationAuthorityLocalAccountByAccountId";
import { processPaginationInfo } from "@/modules/shared/list/pagination";
import { getWhereClauseFromSearchFilter } from "@/modules/shared/search/search";
import { NOT_AUTHORIZED } from "@/modules/shared/security/messages";
import { prismaClient } from "@/prisma/client";

import { JuryStatusFilter } from "../types/juryStatusFilter.type";
import { getWhereClauseFromJuryStatusFilter } from "../utils/getWhereClauseFromJuryStatusFilter.helper";

import { getJuryListQueryWhereClauseForUserWithManageRole } from "./getJuryListQueryWhereClauseForUserWithManageRole";

export const getActiveJuries = async ({
  keycloakId,
  hasRole,
  limit = 10,
  offset = 0,
  categoryFilter,
  searchFilter,
  certificationAuthorityId,
  certificationAuthorityLocalAccountId,
}: {
  keycloakId: string;
  hasRole: (role: string) => boolean;
  limit?: number;
  offset?: number;
  categoryFilter?: JuryStatusFilter;
  searchFilter?: string;
  certificationAuthorityId?: string;
  certificationAuthorityLocalAccountId?: string;
}): Promise<PaginatedListResult<Jury>> => {
  let queryWhereClause: Prisma.JuryWhereInput = {
    isActive: true,
    ...getWhereClauseFromJuryStatusFilter(categoryFilter),
  };

  //only list feasibilties linked to the account certification authority
  if (hasRole("manage_feasibility")) {
    const account = await prismaClient.account.findFirstOrThrow({
      where: { keycloakId },
    });

    const accountCertificationAuthorityId =
      await getCertificationAuthorityIdForAccount(account.id);

    if (
      hasRole("manage_certification_authority_local_account") &&
      certificationAuthorityLocalAccountId
    ) {
      if (!accountCertificationAuthorityId) {
        throw new Error(NOT_AUTHORIZED);
      }

      const certificationAuthorityLocalAccount =
        await prismaClient.certificationAuthorityLocalAccount.findUnique({
          where: {
            id: certificationAuthorityLocalAccountId,
            certificationAuthorityId: accountCertificationAuthorityId,
          },
        });
      const candidacyWhereClause = {
        ...queryWhereClause?.candidacy,
        ...getJuryListQueryWhereClauseForUserWithManageRole({
          certificationAuthorityId: null,
          isCertificationAuthorityLocalAccount: true,
          certificationAuthorityLocalAccount,
        }).candidacy,
      };

      queryWhereClause = {
        ...queryWhereClause,
        ...getJuryListQueryWhereClauseForUserWithManageRole({
          certificationAuthorityId: null,
          isCertificationAuthorityLocalAccount: true,
          certificationAuthorityLocalAccount,
        }),
        candidacy: candidacyWhereClause,
      };
    } else {
      const isCertificationAuthorityLocalAccount = !hasRole(
        "manage_certification_authority_local_account",
      );

      const certificationAuthorityLocalAccount =
        isCertificationAuthorityLocalAccount
          ? await getCertificationAuthorityLocalAccountByAccountId({
              accountId: account.id,
            })
          : null;

      const candidacyWhereClause = {
        ...queryWhereClause?.candidacy,
        ...getJuryListQueryWhereClauseForUserWithManageRole({
          certificationAuthorityId: accountCertificationAuthorityId,
          isCertificationAuthorityLocalAccount,
          certificationAuthorityLocalAccount,
        }).candidacy,
      };

      queryWhereClause = {
        ...queryWhereClause,
        ...getJuryListQueryWhereClauseForUserWithManageRole({
          certificationAuthorityId: accountCertificationAuthorityId,
          isCertificationAuthorityLocalAccount,
          certificationAuthorityLocalAccount,
        }),
        candidacy: candidacyWhereClause,
      };
    }
  } else if (
    hasRole("admin") &&
    (certificationAuthorityId || certificationAuthorityLocalAccountId)
  ) {
    if (certificationAuthorityId) {
      const certificationAuthorityOnAccount =
        await prismaClient.certificationAuthorityOnAccount.findFirst({
          where: { certificationAuthorityId },
        });

      if (certificationAuthorityOnAccount) {
        const candidacyWhereClause = {
          ...queryWhereClause?.candidacy,
          ...getJuryListQueryWhereClauseForUserWithManageRole({
            certificationAuthorityId,
            isCertificationAuthorityLocalAccount: false,
            certificationAuthorityLocalAccount: null,
          }).candidacy,
        };

        queryWhereClause = {
          ...queryWhereClause,
          ...getJuryListQueryWhereClauseForUserWithManageRole({
            certificationAuthorityId,
            isCertificationAuthorityLocalAccount: false,
            certificationAuthorityLocalAccount: null,
          }),
          candidacy: candidacyWhereClause,
        };
      }
    } else if (certificationAuthorityLocalAccountId) {
      const certificationAuthorityLocalAccount =
        await prismaClient.certificationAuthorityLocalAccount.findUnique({
          where: { id: certificationAuthorityLocalAccountId },
          include: {
            certificationAuthorityLocalAccountOnDepartment: true,
            certificationAuthorityLocalAccountOnCertification: true,
          },
        });

      const candidacyWhereClause = {
        ...queryWhereClause?.candidacy,
        ...getJuryListQueryWhereClauseForUserWithManageRole({
          certificationAuthorityId: null,
          isCertificationAuthorityLocalAccount: true,
          certificationAuthorityLocalAccount,
        }).candidacy,
      };

      queryWhereClause = {
        ...queryWhereClause,
        ...getJuryListQueryWhereClauseForUserWithManageRole({
          certificationAuthorityId: null,
          isCertificationAuthorityLocalAccount: true,
          certificationAuthorityLocalAccount,
        }),
        candidacy: candidacyWhereClause,
      };
    }
  }

  if (searchFilter && searchFilter.length > 0) {
    const candidacyClause: Prisma.CandidacyWhereInput =
      queryWhereClause?.candidacy || ({} as const);
    queryWhereClause = {
      ...queryWhereClause,
      candidacy: {
        ...candidacyClause,
        ...getWhereClauseFromSearchFilter(candidacySearchWord, searchFilter),
      },
    };
  }

  const rows = await prismaClient.jury.findMany({
    where: queryWhereClause,
    skip: offset,
    take: limit,
    orderBy: [{ createdAt: "desc" }],
  });

  const totalRows = await prismaClient.jury.count({
    where: queryWhereClause,
  });

  const page = {
    rows,
    info: processPaginationInfo({
      limit: limit,
      offset: offset,
      totalRows,
    }),
  };

  return page;
};
