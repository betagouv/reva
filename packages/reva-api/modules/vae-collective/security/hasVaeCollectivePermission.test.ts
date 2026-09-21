import { PermissionVaeCollective } from "@prisma/client";
import { IFieldResolver, MercuriusContext } from "mercurius";

import { NOT_AUTHORIZED_RESOURCE_ACCESS } from "@/modules/shared/security/messages";
import { createAccountHelper } from "@/test/helpers/entities/create-account-helper";
import { createSousCompteVaeCollectiveHelper } from "@/test/helpers/entities/create-sous-compte-vae-collective-helper";
import { createCohorteVaeCollectiveHelper } from "@/test/helpers/entities/create-vae-collective-helper";

import { hasVaeCollectivePermission } from "./hasVaeCollectivePermission";

const makeContext = ({
  roles,
  keycloakId = "user-test",
  keycloakRoles = roles,
}: {
  roles: string[];
  keycloakId?: string;
  keycloakRoles?: string[];
}) =>
  ({
    auth: {
      userInfo: {
        sub: keycloakId,
        realm_access: { roles: keycloakRoles },
      },
      hasRole: (role: string) => roles.includes(role),
    },
  }) as unknown as MercuriusContext;

// wrapped in an async function so a synchronous throw (e.g. from hasRole)
// is turned into a rejected promise instead of escaping the call itself
const runPolicy = async (
  policy: ReturnType<typeof hasVaeCollectivePermission>,
  args: Record<string, any>,
  context: MercuriusContext,
  finalResolver: IFieldResolver<unknown> = vi.fn().mockResolvedValue("ok"),
) => {
  const chain = policy.reduceRight<IFieldResolver<unknown>>(
    (next, middleware) => middleware(next),
    finalResolver,
  );
  return chain({}, args, context, {} as any);
};

const createSousCompteUserKeycloakId = async () => {
  const cohorte = await createCohorteVaeCollectiveHelper();
  const account = await createAccountHelper();
  await createSousCompteVaeCollectiveHelper({
    commanditaireVaeCollectiveId: cohorte.commanditaireVaeCollectiveId,
    accountId: account.id,
  });
  return account.keycloakId;
};

