import { prismaClient } from "@/prisma/client";

export const getCohortesVaeCollectivesForConnectedCertificationAuthorityOrLocalAccount =
  async ({
    userKeycloakId,
    userRoles,
  }: {
    userKeycloakId: string;
    userRoles: KeyCloakUserRole[];
  }) => {
    //Si le certificateur est un gestionnaire de candidatures on
    //retourne toutes les cohortes de vae collectives dont au moins une candidature est associée à ce gestionnaire
    if (userRoles.includes("manage_certification_authority_local_account")) {
      const certificationAuthority =
        await prismaClient.certificationAuthority.findFirst({
          where: {
            Account: { some: { keycloakId: userKeycloakId } },
          },
        });

      if (!certificationAuthority) {
        return [];
      }
      return prismaClient.cohorteVaeCollective.findMany({
        where: {
          candidacy: {
            some: {
              Feasibility: {
                some: {
                  certificationAuthorityId: certificationAuthority.id,
                },
              },
            },
          },
        },
      });
    }

    //Si le certificateur est un compte local de certification on
    //retourne toutes les cohortes de vae collectives dont au moins une candidature est associée à ce compte local
    else if (userRoles.includes("manage_feasibility")) {
      const certificationAuthorityLocalAccount =
        await prismaClient.certificationAuthorityLocalAccount.findFirst({
          where: {
            certificationAuthorityLocalAccountOnAccount: {
              some: { account: { keycloakId: userKeycloakId } },
            },
          },
        });

      if (!certificationAuthorityLocalAccount) {
        return [];
      }
      return prismaClient.cohorteVaeCollective.findMany({
        where: {
          candidacy: {
            some: {
              certificationAuthorityLocalAccountOnCandidacy: {
                some: {
                  certificationAuthorityLocalAccountId:
                    certificationAuthorityLocalAccount.id,
                },
              },
            },
          },
        },
      });
    }

    return [];
  };
