import { deleteAccount } from "@/modules/account/features/deleteAccount";
import { prismaClient } from "@/prisma/client";

export const deleteCertificationAuthorityLocalAccount = async ({
  certificationAuthorityLocalAccountId,
}: {
  certificationAuthorityLocalAccountId: string;
}) => {
  const certificationAuthorityLocalAccount =
    await prismaClient.certificationAuthorityLocalAccount.findUnique({
      where: { id: certificationAuthorityLocalAccountId },
      include: {
        certificationAuthorityLocalAccountOnAccount: {
          include: { account: true },
        },
      },
    });

  if (!certificationAuthorityLocalAccount) {
    throw new Error("Le compte certificateur local n'a pas été trouvé");
  }

  for (const {
    account,
  } of certificationAuthorityLocalAccount.certificationAuthorityLocalAccountOnAccount) {
    await deleteAccount({ accountId: account.id });
  }

  return prismaClient.certificationAuthorityLocalAccount.delete({
    where: { id: certificationAuthorityLocalAccountId },
  });
};
