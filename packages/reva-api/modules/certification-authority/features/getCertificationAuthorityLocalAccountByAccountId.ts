import { prismaClient } from "@/prisma/client";

export const getCertificationAuthorityLocalAccountByAccountId = async ({
  accountId,
}: {
  accountId: string;
}) => {
  const accountOnLocalAccount =
    await prismaClient.certificationAuthorityLocalAccountOnAccount.findUnique({
      where: { accountId },
      include: {
        certificationAuthorityLocalAccount: {
          include: {
            certificationAuthorityLocalAccountOnDepartment: true,
            certificationAuthorityLocalAccountOnCertification: true,
          },
        },
      },
    });

  return accountOnLocalAccount?.certificationAuthorityLocalAccount ?? null;
};
