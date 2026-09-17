import { prismaClient } from "@/prisma/client";

export const getCommanditaireVaeCollectiveForAccountId = async ({
  accountId,
}: {
  accountId: string;
}) =>
  prismaClient.commanditaireVaeCollective.findFirst({
    where: {
      OR: [
        { gestionnaireAccountId: accountId },
        {
          sousComptesVaeCollectives: {
            some: {
              accountId,
            },
          },
        },
      ],
    },
  });
