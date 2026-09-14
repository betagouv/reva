import { prismaClient } from "@/prisma/client";

export const getHumanAccountByCertificationAuthorityLocalAccountId = async ({
  certificationAuthorityLocalAccountId,
}: {
  certificationAuthorityLocalAccountId: string;
}) =>
  prismaClient.account.findFirst({
    where: {
      certificationAuthorityLocalAccountOnAccount: {
        certificationAuthorityLocalAccountId,
      },
      isApiUser: false,
    },
  });
