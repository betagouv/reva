import { faker } from "@faker-js/faker";
import { IFieldResolver, MercuriusContext } from "mercurius";

import { NOT_AUTHORIZED_RESOURCE_ACCESS } from "@/modules/shared/security/messages";
import { createAccountHelper } from "@/test/helpers/entities/create-account-helper";
import { createSousCompteVaeCollectiveHelper } from "@/test/helpers/entities/create-sous-compte-vae-collective-helper";
import { createCohorteVaeCollectiveHelper } from "@/test/helpers/entities/create-vae-collective-helper";

import { isGestionnaireOrSousCompteOfCommanditaireVaeCollective } from "./isGestionnaireOrSousCompteOfCommanditaireVaeCollective";

const makeContext = ({ keycloakId }: { keycloakId?: string }) =>
  ({
    auth: {
      userInfo: {
        sub: keycloakId,
      },
    },
  }) as unknown as MercuriusContext;

const runMiddleware = ({
  root = {},
  args = {},
  context,
  next = vi.fn().mockResolvedValue("resolved"),
}: {
  root?: any;
  args?: Record<string, any>;
  context: MercuriusContext;
  next?: IFieldResolver<unknown>;
}) => {
  const info = {} as any;
  return {
    result: isGestionnaireOrSousCompteOfCommanditaireVaeCollective(next)(
      root,
      args,
      context,
      info,
    ),
    root,
    args,
    context,
    info,
    next,
  };
};

describe("isGestionnaireOrSousCompteOfCommanditaireVaeCollective", () => {
  test("lets the request through when the caller is the gestionnaire of the commanditaire", async () => {
    const cohorte = await createCohorteVaeCollectiveHelper();
    const gestionnaireKeycloakId =
      cohorte.commanditaireVaeCollective?.gestionnaire?.keycloakId;
    if (!gestionnaireKeycloakId) {
      throw new Error("Gestionnaire keycloak id not found");
    }

    const { result, root, args, context, info, next } = runMiddleware({
      args: {
        commanditaireVaeCollectiveId: cohorte.commanditaireVaeCollectiveId,
      },
      context: makeContext({ keycloakId: gestionnaireKeycloakId }),
    });

    await expect(result).resolves.toBe("resolved");
    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith(root, args, context, info);
  });

  test("lets the request through when the caller is a sous compte of the commanditaire", async () => {
    const cohorte = await createCohorteVaeCollectiveHelper();
    const sousCompteAccount = await createAccountHelper();
    await createSousCompteVaeCollectiveHelper({
      commanditaireVaeCollectiveId: cohorte.commanditaireVaeCollectiveId,
      accountId: sousCompteAccount.id,
    });

    const { result, next } = runMiddleware({
      args: {
        commanditaireVaeCollectiveId: cohorte.commanditaireVaeCollectiveId,
      },
      context: makeContext({ keycloakId: sousCompteAccount.keycloakId }),
    });

    await expect(result).resolves.toBe("resolved");
    expect(next).toHaveBeenCalledOnce();
  });

  test("denies access when the caller is neither the gestionnaire nor a sous compte of the commanditaire", async () => {
    const cohorte = await createCohorteVaeCollectiveHelper();

    const { result, next } = runMiddleware({
      args: {
        commanditaireVaeCollectiveId: cohorte.commanditaireVaeCollectiveId,
      },
      context: makeContext({ keycloakId: faker.string.uuid() }),
    });

    await expect(result).rejects.toThrow(NOT_AUTHORIZED_RESOURCE_ACCESS);
    expect(next).not.toHaveBeenCalled();
  });

  test("denies access when the caller is a sous compte of a different commanditaire", async () => {
    const cohorte = await createCohorteVaeCollectiveHelper();
    const otherCohorte = await createCohorteVaeCollectiveHelper();
    const sousCompteAccount = await createAccountHelper();
    await createSousCompteVaeCollectiveHelper({
      commanditaireVaeCollectiveId: otherCohorte.commanditaireVaeCollectiveId,
      accountId: sousCompteAccount.id,
    });

    const { result, next } = runMiddleware({
      args: {
        commanditaireVaeCollectiveId: cohorte.commanditaireVaeCollectiveId,
      },
      context: makeContext({ keycloakId: sousCompteAccount.keycloakId }),
    });

    await expect(result).rejects.toThrow(NOT_AUTHORIZED_RESOURCE_ACCESS);
    expect(next).not.toHaveBeenCalled();
  });

  test("denies access when the commanditaire does not exist", async () => {
    const { result, next } = runMiddleware({
      args: { commanditaireVaeCollectiveId: faker.string.uuid() },
      context: makeContext({ keycloakId: faker.string.uuid() }),
    });

    await expect(result).rejects.toThrow(NOT_AUTHORIZED_RESOURCE_ACCESS);
    expect(next).not.toHaveBeenCalled();
  });

  test("denies access when commanditaireVaeCollectiveId is missing from args, args.data and root", async () => {
    const { result, next } = runMiddleware({
      args: {},
      context: makeContext({ keycloakId: faker.string.uuid() }),
    });

    await expect(result).rejects.toThrow(NOT_AUTHORIZED_RESOURCE_ACCESS);
    expect(next).not.toHaveBeenCalled();
  });

  test("reads commanditaireVaeCollectiveId from args.data when args itself does not carry it (mutation input shape)", async () => {
    const cohorte = await createCohorteVaeCollectiveHelper();
    const gestionnaireKeycloakId =
      cohorte.commanditaireVaeCollective?.gestionnaire?.keycloakId;
    if (!gestionnaireKeycloakId) {
      throw new Error("Gestionnaire keycloak id not found");
    }

    const { result, next } = runMiddleware({
      args: {
        data: {
          commanditaireVaeCollectiveId: cohorte.commanditaireVaeCollectiveId,
        },
      },
      context: makeContext({ keycloakId: gestionnaireKeycloakId }),
    });

    await expect(result).resolves.toBe("resolved");
    expect(next).toHaveBeenCalledOnce();
  });

  test("reads commanditaireVaeCollectiveId from root.id when resolving a nested field on CommanditaireVaeCollective", async () => {
    const cohorte = await createCohorteVaeCollectiveHelper();
    const gestionnaireKeycloakId =
      cohorte.commanditaireVaeCollective?.gestionnaire?.keycloakId;
    if (!gestionnaireKeycloakId) {
      throw new Error("Gestionnaire keycloak id not found");
    }

    const { result, next } = runMiddleware({
      root: { id: cohorte.commanditaireVaeCollectiveId },
      args: {},
      context: makeContext({ keycloakId: gestionnaireKeycloakId }),
    });

    await expect(result).resolves.toBe("resolved");
    expect(next).toHaveBeenCalledOnce();
  });
});
