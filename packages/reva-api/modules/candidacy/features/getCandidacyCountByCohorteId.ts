import { prismaClient } from "@/prisma/client";

export const getCandidacyCountByCohorteId = async ({
  cohorteVaeCollectiveId,
}: {
  cohorteVaeCollectiveId: string;
}) => {
  return prismaClient.candidacy.count({
    where: {
      cohorteVaeCollectiveId,
    },
  });
};
