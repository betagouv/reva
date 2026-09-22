import { prismaClient } from "@/prisma/client";

export const createCohorteVaeCollective = async ({
  commanditaireVaeCollectiveId,
  nomCohorteVaeCollective,
  userKeycloakId,
  userKeycloakRoles,
}: {
  commanditaireVaeCollectiveId: string;
  nomCohorteVaeCollective: string;
  userKeycloakId: string;
  userKeycloakRoles: KeyCloakUserRole[];
}) => {
  const isSoucCompteVaeCollective = userKeycloakRoles.includes(
    "sous_compte_vae_collective",
  );

  let sousCompteVaeCollectiveId: string | undefined;
  if (isSoucCompteVaeCollective) {
    const sousCompteVaeCollective =
      await prismaClient.sousCompteVaeCollective.findFirst({
        where: { account: { keycloakId: userKeycloakId } },
      });
    if (!sousCompteVaeCollective) {
      throw new Error("Sous-compte non trouvé");
    }
    sousCompteVaeCollectiveId = sousCompteVaeCollective.id;
  }

  const cohorte = await prismaClient.cohorteVaeCollective.create({
    data: {
      nom: nomCohorteVaeCollective,
      commanditaireVaeCollectiveId: commanditaireVaeCollectiveId,
    },
  });

  // Si le user est un sous-compte, on lui donne les droits d'édition de la cohorte qu'il a créé
  if (sousCompteVaeCollectiveId) {
    await prismaClient.roleSpecificToSousCompteAndCohorteVaeCollective.create({
      data: {
        sousCompteVaeCollectiveId: sousCompteVaeCollectiveId,
        cohorteVaeCollectiveId: cohorte.id,
        role: "EDITEUR_COHORTE",
      },
    });
  }

  return cohorte;
};
