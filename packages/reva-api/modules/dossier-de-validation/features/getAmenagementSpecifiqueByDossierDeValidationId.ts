import { prismaClient } from "@/prisma/client";

export const getAmenagementSpecifiqueByDossierDeValidationId = async ({
  dossierDeValidationId,
  candidacyId,
}: {
  dossierDeValidationId: string;
  candidacyId: string;
}) => {
  const amenagementSpecifique =
    await prismaClient.amenagementSpecifique.findUnique({
      where: { dossierDeValidationId },
    });

  if (!amenagementSpecifique) {
    return null;
  }

  return { ...amenagementSpecifique, candidacyId };
};
