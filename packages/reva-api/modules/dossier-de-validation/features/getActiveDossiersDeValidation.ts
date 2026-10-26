import { DossierDeValidation, Prisma } from "@prisma/client";

import { candidacySearchWord } from "@/modules/candidacy/utils/candidacy.helper";
import { getCertificationAuthorityIdForAccount } from "@/modules/certification-authority/features/getCertificationAuthorityIdForAccount";
import { getCertificationAuthorityLocalAccountByAccountId } from "@/modules/certification-authority/features/getCertificationAuthorityLocalAccountByAccountId";
import { processPaginationInfo } from "@/modules/shared/list/pagination";
import { getWhereClauseFromSearchFilter } from "@/modules/shared/search/search";
import { NOT_AUTHORIZED } from "@/modules/shared/security/messages";
import { prismaClient } from "@/prisma/client";

import { DossierDeValidationStatusFilter } from "../types/dossierDeValidationStatusFilter.type";
import { getWhereClauseFromDossierDeValidationStatusFilter } from "../utils/getWhereClauseFromDossierDeValidationStatusFilter.helper";

import { getDossierDeValidationListQueryWhereClauseForUserWithManageRole } from "./getDossierDeValidationListQueryWhereClauseForUserWithManageRole";

export const getActiveDossiersDeValidation = async ({
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
  categoryFilter?: DossierDeValidationStatusFilter;
  searchFilter?: string;
  certificationAuthorityId?: string;
  certificationAuthorityLocalAccountId?: string;
}): Promise<PaginatedListResult<DossierDeValidation>> => {
  let queryWhereClause: Prisma.DossierDeValidationWhereInput = {
    isActive: true,
    ...getWhereClauseFromDossierDeValidationStatusFilter(categoryFilter),
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
        ...getDossierDeValidationListQueryWhereClauseForUserWithManageRole({
          certificationAuthorityId: null,
          isCertificationAuthorityLocalAccount: true,
          certificationAuthorityLocalAccount,
        }).candidacy,
      };

      queryWhereClause = {
        ...queryWhereClause,
        ...getDossierDeValidationListQueryWhereClauseForUserWithManageRole({
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
        ...getDossierDeValidationListQueryWhereClauseForUserWithManageRole({
          certificationAuthorityId: accountCertificationAuthorityId,
          isCertificationAuthorityLocalAccount,
          certificationAuthorityLocalAccount,
        }).candidacy,
      };

      queryWhereClause = {
        ...queryWhereClause,
        ...getDossierDeValidationListQueryWhereClauseForUserWithManageRole({
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
          ...getDossierDeValidationListQueryWhereClauseForUserWithManageRole({
            certificationAuthorityId,
            isCertificationAuthorityLocalAccount: false,
            certificationAuthorityLocalAccount: null,
          }).candidacy,
        };

        queryWhereClause = {
          ...queryWhereClause,
          ...getDossierDeValidationListQueryWhereClauseForUserWithManageRole({
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
        ...getDossierDeValidationListQueryWhereClauseForUserWithManageRole({
          certificationAuthorityId: null,
          isCertificationAuthorityLocalAccount: true,
          certificationAuthorityLocalAccount,
        }).candidacy,
      };

      queryWhereClause = {
        ...queryWhereClause,
        ...getDossierDeValidationListQueryWhereClauseForUserWithManageRole({
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

  const rows = await prismaClient.dossierDeValidation.findMany({
    where: queryWhereClause,
    skip: offset,
    take: limit,
    orderBy: [{ createdAt: "desc" }],
  });

  const totalRows = await prismaClient.dossierDeValidation.count({
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
