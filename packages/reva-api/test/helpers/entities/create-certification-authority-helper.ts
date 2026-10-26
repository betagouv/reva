import { faker } from "@faker-js/faker";
import { Prisma } from "@prisma/client";

import { prismaClient } from "@/prisma/client";

import { createAccountHelper } from "./create-account-helper";
import { createCertificationAuthorityStructureHelper } from "./create-certification-authority-structure-helper";

export const createCertificationAuthorityHelper = async (
  args?: Partial<Prisma.CertificationAuthorityCreateInput>,
) => {
  const certificationAuthorityStructure =
    await createCertificationAuthorityStructureHelper();
  const account = await createAccountHelper();

  const certificationAuthority =
    await prismaClient.certificationAuthority.create({
      data: {
        contactEmail: faker.internet.email(),
        contactFullName: faker.person.fullName(),
        label: faker.company.name(),
        certificationAuthorityOnCertificationAuthorityStructure: {
          create: {
            certificationAuthorityStructureId:
              certificationAuthorityStructure.id,
          },
        },
        ...args,
        certificationAuthorityOnAccounts: {
          create: { accountId: account.id },
        },
      },
      include: {
        certificationAuthorityOnCertificationAuthorityStructure: {
          include: { certificationAuthorityStructure: true },
        },
      },
    });

  return { ...certificationAuthority, account };
};
