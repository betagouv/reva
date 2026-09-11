import {
  NOT_AUTHORIZED,
  NOT_AUTHORIZED_RESOURCE_ACCESS,
} from "@/modules/shared/security/messages";
import { prismaClient } from "@/prisma/client";
import { authorizationHeaderForUser } from "@/test/helpers/authorization-helper";
import { createCohorteVaeCollectiveHelper } from "@/test/helpers/entities/create-vae-collective-helper";
import { getGraphQLClient } from "@/test/test-graphql-client";

import { graphql } from "../graphql/generated";
import * as getKeycloakAdminModule from "../shared/auth/getKeycloakAdmin";
import * as sendEmailUsingTemplate from "../shared/email/sendEmailUsingTemplate";

const createSousCompteVaeCollectiveMutation = graphql(`
  mutation createSousCompteVaeCollective(
    $commanditaireVaeCollectiveId: ID!
    $accountFirstname: String!
    $accountLastname: String!
    $accountEmail: String!
    $canCreateCohorteVaeCollective: Boolean!
  ) {
    vaeCollective_createSousCompteVaeCollective(
      commanditaireVaeCollectiveId: $commanditaireVaeCollectiveId
      accountFirstname: $accountFirstname
      accountLastname: $accountLastname
      accountEmail: $accountEmail
      canCreateCohorteVaeCollective: $canCreateCohorteVaeCollective
    ) {
      id
      account {
        id
        email
        firstname
        lastname
      }
    }
  }
`);

const createSousCompteVaeCollective = ({
  commanditaireVaeCollectiveId,
  accountFirstname,
  accountLastname,
  accountEmail,
  canCreateCohorteVaeCollective = false,
  role,
  keycloakId,
}: {
  commanditaireVaeCollectiveId: string;
  accountFirstname: string;
  accountLastname: string;
  accountEmail: string;
  canCreateCohorteVaeCollective?: boolean;
  role: KeyCloakUserRole;
  keycloakId?: string;
}) => {
  const graphqlClient = getGraphQLClient({
    headers: {
      authorization: authorizationHeaderForUser({ role, keycloakId }),
    },
  });

  return graphqlClient.request(createSousCompteVaeCollectiveMutation, {
    commanditaireVaeCollectiveId,
    accountFirstname,
    accountLastname,
    accountEmail,
    canCreateCohorteVaeCollective,
  });
};

const mockKeycloakAdmin = () =>
  vi.spyOn(getKeycloakAdminModule, "getKeycloakAdmin").mockImplementation(
    () =>
      Promise.resolve({
        users: {
          find: vi.fn().mockResolvedValue([]),
          create: vi.fn().mockResolvedValue({
            id: "02c1b842-c889-4db7-a4a6-2fad38e3d1fe",
          }),
          executeActionsEmail: vi.fn().mockResolvedValue(undefined),
        },
      }) as any,
  );

