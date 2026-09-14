import { Prisma } from "@prisma/client";

import {
  CANDIDATURE_NON_TROUVEE,
  CANDIDATURE_PAS_ASSOCIEE_CERTIFICATION,
  CANDIDATURE_PAS_DOSSIER_FAISABILITE_COURS,
  CANDIDAT_ASSOCIE_CANDIDATURE_PAS_RATTACHE_DEPARTEMENT,
  DOSSIER_FAISABILITE_PAS_RELIE_AUTORITE_CERTIFICATION,
} from "@/modules/shared/errors/messages";
import { processPaginationInfo } from "@/modules/shared/list/pagination";
import { prismaClient } from "@/prisma/client";

export const getCertificationAuthorityLocalAccountsToTransferCandidacy =
  async ({
    candidacyId,
    offset = 0,
    limit = 10,
    searchFilter,
    keycloakId,
  }: {
    candidacyId: string;
    offset?: number;
    limit?: number;
    searchFilter?: string;
    keycloakId?: string;
  }) => {
    const candidacy = await prismaClient.candidacy.findUnique({
      where: {
        id: candidacyId,
      },
      include: {
        candidate: true,
        Feasibility: {
          where: { isActive: true },
        },
      },
    });

    if (!candidacy) {
      throw new Error(CANDIDATURE_NON_TROUVEE);
    }

    if (!candidacy.candidate?.departmentId) {
      throw new Error(CANDIDAT_ASSOCIE_CANDIDATURE_PAS_RATTACHE_DEPARTEMENT);
    }

    if (!candidacy.certificationId) {
      throw new Error(CANDIDATURE_PAS_ASSOCIEE_CERTIFICATION);
    }

    const feasibility = candidacy.Feasibility[0];

    if (!feasibility) {
      throw new Error(CANDIDATURE_PAS_DOSSIER_FAISABILITE_COURS);
    }

    if (!feasibility.certificationAuthorityId) {
      throw new Error(DOSSIER_FAISABILITE_PAS_RELIE_AUTORITE_CERTIFICATION);
    }

    let certificationAuthorityIds = [feasibility.certificationAuthorityId];

    const certificationAuthorityStructureRelation =
      await prismaClient.certificationAuthorityOnCertificationAuthorityStructure.findFirst(
        {
          where: {
            certificationAuthorityId: feasibility.certificationAuthorityId,
          },
        },
      );

    if (certificationAuthorityStructureRelation) {
      const certificationAuthorities =
        await prismaClient.certificationAuthorityOnCertificationAuthorityStructure.findMany(
          {
            where: {
              certificationAuthorityStructureId:
                certificationAuthorityStructureRelation.certificationAuthorityStructureId,
            },
          },
        );

      certificationAuthorityIds = certificationAuthorities.map(
        ({ certificationAuthorityId }) => certificationAuthorityId,
      );
    }

    const whereClause: Prisma.CertificationAuthorityLocalAccountWhereInput = {
      certificationAuthorityId: { in: certificationAuthorityIds },

      certificationAuthorityLocalAccountOnAccount: {
        some: {
          account: {
            keycloakId: { not: keycloakId },
            isApiUser: false,
            OR: [
              {
                firstname: {
                  contains: searchFilter,
                  mode: "insensitive",
                },
              },
              {
                lastname: {
                  contains: searchFilter,
                  mode: "insensitive",
                },
              },
              {
                email: {
                  contains: searchFilter,
                  mode: "insensitive",
                },
              },
            ],
          },
        },
      },
    };

    const certificationAuthorityLocalAccountsCount =
      await prismaClient.certificationAuthorityLocalAccount.count({
        where: whereClause,
      });

    const certificationAuthorityLocalAccounts =
      await prismaClient.certificationAuthorityLocalAccount.findMany({
        where: whereClause,
        skip: offset,
        take: limit,
      });

    return {
      rows: certificationAuthorityLocalAccounts,
      info: processPaginationInfo({
        totalRows: certificationAuthorityLocalAccountsCount,
        limit,
        offset,
      }),
    };
  };
