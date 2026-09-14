import { IFieldResolver, MercuriusContext } from "mercurius";

import { NOT_AUTHORIZED_STRUCTURE_ACCESS } from "@/modules/shared/security/messages";
import { prismaClient } from "@/prisma/client";

// Une autorité de certification peut être rattachée à plusieurs structures
const toStructureIds = (
  relations: { certificationAuthorityStructureId: string }[] = [],
) =>
  relations.map(
    ({ certificationAuthorityStructureId }) =>
      certificationAuthorityStructureId,
  );

/**
 * Middleware de sécurité qui vérifie si l'utilisateur est soit un certificateur
 * soit un compte local membre de la structure de certification ciblée.
 */
export const getIsCertificationAuthorityAccountOrLocalAccountStructureMember =
  (next: IFieldResolver<unknown>) =>
  async (
    root: any,
    args: Record<string, any>,
    context: MercuriusContext,
    info: any,
  ) => {
    const userKeycloakId = context.auth?.userInfo?.sub;

    const targetEntityId =
      args.certificationAuthorityId ||
      args.data?.certificationAuthorityId ||
      root.certificationAuthorityId ||
      root.id ||
      args.certificationAuthorityStructureId ||
      args.data?.certificationAuthorityStructureId ||
      root.certificationAuthorityStructureId;

    let userAccount;
    let userCertificationAuthorityId;
    let userAccountAuthorityStructureIds: string[] = [];

    // Certificateur - Certification Authority
    if (context.auth?.hasRole("manage_certification_authority_local_account")) {
      userAccount = await prismaClient.account.findUnique({
        where: {
          keycloakId: userKeycloakId,
        },
        select: {
          certificationAuthority: {
            select: {
              id: true,
              certificationAuthorityOnCertificationAuthorityStructure: {
                select: { certificationAuthorityStructureId: true },
              },
            },
          },
        },
      });

      userAccountAuthorityStructureIds = toStructureIds(
        userAccount?.certificationAuthority
          ?.certificationAuthorityOnCertificationAuthorityStructure,
      );

      userCertificationAuthorityId = userAccount?.certificationAuthority?.id;
    } else {
      // Compte local - Certification Authority Local Account
      userAccount = await prismaClient.account.findUnique({
        where: {
          keycloakId: userKeycloakId,
        },
        select: {
          certificationAuthorityLocalAccountOnAccount: {
            select: {
              certificationAuthorityLocalAccount: {
                select: {
                  certificationAuthority: {
                    select: {
                      id: true,
                      certificationAuthorityOnCertificationAuthorityStructure: {
                        select: { certificationAuthorityStructureId: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      userAccountAuthorityStructureIds = toStructureIds(
        userAccount?.certificationAuthorityLocalAccountOnAccount
          ?.certificationAuthorityLocalAccount?.certificationAuthority
          ?.certificationAuthorityOnCertificationAuthorityStructure,
      );

      userCertificationAuthorityId =
        userAccount?.certificationAuthorityLocalAccountOnAccount
          ?.certificationAuthorityLocalAccount?.certificationAuthority?.id;
    }

    if (!userAccount) {
      throw new Error(NOT_AUTHORIZED_STRUCTURE_ACCESS);
    }

    let targetCertificationAuthorityId;
    let targetCertificationAuthorityStructureIds: string[] = [];

    // Selon le chemin utilisé dans le resolver, l'ID peut pointer vers :
    // 1. Un certificateur (première tentative)
    // 2. Une structure de certification (seconde tentative)
    // Cette double vérification permet de gérer les deux cas d'utilisation
    const targetCertificationAuthority =
      await prismaClient.certificationAuthority.findUnique({
        where: {
          id: targetEntityId,
        },
        select: {
          id: true,
          certificationAuthorityOnCertificationAuthorityStructure: {
            select: { certificationAuthorityStructureId: true },
          },
        },
      });

    if (targetCertificationAuthority) {
      targetCertificationAuthorityId = targetCertificationAuthority.id;
      targetCertificationAuthorityStructureIds = toStructureIds(
        targetCertificationAuthority.certificationAuthorityOnCertificationAuthorityStructure,
      );
    } else {
      // Try to find as a structure
      const targetStructure =
        await prismaClient.certificationAuthorityStructure.findUnique({
          where: { id: targetEntityId },
          select: {
            id: true,
            certificationAuthorityOnCertificationAuthorityStructure: {
              select: { certificationAuthorityId: true },
            },
          },
        });

      if (targetStructure) {
        targetCertificationAuthorityStructureIds = [targetStructure.id];
        // Check if the structure is linked to the user's certification authority
        const structureLinkedToUserAuthority =
          targetStructure.certificationAuthorityOnCertificationAuthorityStructure.some(
            (link) =>
              link.certificationAuthorityId === userCertificationAuthorityId,
          );

        if (structureLinkedToUserAuthority) {
          return next(root, args, context, info);
        }
      }
    }

    if (
      !targetCertificationAuthority &&
      !targetCertificationAuthorityStructureIds.length
    ) {
      throw new Error(NOT_AUTHORIZED_STRUCTURE_ACCESS);
    }

    const hasMatchingAuthorityStructure =
      targetCertificationAuthorityStructureIds.some((structureId) =>
        userAccountAuthorityStructureIds.includes(structureId),
      );

    const hasMatchingCertificationAuthority =
      userCertificationAuthorityId === targetCertificationAuthorityId;

    if (!hasMatchingAuthorityStructure && !hasMatchingCertificationAuthority) {
      throw new Error(NOT_AUTHORIZED_STRUCTURE_ACCESS);
    }

    return next(root, args, context, info);
  };
