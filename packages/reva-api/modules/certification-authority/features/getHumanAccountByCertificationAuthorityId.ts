import { prismaClient } from "@/prisma/client";

export const getHumanAccountByCertificationAuthorityId = async ({
  certificationAuthorityId,
}: {
  certificationAuthorityId: string;
}) =>
  prismaClient.account.findFirst({
    where: {
      certificationAuthorityOnAccount: { certificationAuthorityId },
      isApiUser: false,
    },
  });
