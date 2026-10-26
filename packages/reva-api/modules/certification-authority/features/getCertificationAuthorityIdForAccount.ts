import { prismaClient } from "@/prisma/client";

export const getCertificationAuthorityIdForAccount = async (
  accountId: string,
) =>
  prismaClient.account
    .findUnique({ where: { id: accountId } })
    .certificationAuthorityOnAccount()
    .then(
      (certificationAuthorityOnAccount) =>
        certificationAuthorityOnAccount?.certificationAuthorityId,
    );
