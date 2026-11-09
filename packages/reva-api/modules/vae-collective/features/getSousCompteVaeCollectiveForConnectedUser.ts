import { prismaClient } from "@/prisma/client";

export const getSousCompteVaeCollectiveForConnectedUser = async ({
  keycloakId,
}: {
  keycloakId: string;
}) => {
  const sousCompteVaeCollective =
    await prismaClient.sousCompteVaeCollective.findFirst({
      where: {
        account: {
          keycloakId: keycloakId,
        },
      },
    });

  return sousCompteVaeCollective;
};
