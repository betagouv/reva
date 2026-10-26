import { prismaClient } from "@/prisma/client";

export const loaders = {
  Account: {
    certificationAuthority: async (queries: { obj: { id: string } }[]) => {
      const accountIds = queries.map(({ obj }) => obj.id);

      const certificationAuthorityOnAccounts =
        await prismaClient.certificationAuthorityOnAccount.findMany({
          where: { accountId: { in: accountIds } },
          include: { certificationAuthority: true },
        });

      return accountIds.map(
        (accountId) =>
          certificationAuthorityOnAccounts.find(
            (c) => c.accountId === accountId,
          )?.certificationAuthority,
      );
    },
  },
};