describe("hasVaeCollectivePermission", () => {
  test("denies access when the user has none of the admin, manage_vae_collective or sous_compte_vae_collective roles", async () => {
    const policy = hasVaeCollectivePermission(
      PermissionVaeCollective.CREER_COHORTE,
    );
    const context = makeContext({ roles: ["candidate"] });

    await expect(runPolicy(policy, {}, context)).rejects.toThrow(
      "Utilisateur non autorisé",
    );
  });

  test("lets an admin through without checking ownership or permissions", async () => {
    const policy = hasVaeCollectivePermission(
      PermissionVaeCollective.CREER_COHORTE,
    );
    const context = makeContext({ roles: ["admin"] });
    const finalResolver = vi.fn().mockResolvedValue("resolved");

    await expect(runPolicy(policy, {}, context, finalResolver)).resolves.toBe(
      "resolved",
    );
    expect(finalResolver).toHaveBeenCalledOnce();
  });

  test("lets a sous_compte_vae_collective user through when their role grants the required permission", async () => {
    const policy = hasVaeCollectivePermission(
      PermissionVaeCollective.VOIR_LISTE_COHORTES,
    );
    const context = makeContext({
      roles: ["sous_compte_vae_collective"],
      keycloakId: await createSousCompteUserKeycloakId(),
    });
    const finalResolver = vi.fn().mockResolvedValue("resolved");

    await expect(runPolicy(policy, {}, context, finalResolver)).resolves.toBe(
      "resolved",
    );
    expect(finalResolver).toHaveBeenCalledOnce();
  });

  test("denies a sous_compte_vae_collective user when their role does not grant the required permission", async () => {
    const policy = hasVaeCollectivePermission(
      PermissionVaeCollective.CREER_COHORTE,
    );
    const context = makeContext({
      roles: ["sous_compte_vae_collective"],
      keycloakId: await createSousCompteUserKeycloakId(),
    });
    const finalResolver = vi.fn();

    await expect(runPolicy(policy, {}, context, finalResolver)).rejects.toThrow(
      NOT_AUTHORIZED_RESOURCE_ACCESS,
    );
    expect(finalResolver).not.toHaveBeenCalled();
  });

  test("lets a manage_vae_collective gestionnaire through when they hold the required permission for their own commanditaire", async () => {
    const cohorte = await createCohorteVaeCollectiveHelper();
    const gestionnaireKeycloakId =
      cohorte.commanditaireVaeCollective?.gestionnaire?.keycloakId;
    if (!gestionnaireKeycloakId) {
      throw new Error("Gestionnaire keycloak id not found");
    }

    const policy = hasVaeCollectivePermission(
      PermissionVaeCollective.CREER_COHORTE,
    );
    const context = makeContext({
      roles: ["manage_vae_collective"],
      keycloakId: gestionnaireKeycloakId,
    });
    const finalResolver = vi.fn().mockResolvedValue("resolved");

    await expect(
      runPolicy(
        policy,
        { commanditaireVaeCollectiveId: cohorte.commanditaireVaeCollectiveId },
        context,
        finalResolver,
      ),
    ).resolves.toBe("resolved");
    expect(finalResolver).toHaveBeenCalledOnce();
  });

  test("denies a manage_vae_collective user managing a different commanditaire, even if they hold the permission", async () => {
    const cohorte = await createCohorteVaeCollectiveHelper();
    const otherCohorte = await createCohorteVaeCollectiveHelper();
    const gestionnaireKeycloakId =
      cohorte.commanditaireVaeCollective?.gestionnaire?.keycloakId;
    if (!gestionnaireKeycloakId) {
      throw new Error("Gestionnaire keycloak id not found");
    }

    const policy = hasVaeCollectivePermission(
      PermissionVaeCollective.CREER_COHORTE,
    );
    const context = makeContext({
      roles: ["manage_vae_collective"],
      keycloakId: gestionnaireKeycloakId,
    });

    await expect(
      runPolicy(
        policy,
        {
          commanditaireVaeCollectiveId:
            otherCohorte.commanditaireVaeCollectiveId,
        },
        context,
      ),
    ).rejects.toThrow(NOT_AUTHORIZED_RESOURCE_ACCESS);
  });

  test("lets a manage_vae_collective gestionnaire through for a cohorte-scoped permission when they own both the commanditaire and the cohorte", async () => {
    const cohorte = await createCohorteVaeCollectiveHelper();
    const gestionnaireKeycloakId =
      cohorte.commanditaireVaeCollective?.gestionnaire?.keycloakId;
    if (!gestionnaireKeycloakId) {
      throw new Error("Gestionnaire keycloak id not found");
    }

    const policy = hasVaeCollectivePermission(
      PermissionVaeCollective.VOIR_COHORTE,
    );
    const context = makeContext({
      roles: ["manage_vae_collective"],
      keycloakId: gestionnaireKeycloakId,
    });
    const finalResolver = vi.fn().mockResolvedValue("resolved");

    await expect(
      runPolicy(
        policy,
        {
          commanditaireVaeCollectiveId: cohorte.commanditaireVaeCollectiveId,
          cohorteVaeCollectiveId: cohorte.id,
        },
        context,
        finalResolver,
      ),
    ).resolves.toBe("resolved");
    expect(finalResolver).toHaveBeenCalledOnce();
  });

  test("denies a manage_vae_collective gestionnaire for a cohorte-scoped permission when the cohorte does not belong to the commanditaire they own", async () => {
    const cohorte = await createCohorteVaeCollectiveHelper();
    const otherCohorte = await createCohorteVaeCollectiveHelper();
    const gestionnaireKeycloakId =
      cohorte.commanditaireVaeCollective?.gestionnaire?.keycloakId;
    if (!gestionnaireKeycloakId) {
      throw new Error("Gestionnaire keycloak id not found");
    }

    const policy = hasVaeCollectivePermission(
      PermissionVaeCollective.VOIR_COHORTE,
    );
    const context = makeContext({
      roles: ["manage_vae_collective"],
      keycloakId: gestionnaireKeycloakId,
    });

    // The gestionnaire owns cohorte.commanditaireVaeCollectiveId, but points
    // at another commanditaire's cohorte: isGestionnaireOfCommanditaireVaeCollective
    // alone would let this through, so this pins the extra cohorte-ownership check.
    await expect(
      runPolicy(
        policy,
        {
          commanditaireVaeCollectiveId: cohorte.commanditaireVaeCollectiveId,
          cohorteVaeCollectiveId: otherCohorte.id,
        },
        context,
      ),
    ).rejects.toThrow(NOT_AUTHORIZED_RESOURCE_ACCESS);
  });

  test("lets a manage_vae_collective gestionnaire through for a sous-compte-scoped permission when they own both the commanditaire and the sous compte", async () => {
    const cohorte = await createCohorteVaeCollectiveHelper();
    const gestionnaireKeycloakId =
      cohorte.commanditaireVaeCollective?.gestionnaire?.keycloakId;
    if (!gestionnaireKeycloakId) {
      throw new Error("Gestionnaire keycloak id not found");
    }
    const sousCompte = await createSousCompteVaeCollectiveHelper({
      commanditaireVaeCollectiveId: cohorte.commanditaireVaeCollectiveId,
    });

    const policy = hasVaeCollectivePermission(
      PermissionVaeCollective.VOIR_SOUS_COMPTE,
    );
    const context = makeContext({
      roles: ["manage_vae_collective"],
      keycloakId: gestionnaireKeycloakId,
    });
    const finalResolver = vi.fn().mockResolvedValue("resolved");

    await expect(
      runPolicy(
        policy,
        {
          commanditaireVaeCollectiveId: cohorte.commanditaireVaeCollectiveId,
          sousCompteVaeCollectiveId: sousCompte.id,
        },
        context,
        finalResolver,
      ),
    ).resolves.toBe("resolved");
    expect(finalResolver).toHaveBeenCalledOnce();
  });

  test("denies a manage_vae_collective gestionnaire for a sous-compte-scoped permission when the sous compte does not belong to the commanditaire they own", async () => {
    const cohorte = await createCohorteVaeCollectiveHelper();
    const otherCohorte = await createCohorteVaeCollectiveHelper();
    const gestionnaireKeycloakId =
      cohorte.commanditaireVaeCollective?.gestionnaire?.keycloakId;
    if (!gestionnaireKeycloakId) {
      throw new Error("Gestionnaire keycloak id not found");
    }
    const sousCompteOfOtherCommanditaire =
      await createSousCompteVaeCollectiveHelper({
        commanditaireVaeCollectiveId: otherCohorte.commanditaireVaeCollectiveId,
      });

    const policy = hasVaeCollectivePermission(
      PermissionVaeCollective.VOIR_SOUS_COMPTE,
    );
    const context = makeContext({
      roles: ["manage_vae_collective"],
      keycloakId: gestionnaireKeycloakId,
    });

    // The gestionnaire owns cohorte.commanditaireVaeCollectiveId, but points
    // at another commanditaire's sous compte: isGestionnaireOfCommanditaireVaeCollective
    // alone would let this through, so this pins the extra sous-compte-ownership check.
    await expect(
      runPolicy(
        policy,
        {
          commanditaireVaeCollectiveId: cohorte.commanditaireVaeCollectiveId,
          sousCompteVaeCollectiveId: sousCompteOfOtherCommanditaire.id,
        },
        context,
      ),
    ).rejects.toThrow(NOT_AUTHORIZED_RESOURCE_ACCESS);
  });
});
