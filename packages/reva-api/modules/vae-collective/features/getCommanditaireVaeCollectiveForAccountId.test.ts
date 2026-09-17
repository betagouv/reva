import { faker } from "@faker-js/faker";

import { prismaClient } from "@/prisma/client";
import { createAccountHelper } from "@/test/helpers/entities/create-account-helper";
import { createCohorteVaeCollectiveHelper } from "@/test/helpers/entities/create-vae-collective-helper";

import { getCommanditaireVaeCollectiveForAccountId } from "./getCommanditaireVaeCollectiveForAccountId";

test("returns the commanditaire when given the gestionnaire account id", async () => {
  const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();
  const commanditaireVaeCollectiveId =
    cohorteVaeCollective.commanditaireVaeCollectiveId;
  const gestionnaireAccountId =
    cohorteVaeCollective.commanditaireVaeCollective!.gestionnaireAccountId!;

  const result = await getCommanditaireVaeCollectiveForAccountId({
    accountId: gestionnaireAccountId,
  });

  expect(result?.id).toBe(commanditaireVaeCollectiveId);
});

test("returns the commanditaire when given a sous compte account id", async () => {
  const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();
  const commanditaireVaeCollectiveId =
    cohorteVaeCollective.commanditaireVaeCollectiveId;
  const sousCompteAccount = await createAccountHelper();
  await prismaClient.sousCompteVaeCollective.create({
    data: {
      commanditaireVaeCollectiveId,
      accountId: sousCompteAccount.id,
    },
  });

  const result = await getCommanditaireVaeCollectiveForAccountId({
    accountId: sousCompteAccount.id,
  });

  expect(result?.id).toBe(commanditaireVaeCollectiveId);
});

test("returns null when the account is neither a gestionnaire nor a sous compte", async () => {
  const result = await getCommanditaireVaeCollectiveForAccountId({
    accountId: faker.string.uuid(),
  });

  expect(result).toBeNull();
});
