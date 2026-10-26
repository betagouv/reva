import { Prisma } from "@prisma/client";

import { prismaClient } from "@/prisma/client";

import { createAccountHelper } from "./create-account-helper";

export const createCertificationAuthorityOnAccountHelper = async (
  args: Partial<Prisma.CertificationAuthorityOnAccountUncheckedCreateInput> & {
    certificationAuthorityId: string;
    accountId?: string;
  },
) => {
  const { accountId: existingAccountId, ...calaArgs } = args;

  const account = existingAccountId
    ? await prismaClient.account.findUniqueOrThrow({
        where: { id: existingAccountId },
      })
    : await createAccountHelper();

  const certificationAuthorityOnAccount =
    await prismaClient.certificationAuthorityOnAccount.create({
      data: {
        accountId: account.id,
        ...calaArgs,
      },
    });

  return { ...certificationAuthorityOnAccount, account };
};
