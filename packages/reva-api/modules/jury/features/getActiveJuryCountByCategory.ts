import { Prisma } from "@prisma/client";

import { getAccountByKeycloakId } from "@/modules/account/features/getAccountByKeycloakId";
import { candidacySearchWord } from "@/modules/candidacy/utils/candidacy.helper";
import { getCertificationAuthorityIdForAccount } from "@/modules/certification-authority/features/getCertificationAuthorityIdForAccount";
import { getCertificationAuthorityLocalAccountByAccountId } from "@/modules/certification-authority/features/getCertificationAuthorityLocalAccountByAccountId";
import { getWhereClauseFromSearchFilter } from "@/modules/shared/search/search";
import { NOT_AUTHORIZED } from "@/modules/shared/security/messages";
import { prismaClient } from "@/prisma/client";

import { JuryStatusFilter } from "../types/juryStatusFilter.type";
import { getWhereClauseFromJuryStatusFilter } from "../utils/getWhereClauseFromJuryStatusFilter.helper";

import { getJuryListQueryWhereClauseForUserWithManageRole } from "./getJuryListQueryWhereClauseForUserWithManageRole";

export const getActiveJuryCountByCategory = async ({
  keycloakId,
  hasRole,
  searchFilter,
  certificationAuthorityId,
  certificationAuthorityLocalAccountId,
}: {
  keycloakId: string;
  hasRole: (role: string) => boolean;
  searchFilter?: string;
  certificationAuthorityId?: string;
  certificationAuthorityLocalAccountId?: string;
}) => {
  const JuryCountByCategory: Record<JuryStatusFilter, number> = {
    ALL: 0,
    SCHEDULED: 0,
    PASSED: 0,
  };

  const account = await getAccountByKeycloakId({ keycloakId });
  const isCertificationAuthorityLocalAccount =
    !hasRole("admin") &&
    !hasRole("manage_certification_authority_local_account");

  let certificationAuthorityLocalAccount =
    isCertificationAuthorityLocalAccount && account
      ? await getCertificationAuthorityLocalAccountByAccountId({
          accountId: account.id,
        })
      : null;

  const accountCertificationAuthorityId = account
    ? await getCertificationAuthorityIdForAccount(account.id)
    : undefined;

  let adminFilterCertificationAuthorityId: string | null = null;

  if (hasRole("admin")) {
    if (certificationAuthorityId) {
      const certificationAuthorityOnAccount =
        await prismaClient.certificationAuthorityOnAccount.findFirst({
          where: { certificationAuthorityId },
        });

      if (certificationAuthorityOnAccount) {
        adminFilterCertificationAuthorityId = certificationAuthorityId;
      }
    } else if (certificationAuthorityLocalAccountId) {
      certificationAuthorityLocalAccount =
        await prismaClient.certificationAuthorityLocalAccount.findUnique({
          where: { id: certificationAuthorityLocalAccountId },
          include: {
            certificationAuthorityLocalAccountOnDepartment: true,
            certificationAuthorityLocalAccountOnCertification: true,
          },
        });
    }
  } else if (
    hasRole("manage_certification_authority_local_account") &&
    certificationAuthorityLocalAccountId
  ) {
    if (!accountCertificationAuthorityId) {
      throw new Error(NOT_AUTHORIZED);
    }

    certificationAuthorityLocalAccount =
      await prismaClient.certificationAuthorityLocalAccount.findUnique({
        where: {
          id: certificationAuthorityLocalAccountId,
          certificationAuthorityId: accountCertificationAuthorityId,
        },
        include: {
          certificationAuthorityLocalAccountOnDepartment: true,
          certificationAuthorityLocalAccountOnCertification: true,
        },
      });
  }

  await Promise.all(
    (Object.keys(JuryCountByCategory) as JuryStatusFilter[]).map(
      async (statusFilter) => {
        try {
          const value: number = await new Promise((resolve, reject) => {
            {
              let whereClause: Prisma.JuryWhereInput = {};

              if (!hasRole("admin") && hasRole("manage_feasibility")) {
                if (
                  hasRole("manage_certification_authority_local_account") &&
                  certificationAuthorityLocalAccountId
                ) {
                  whereClause = {
                    ...whereClause,
                    ...getJuryListQueryWhereClauseForUserWithManageRole({
                      certificationAuthorityId: null,
                      isCertificationAuthorityLocalAccount: true,
                      certificationAuthorityLocalAccount,
                    }),
                  };
                } else {
                  whereClause = {
                    ...whereClause,
                    ...getJuryListQueryWhereClauseForUserWithManageRole({
                      certificationAuthorityId: accountCertificationAuthorityId,
                      isCertificationAuthorityLocalAccount,
                      certificationAuthorityLocalAccount,
                    }),
                  };
                }
              } else if (
                hasRole("admin") &&
                (adminFilterCertificationAuthorityId ||
                  certificationAuthorityLocalAccount)
              ) {
                if (adminFilterCertificationAuthorityId) {
                  whereClause = {
                    ...whereClause,
                    ...getJuryListQueryWhereClauseForUserWithManageRole({
                      certificationAuthorityId:
                        adminFilterCertificationAuthorityId,
                      isCertificationAuthorityLocalAccount: false,
                      certificationAuthorityLocalAccount: null,
                    }),
                  };
                } else if (certificationAuthorityLocalAccount) {
                  whereClause = {
                    ...whereClause,
                    ...getJuryListQueryWhereClauseForUserWithManageRole({
                      certificationAuthorityId: null,
                      isCertificationAuthorityLocalAccount: true,
                      certificationAuthorityLocalAccount,
                    }),
                  };
                }
              }

              let candidacyClause: Prisma.CandidacyWhereInput =
                whereClause?.candidacy || {};
              candidacyClause = {
                ...candidacyClause,
                ...getWhereClauseFromJuryStatusFilter(statusFilter).candidacy,
                ...getWhereClauseFromSearchFilter(
                  candidacySearchWord,
                  searchFilter,
                ),
              };
              whereClause = {
                ...whereClause,
                ...getWhereClauseFromJuryStatusFilter(statusFilter),
                candidacy: candidacyClause,
              };

              prismaClient.jury
                .count({
                  where: whereClause,
                })
                .then((value) => {
                  resolve(value);
                })
                .catch(() => {
                  reject();
                });
            }
          });

          JuryCountByCategory[statusFilter] = value;
        } catch (e) {
          console.error(e);
        }
      },
    ),
  );

  return JuryCountByCategory;
};
