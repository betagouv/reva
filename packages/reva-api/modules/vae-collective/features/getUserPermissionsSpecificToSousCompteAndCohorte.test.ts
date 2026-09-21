import { prismaClient } from "@/prisma/client";
import { createSousCompteVaeCollectiveHelper } from "@/test/helpers/entities/create-sous-compte-vae-collective-helper";
import { createCohorteVaeCollectiveHelper } from "@/test/helpers/entities/create-vae-collective-helper";

import { getUserPermissionsSpecificToSousCompteAndCohorte } from "./getUserPermissionsSpecificToSousCompteAndCohorte";

const setup = async () => {
  const cohorte = await createCohorteVaeCollectiveHelper();
  const otherCohorte = await createCohorteVaeCollectiveHelper({
    commanditaireVaeCollective: {
      connect: { id: cohorte.commanditaireVaeCollectiveId },
    },
  });
  const sousCompte = await createSousCompteVaeCollectiveHelper({
    commanditaireVaeCollectiveId: cohorte.commanditaireVaeCollectiveId,
  });
  return { cohorte, otherCohorte, sousCompte };
};

describe("getUserPermissionsSpecificToSousCompteAndCohorte", () => {
  test("should return the permissions of the roles the sous compte has on the given cohorte", async () => {
    const { cohorte, sousCompte } = await setup();
    await prismaClient.roleSpecificToSousCompteAndCohorteVaeCollective.create({
      data: {
        sousCompteVaeCollectiveId: sousCompte.id,
        cohorteVaeCollectiveId: cohorte.id,
        role: "EDITEUR_COHORTE",
      },
    });

    const permissions = await getUserPermissionsSpecificToSousCompteAndCohorte({
      sousCompteVaeCollectiveId: sousCompte.id,
      cohorteVaeCollectiveId: cohorte.id,
    });

    expect(permissions.sort()).toEqual(
      ["MODIFIER_COHORTE", "VOIR_COHORTE", "VOIR_LISTE_COHORTES"].sort(),
    );
  });

  test("should not return permissions granted on another cohorte", async () => {
    const { cohorte, otherCohorte, sousCompte } = await setup();
    await prismaClient.roleSpecificToSousCompteAndCohorteVaeCollective.create({
      data: {
        sousCompteVaeCollectiveId: sousCompte.id,
        cohorteVaeCollectiveId: otherCohorte.id,
        role: "EDITEUR_COHORTE",
      },
    });

    const permissions = await getUserPermissionsSpecificToSousCompteAndCohorte({
      sousCompteVaeCollectiveId: sousCompte.id,
      cohorteVaeCollectiveId: cohorte.id,
    });

    expect(permissions).toEqual([]);
  });

  test("should not return permissions granted to another sous compte on the same cohorte", async () => {
    const { cohorte, sousCompte } = await setup();
    const otherSousCompte = await createSousCompteVaeCollectiveHelper({
      commanditaireVaeCollectiveId: cohorte.commanditaireVaeCollectiveId,
    });
    await prismaClient.roleSpecificToSousCompteAndCohorteVaeCollective.create({
      data: {
        sousCompteVaeCollectiveId: otherSousCompte.id,
        cohorteVaeCollectiveId: cohorte.id,
        role: "EDITEUR_COHORTE",
      },
    });

    const permissions = await getUserPermissionsSpecificToSousCompteAndCohorte({
      sousCompteVaeCollectiveId: sousCompte.id,
      cohorteVaeCollectiveId: cohorte.id,
    });

    expect(permissions).toEqual([]);
  });

  test("should return an empty array when the sous compte has no role on the cohorte", async () => {
    const { cohorte, sousCompte } = await setup();

    const permissions = await getUserPermissionsSpecificToSousCompteAndCohorte({
      sousCompteVaeCollectiveId: sousCompte.id,
      cohorteVaeCollectiveId: cohorte.id,
    });

    expect(permissions).toEqual([]);
  });
});