describe("create sous compte vae collective", () => {
  test("should let an admin create a sous compte for any commanditaire vae collective and send an email to the account owner", async () => {
    mockKeycloakAdmin();

    const emailSpy = vi.spyOn(sendEmailUsingTemplate, "sendEmailUsingTemplate");

    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();
    const commanditaireVaeCollectiveId =
      cohorteVaeCollective.commanditaireVaeCollectiveId;

    const res = await createSousCompteVaeCollective({
      commanditaireVaeCollectiveId,
      accountFirstname: "John",
      accountLastname: "Doe",
      accountEmail: "john.doe.sous-compte@example.com",
      role: "admin",
      keycloakId: "1b0e7046-ca61-4259-b716-785f36ab79b2",
    });

    expect(
      res.vaeCollective_createSousCompteVaeCollective.account,
    ).toMatchObject({
      email: "john.doe.sous-compte@example.com",
      firstname: "John",
      lastname: "Doe",
    });

    const sousCompte = await prismaClient.sousCompteVaeCollective.findUnique({
      where: { id: res.vaeCollective_createSousCompteVaeCollective.id },
    });

    expect(sousCompte).toMatchObject({ commanditaireVaeCollectiveId });

    expect(emailSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: { email: "john.doe.sous-compte@example.com" },
        templateId: 732,
      }),
    );
  });

  test("should create a CREER_COHORTE permission when canCreateCohorteVaeCollective is true", async () => {
    mockKeycloakAdmin();

    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();
    const commanditaireVaeCollectiveId =
      cohorteVaeCollective.commanditaireVaeCollectiveId;

    const res = await createSousCompteVaeCollective({
      commanditaireVaeCollectiveId,
      accountFirstname: "John",
      accountLastname: "Doe",
      accountEmail: "john.doe.can-create-cohorte@example.com",
      canCreateCohorteVaeCollective: true,
      role: "admin",
      keycloakId: "1b0e7046-ca61-4259-b716-785f36ab79b2",
    });

    const permission =
      await prismaClient.roleSpecificToSousCompteVaeCollective.findUnique({
        where: {
          role_sousCompteVaeCollectiveId: {
            role: "CREATEUR_COHORTE",
            sousCompteVaeCollectiveId:
              res.vaeCollective_createSousCompteVaeCollective.id,
          },
        },
      });

    expect(permission).not.toBeNull();
  });

  test("should not create a CREER_COHORTE permission when canCreateCohorteVaeCollective is false", async () => {
    mockKeycloakAdmin();

    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();
    const commanditaireVaeCollectiveId =
      cohorteVaeCollective.commanditaireVaeCollectiveId;

    const res = await createSousCompteVaeCollective({
      commanditaireVaeCollectiveId,
      accountFirstname: "John",
      accountLastname: "Doe",
      accountEmail: "john.doe.cannot-create-cohorte@example.com",
      canCreateCohorteVaeCollective: false,
      role: "admin",
      keycloakId: "1b0e7046-ca61-4259-b716-785f36ab79b2",
    });

    const permission =
      await prismaClient.roleSpecificToSousCompteVaeCollective.findUnique({
        where: {
          role_sousCompteVaeCollectiveId: {
            role: "CREATEUR_COHORTE",
            sousCompteVaeCollectiveId:
              res.vaeCollective_createSousCompteVaeCollective.id,
          },
        },
      });

    expect(permission).toBeNull();
  });

  test("should let the gestionnaire of the commanditaire create a sous compte for it", async () => {
    mockKeycloakAdmin();

    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();
    const commanditaireVaeCollectiveId =
      cohorteVaeCollective.commanditaireVaeCollectiveId;
    const gestionnaireKeycloakId =
      cohorteVaeCollective.commanditaireVaeCollective?.gestionnaire?.keycloakId;

    if (!gestionnaireKeycloakId) {
      throw new Error("Compte gestionnaire non trouvé");
    }

    const res = await createSousCompteVaeCollective({
      commanditaireVaeCollectiveId,
      accountFirstname: "Jane",
      accountLastname: "Smith",
      accountEmail: "jane.smith.sous-compte@example.com",
      role: "manage_vae_collective",
      keycloakId: gestionnaireKeycloakId,
    });

    expect(
      res.vaeCollective_createSousCompteVaeCollective.account,
    ).toMatchObject({
      email: "jane.smith.sous-compte@example.com",
      firstname: "Jane",
      lastname: "Smith",
    });
  });

  test("should not let a gestionnaire of a different commanditaire create a sous compte", async () => {
    mockKeycloakAdmin();

    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();
    const anotherCohorteVaeCollective =
      await createCohorteVaeCollectiveHelper();
    const gestionnaireKeycloakId =
      cohorteVaeCollective.commanditaireVaeCollective?.gestionnaire?.keycloakId;

    if (!gestionnaireKeycloakId) {
      throw new Error("Compte gestionnaire non trouvé");
    }

    await expect(
      createSousCompteVaeCollective({
        commanditaireVaeCollectiveId:
          anotherCohorteVaeCollective.commanditaireVaeCollectiveId,
        accountFirstname: "Jane",
        accountLastname: "Smith",
        accountEmail: "jane.smith.forbidden@example.com",
        role: "manage_vae_collective",
        keycloakId: gestionnaireKeycloakId,
      }),
    ).rejects.toThrowError(NOT_AUTHORIZED_RESOURCE_ACCESS);
  });

  test("should not let a user without an authorized role create a sous compte", async () => {
    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();

    await expect(
      createSousCompteVaeCollective({
        commanditaireVaeCollectiveId:
          cohorteVaeCollective.commanditaireVaeCollectiveId,
        accountFirstname: "Jane",
        accountLastname: "Smith",
        accountEmail: "jane.smith.unauthorized@example.com",
        role: "manage_candidacy",
      }),
    ).rejects.toThrowError(NOT_AUTHORIZED);
  });
});
