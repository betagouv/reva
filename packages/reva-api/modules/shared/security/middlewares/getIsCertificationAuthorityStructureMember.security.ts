import { IFieldResolver, MercuriusContext } from "mercurius";

import { NOT_AUTHORIZED_STRUCTURE_ACCESS } from "@/modules/shared/security/messages";
import { prismaClient } from "@/prisma/client";

export const getIsCertificationAuthorityStructureMember =
  (next: IFieldResolver<unknown>) =>
  async (
    root: any,
    args: Record<string, any>,
    context: MercuriusContext,
    info: any,
  ) => {
    const userKeycloakId = context.auth?.userInfo?.sub;

    const targetCertificationAuthorityStructureId =
      args.certificationAuthorityStructureId ||
      args.data?.certificationAuthorityStructureId ||
      root.certificationAuthorityStructureId ||
      root.id;

    const userAccount = await prismaClient.account.findUnique({
      where: {
        keycloakId: userKeycloakId,
      },
      select: {
        certificationAuthorityOnAccount: {
          select: {
            certificationAuthority: {
              select: {
                certificationAuthorityOnCertificationAuthorityStructure: {
                  select: {
                    certificationAuthorityStructureId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!userAccount) {
      throw new Error(NOT_AUTHORIZED_STRUCTURE_ACCESS);
    }

    const targetCertificationAuthority =
      await prismaClient.certificationAuthorityStructure.findUnique({
        where: {
          id: targetCertificationAuthorityStructureId,
        },
      });

    if (!targetCertificationAuthority) {
      throw new Error(NOT_AUTHORIZED_STRUCTURE_ACCESS);
    }

    const certificationAuthorityStructureIds =
      userAccount?.certificationAuthorityOnAccount?.certificationAuthority?.certificationAuthorityOnCertificationAuthorityStructure?.map(
        (caocas) => caocas.certificationAuthorityStructureId,
      ) || [];

    const hasMatchingAuthorityStructure =
      certificationAuthorityStructureIds.includes(
        targetCertificationAuthority.id,
      );

    if (!hasMatchingAuthorityStructure) {
      throw new Error(NOT_AUTHORIZED_STRUCTURE_ACCESS);
    }

    return next(root, args, context, info);
  };
