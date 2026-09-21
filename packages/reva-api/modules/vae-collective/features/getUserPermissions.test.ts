import { prismaClient } from "@/prisma/client";
import { createAccountHelper } from "@/test/helpers/entities/create-account-helper";
import { createSousCompteVaeCollectiveHelper } from "@/test/helpers/entities/create-sous-compte-vae-collective-helper";
import { createCohorteVaeCollectiveHelper } from "@/test/helpers/entities/create-vae-collective-helper";

import { getUserPermissions } from "./getUserPermissions";

const setup = async () => {
  const cohorte = await createCohorteVaeCollectiveHelper();
  const otherCohorte = await createCohorteVaeCollectiveHelper({
    commanditaireVaeCollective: {
      connect: { id: cohorte.commanditaireVaeCollectiveId },
    },
  });
  const account = await createAccountHelper();
  const sousCompte = await createSousCompteVaeCollectiveHelper({
    commanditaireVaeCollectiveId: cohorte.commanditaireVaeCollectiveId,
    accountId: account.id,
  });
  await prismaClient.roleSpecificToSousCompteAndCohorteVaeCollective.create({
    data: {
      sousCompteVaeCollectiveId: sousCompte.id,
      cohorteVaeCollectiveId: cohorte.id,
      role: "EDITEUR_COHORTE",
    },
  });
  return { cohorte, otherCohorte, keycloakId: account.keycloakId };
};

describe("getUserPermissions with a cohorteVaeCollectiveId", () => {
  test("should include the permissions specific to the sous compte and the given cohorte", async () => {
    const { cohorte, keycloakId } = await setup();

    const permissions = await getUserPermissions({
      userKeycloakId: keycloakId,
      userKeycloakRoles: [],
      cohorteVaeCollectiveId: cohorte.id,
    });

    expect(permissions).toContain("MODIFIER_COHORTE");
  });

  test("should not include cohorte specific permissions when no cohorteVaeCollectiveId is given", async () => {
    const { keycloakId } = await setup();

    const permissions = await getUserPermissions({
      userKeycloakId: keycloakId,
      userKeycloakRoles: [],
    });

    expect(permissions).not.toContain("MODIFIER_COHORTE");
  });

  test("should not include permissions specific to another cohorte", async () => {
    const { otherCohorte, keycloakId } = await setup();

    const permissions = await getUserPermissions({
      userKeycloakId: keycloakId,
      userKeycloakRoles: [],
      cohorteVaeCollectiveId: otherCohorte.id,
    });

    expect(permissions).not.toContain("MODIFIER_COHORTE");
  });

  test("should return no cohorte specific permissions for a user without a sous compte", async () => {
    const { cohorte } = await setup();
    const account = await createAccountHelper();

    const permissions = await getUserPermissions({
      userKeycloakId: account.keycloakId,
      userKeycloakRoles: [],
      cohorteVaeCollectiveId: cohorte.id,
    });

    expect(permissions).toEqual([]);
  });
});
