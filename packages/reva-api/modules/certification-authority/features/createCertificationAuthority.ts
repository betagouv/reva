import { createAccount } from "@/modules/account/features/createAccount";
import { prismaClient } from "@/prisma/client";

export const createCertificationAuthority = async ({
  label,
  accountFirstname,
  accountLastname,
  accountEmail,
  certificationAuthorityStructureId,
  certificationIds,
}: {
  label: string;
  accountFirstname: string;
  accountLastname: string;
  accountEmail: string;
  certificationAuthorityStructureId: string;
  certificationIds: string[];
}) => {
  const existingAccount = await prismaClient.account.findUnique({
    where: {
      email: accountEmail,
    },
  });
  if (existingAccount) {
    throw new Error("Adresse email déjà utilisée pour un autre compte");
  }

  const allDepartements = await prismaClient.department.findMany({
    select: { id: true },
  });

  const newCertificationAuthority =
    await prismaClient.certificationAuthority.create({
      data: {
        certificationAuthorityOnCertification: {
          createMany: {
            data: certificationIds.map((certificationId) => ({
              certificationId,
            })),
          },
        },
        certificationAuthorityOnDepartment: {
          createMany: {
            data: allDepartements.map((d) => ({
              departmentId: d.id,
            })),
          },
        },
        certificationAuthorityOnCertificationAuthorityStructure: {
          create: {
            certificationAuthorityStructureId:
              certificationAuthorityStructureId,
          },
        },
        label,
      },
    });

  const account = await createAccount({
    firstname: accountFirstname,
    lastname: accountLastname,
    email: accountEmail,
    username: accountEmail,
    group: "certification_authority",
    certificationAuthorityId: newCertificationAuthority.id,
  });

  if (!account) {
    // Rollback if account creation fails
    await prismaClient.certificationAuthority.delete({
      where: {
        id: newCertificationAuthority.id,
      },
    });

    throw new Error("Erreur pendant la création du compte certificateur");
  }

  return newCertificationAuthority;
};
