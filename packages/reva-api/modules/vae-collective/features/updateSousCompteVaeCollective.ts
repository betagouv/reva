import { prismaClient } from "@/prisma/client";

export const updateSousCompteVaeCollective = async ({
  sousCompteVaeCollectiveId,
  canCreateCohorteVaeCollective,
}: {
  sousCompteVaeCollectiveId: string;
  canCreateCohorteVaeCollective: boolean;
}) => {
  const sousCompteVaeCollective =
    await prismaClient.sousCompteVaeCollective.findUnique({
      where: { id: sousCompteVaeCollectiveId },
    });

  if (!sousCompteVaeCollective) {
    throw new Error("Sous-compte non trouvé");
  }

  if (canCreateCohorteVaeCollective) {
    await prismaClient.roleSpecificToSousCompteVaeCollective.upsert({
      where: {
        role_sousCompteVaeCollectiveId: {
          role: "CREATEUR_COHORTE",
          sousCompteVaeCollectiveId,
        },
      },
      create: { sousCompteVaeCollectiveId, role: "CREATEUR_COHORTE" },
      update: {},
    });
  } else {
    await prismaClient.roleSpecificToSousCompteVaeCollective.deleteMany({
      where: { sousCompteVaeCollectiveId, role: "CREATEUR_COHORTE" },
    });
  }

  return sousCompteVaeCollective;
};
