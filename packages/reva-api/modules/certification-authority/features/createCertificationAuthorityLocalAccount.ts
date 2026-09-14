import { createAccount } from "@/modules/account/features/createAccount";
import { FunctionalError } from "@/modules/shared/error/functionalError";
import { prismaClient } from "@/prisma/client";

import { CreateCertificationAuthorityLocalAccountInput } from "../certification-authority.types";

import { assignCandidaciesToCertificationAuthorityLocalAccount } from "./assignCandidaciesToCertificationAuthorityLocalAccount";

export const createCertificationAuthorityLocalAccount = async ({
  certificationAuthorityId,
  accountFirstname,
  accountLastname,
  accountEmail,
  departmentIds,
  certificationIds,
  contactFullName,
  contactEmail,
  contactPhone,
}: CreateCertificationAuthorityLocalAccountInput) => {
  const certificationAuthority =
    await prismaClient.certificationAuthority.findUnique({
      where: {
        id: certificationAuthorityId,
      },
    });

  if (!certificationAuthority) {
    throw new Error(
      "Erreur pendant la récupération de l'autorité de certification",
    );
  }

  const createdCertificationAuthorityLocalAccount =
    await prismaClient.certificationAuthorityLocalAccount.create({
      data: {
        certificationAuthorityId: certificationAuthority.id,
        contactFullName,
        contactEmail,
        contactPhone,
        certificationAuthorityLocalAccountOnCertification: {
          createMany: {
            data: certificationIds.map((certificationId) => ({
              certificationId,
            })),
          },
        },
        certificationAuthorityLocalAccountOnDepartment: {
          createMany: {
            data: departmentIds.map((departmentId) => ({ departmentId })),
          },
        },
      },
    });

  try {
    const account = await createAccount({
      firstname: accountFirstname,
      lastname: accountLastname,
      email: accountEmail,
      username: accountEmail,
      group: "certification_authority_local_account",
      certificationAuthorityLocalAccountId:
        createdCertificationAuthorityLocalAccount.id,
    });

    if (!account) {
      throw new Error(
        "Erreur pendant la création du compte certificateur local",
      );
    }
  } catch (error) {
    await prismaClient.account.deleteMany({
      where: {
        certificationAuthorityLocalAccountOnAccount: {
          certificationAuthorityLocalAccountId:
            createdCertificationAuthorityLocalAccount.id,
        },
      },
    });
    await prismaClient.certificationAuthorityLocalAccount.delete({
      where: { id: createdCertificationAuthorityLocalAccount.id },
    });

    const errorMessage = (error as FunctionalError).message;
    if (errorMessage) {
      throw new Error(errorMessage);
    }
    throw error;
  }

  // assign candidacies to created certification authority local account
  await assignCandidaciesToCertificationAuthorityLocalAccount({
    certificationAuthorityLocalAccountId:
      createdCertificationAuthorityLocalAccount.id,
  });

  return createdCertificationAuthorityLocalAccount;
};
