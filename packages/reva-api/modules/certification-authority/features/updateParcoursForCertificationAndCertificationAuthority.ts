import { updateCertificationsVisibility } from "@/modules/referential/features/updateCertificationsVisibility";
import { prismaClient } from "@/prisma/client";

export const updateParcoursForCertificationAndCertificationAuthority = async ({
  certificationId,
  certificationAuthorityId,
  parcoursCertificationIds,
}: {
  certificationId: string;
  certificationAuthorityId: string;
  parcoursCertificationIds: string[];
}) => {
  const certificationAuthorityOnCertification =
    await prismaClient.certificationAuthorityOnCertification.findUnique({
      where: {
        certificationAuthorityId_certificationId: {
          certificationAuthorityId,
          certificationId,
        },
      },
    });

  if (!certificationAuthorityOnCertification) {
    throw new Error("Certification authority on certification not found");
  }

  await prismaClient.$transaction(async (tx) => {
    await tx.certificationAuthorityOnCertificationOnParcoursCertification.deleteMany(
      {
        where: {
          certificationAuthorityOnCertificationId:
            certificationAuthorityOnCertification.id,
        },
      },
    );
    await tx.certificationAuthorityOnCertificationOnParcoursCertification.createMany(
      {
        data: parcoursCertificationIds.map((parcoursCertificationId) => ({
          certificationAuthorityOnCertificationId:
            certificationAuthorityOnCertification.id,
          parcoursCertificationId,
        })),
      },
    );
    await updateCertificationsVisibility([certificationId], tx);
  });

  return true;
};
