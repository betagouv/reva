import { IFieldResolver, MercuriusContext } from "mercurius";

import { NOT_AUTHORIZED_RESOURCE_ACCESS } from "@/modules/shared/security/messages";
import { prismaClient } from "@/prisma/client";

export const isGestionnaireOrSousCompteOfCommanditaireVaeCollective =
  (next: IFieldResolver<unknown>) =>
  async (
    root: any,
    args: Record<string, any>,
    context: MercuriusContext,
    info: any,
  ) => {
    const userKeycloakId = context.auth?.userInfo?.sub;

    const commanditaireVaeCollectiveId =
      args.commanditaireVaeCollectiveId ||
      args.data?.commanditaireVaeCollectiveId ||
      root?.commanditaireVaeCollectiveId ||
      root?.id;

    if (!commanditaireVaeCollectiveId) {
      throw new Error(NOT_AUTHORIZED_RESOURCE_ACCESS);
    }

    const commanditaireVaeCollective =
      await prismaClient.commanditaireVaeCollective.findUnique({
        where: {
          id: commanditaireVaeCollectiveId,
          OR: [
            { gestionnaire: { keycloakId: userKeycloakId } },
            {
              sousComptesVaeCollectives: {
                some: { account: { keycloakId: userKeycloakId } },
              },
            },
          ],
        },
      });

    if (!commanditaireVaeCollective) {
      throw new Error(NOT_AUTHORIZED_RESOURCE_ACCESS);
    }

    return next(root, args, context, info);
  };
