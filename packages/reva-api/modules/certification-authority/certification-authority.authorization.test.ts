import { faker } from "@faker-js/faker";

import {
  NOT_AUTHORIZED,
  NOT_AUTHORIZED_LOCAL_ACCOUNT_ACCESS,
  SESSION_EXPIRED,
} from "@/modules/shared/security/messages";
import { authorizationHeaderForUser } from "@/test/helpers/authorization-helper";
import { createCertificationAuthorityLocalAccountHelper } from "@/test/helpers/entities/create-certification-authority-local-account-helper";
import { injectGraphql } from "@/test/helpers/graphql-helper";

const asRole = (role: KeyCloakUserRole, keycloakId?: string) =>
  authorizationHeaderForUser({
    role,
    keycloakId: keycloakId ?? faker.string.uuid(),
  });

const managerOf = (
  localAccount: Awaited<
    ReturnType<typeof createCertificationAuthorityLocalAccountHelper>
  >,
) =>
  asRole(
    "manage_certification_authority_local_account",
    localAccount.certificationAuthority.Account[0].keycloakId,
  );

type LocalAccountMutation = {
  endpoint: string;
  extraArguments: Record<string, unknown>;
};

const callMutation = (
  { endpoint, extraArguments }: LocalAccountMutation,
  certificationAuthorityLocalAccountId: string,
  authorization?: string,
) =>
  injectGraphql({
    fastify: global.testApp,
    authorization,
    payload: {
      requestType: "mutation",
      endpoint,
      arguments: { certificationAuthorityLocalAccountId, ...extraArguments },
      returnFields: "{ id }",
    },
  });

const updateMutations: LocalAccountMutation[] = [
  {
    endpoint:
      "certification_authority_updateCertificationAuthorityLocalAccountDepartments",
    extraArguments: { departmentIds: [] },
  },
  {
    endpoint:
      "certification_authority_updateCertificationAuthorityLocalAccountCertifications",
    extraArguments: { certificationIds: [] },
  },
];

// La suppression appelle Keycloak : seuls les refus, levés avant le code de la feature, sont testés pour elle.
const allMutations: LocalAccountMutation[] = [
  ...updateMutations,
  {
    endpoint:
      "certification_authority_deleteCertificationAuthorityLocalAccount",
    extraArguments: {},
  },
];

describe.each(updateMutations)(
  "$endpoint (admin ou certificateur administrateur du compte local)",
  (localAccountMutation: LocalAccountMutation) => {
    test("l'admin : autorisé", async () => {
      const localAccount =
        await createCertificationAuthorityLocalAccountHelper();
      const resp = await callMutation(
        localAccountMutation,
        localAccount.id,
        asRole("admin"),
      );
      expect(resp.json()).not.toHaveProperty("errors");
    });

    test("le certificateur administrateur du compte local : autorisé", async () => {
      const localAccount =
        await createCertificationAuthorityLocalAccountHelper();
      const resp = await callMutation(
        localAccountMutation,
        localAccount.id,
        managerOf(localAccount),
      );
      expect(resp.json()).not.toHaveProperty("errors");
    });
  },
);

describe.each(allMutations)(
  "$endpoint (refus)",
  (localAccountMutation: LocalAccountMutation) => {
    test("le certificateur administrateur d'une AUTRE autorité : refusé", async () => {
      const localAccount =
        await createCertificationAuthorityLocalAccountHelper();
      const autreLocalAccount =
        await createCertificationAuthorityLocalAccountHelper();
      const resp = await callMutation(
        localAccountMutation,
        localAccount.id,
        managerOf(autreLocalAccount),
      );
      expect(resp.json().errors[0].message).toBe(
        NOT_AUTHORIZED_LOCAL_ACCOUNT_ACCESS,
      );
    });

    test("le compte local lui-même (manage_feasibility) : refusé", async () => {
      const localAccount =
        await createCertificationAuthorityLocalAccountHelper();
      const resp = await callMutation(
        localAccountMutation,
        localAccount.id,
        asRole("manage_feasibility", localAccount.account.keycloakId),
      );
      expect(resp.json().errors[0].message).toBe(NOT_AUTHORIZED);
    });

    test("non authentifié : refusé", async () => {
      const localAccount =
        await createCertificationAuthorityLocalAccountHelper();
      const resp = await callMutation(localAccountMutation, localAccount.id);
      expect(resp.json().errors[0].message).toBe(SESSION_EXPIRED);
    });
  },
);
