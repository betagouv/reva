import { prismaClient } from "@/prisma/client";
import { createAccountHelper } from "@/test/helpers/entities/create-account-helper";
import { createSousCompteVaeCollectiveHelper } from "@/test/helpers/entities/create-sous-compte-vae-collective-helper";
import { createCohorteVaeCollectiveHelper } from "@/test/helpers/entities/create-vae-collective-helper";

import { getCohortesVaeCollectivesByCommanditaireVaeCollectiveId } from "./getCohortesVaeCollectivesByCommanditaireVaeCollectiveId";

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
  return { cohorte, otherCohorte, account, sousCompte };
};

describe("getCohortesVaeCollectivesByCommanditaireVaeCollectiveId", () => {
  test("should return all the commanditaire's cohortes when the caller is not a sous compte", async () => {
    const { cohorte, otherCohorte } = await setup();

    const result =
      await getCohortesVaeCollectivesByCommanditaireVaeCollectiveId({
        commanditaireVaeCollectiveId: cohorte.commanditaireVaeCollectiveId,
        offset: 0,
        limit: 10,
        userKeycloakId: "irrelevant-keycloak-id",
        userKeycloakRoles: ["manage_vae_collective"],
      });

    expect(result.rows!.map((r) => r.id).sort()).toEqual(
      [cohorte.id, otherCohorte.id].sort(),
    );
    expect(result.info.totalRows).toBe(2);
  });

  test("should return all the commanditaire's cohortes when the sous compte holds a commanditaire-wide role granting VOIR_COHORTE", async () => {
    const { cohorte, otherCohorte, account, sousCompte } = await setup();
    await prismaClient.roleSpecificToSousCompteVaeCollective.create({
      data: {
        sousCompteVaeCollectiveId: sousCompte.id,
        role: "ADMINISTRATEUR_PORTEUR_DE_PROJET",
      },
    });

    const result =
      await getCohortesVaeCollectivesByCommanditaireVaeCollectiveId({
        commanditaireVaeCollectiveId: cohorte.commanditaireVaeCollectiveId,
        offset: 0,
        limit: 10,
        userKeycloakId: account.keycloakId,
        userKeycloakRoles: ["sous_compte_vae_collective"],
      });

    expect(result.rows!.map((r) => r.id).sort()).toEqual(
      [cohorte.id, otherCohorte.id].sort(),
    );
    expect(result.info.totalRows).toBe(2);
  });

  test("should return only the cohortes granted via a cohorte-scoped role", async () => {
    const { cohorte, otherCohorte, account, sousCompte } = await setup();
    await prismaClient.roleSpecificToSousCompteAndCohorteVaeCollective.create({
      data: {
        sousCompteVaeCollectiveId: sousCompte.id,
        cohorteVaeCollectiveId: cohorte.id,
        role: "LECTEUR_COHORTE",
      },
    });

    const result =
      await getCohortesVaeCollectivesByCommanditaireVaeCollectiveId({
        commanditaireVaeCollectiveId: cohorte.commanditaireVaeCollectiveId,
        offset: 0,
        limit: 10,
        userKeycloakId: account.keycloakId,
        userKeycloakRoles: ["sous_compte_vae_collective"],
      });

    expect(result.rows!.map((r) => r.id)).toEqual([cohorte.id]);
    expect(result.rows!.map((r) => r.id)).not.toContain(otherCohorte.id);
    expect(result.info.totalRows).toBe(1);
  });

  test("should return no cohortes when the sous compte has no role granting VOIR_COHORTE", async () => {
    const { cohorte, account } = await setup();

    const result =
      await getCohortesVaeCollectivesByCommanditaireVaeCollectiveId({
        commanditaireVaeCollectiveId: cohorte.commanditaireVaeCollectiveId,
        offset: 0,
        limit: 10,
        userKeycloakId: account.keycloakId,
        userKeycloakRoles: ["sous_compte_vae_collective"],
      });

    expect(result.rows).toEqual([]);
    expect(result.info.totalRows).toBe(0);
  });

  test("should throw when no sous compte exists for the given user", async () => {
    const cohorte = await createCohorteVaeCollectiveHelper();

    await expect(
      getCohortesVaeCollectivesByCommanditaireVaeCollectiveId({
        commanditaireVaeCollectiveId: cohorte.commanditaireVaeCollectiveId,
        offset: 0,
        limit: 10,
        userKeycloakId: "00000000-0000-0000-0000-000000000000",
        userKeycloakRoles: ["sous_compte_vae_collective"],
      }),
    ).rejects.toThrowError("Sous-compte non trouvé");
  });
});
