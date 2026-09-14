import { Prisma } from "@prisma/client";

import { prismaClient } from "@/prisma/client";

import { createAccountHelper } from "./create-account-helper";
import { createCertificationAuthorityHelper } from "./create-certification-authority-helper";

export const createCertificationAuthorityLocalAccountHelper = async (
  args?: Partial<Prisma.CertificationAuthorityLocalAccountUncheckedCreateInput> & {
    accountId?: string;
  },
) => {
  const { accountId: existingAccountId, ...calaArgs } = args ?? {};
  const certificationAuthority = await createCertificationAuthorityHelper();

  const localAccount =
    await prismaClient.certificationAuthorityLocalAccount.create({
      data: {
        certificationAuthorityId: certificationAuthority.id,
        ...calaArgs,
      },
      include: {
        certificationAuthority: {
          include: {
            Account: true,
            certificationAuthorityOnCertificationAuthorityStructure: {
              include: {
                certificationAuthorityStructure: {
                  include: { certifications: true },
                },
              },
            },
          },
        },
      },
    });

  const account = existingAccountId
    ? await prismaClient.account.findUniqueOrThrow({
        where: { id: existingAccountId },
      })
    : await createAccountHelper();

  await prismaClient.certificationAuthorityLocalAccountOnAccount.create({
    data: {
      accountId: account.id,
      certificationAuthorityLocalAccountId: localAccount.id,
    },
  });

  return {
    ...localAccount,
    Account: [account],
    account,
  };
};
