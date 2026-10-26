import { faker } from "@faker-js/faker";

import { NOT_AUTHORIZED_CANDIDACY_MANAGE } from "@/modules/shared/security/messages";
import { prismaClient } from "@/prisma/client";
import { authorizationHeaderForUser } from "@/test/helpers/authorization-helper";
import { createCandidacyHelper } from "@/test/helpers/entities/create-candidacy-helper";
import { createCertificationAuthorityHelper } from "@/test/helpers/entities/create-certification-authority-helper";
import { createCertificationAuthorityLocalAccountHelper } from "@/test/helpers/entities/create-certification-authority-local-account-helper";
import { createCertificationHelper } from "@/test/helpers/entities/create-certification-helper";
import { createFeasibilityUploadedPdfHelper } from "@/test/helpers/entities/create-feasibility-uploaded-pdf-helper";
import { injectGraphql } from "@/test/helpers/graphql-helper";

const getActiveFeasibilityByCandidacyId = async ({
  candidacyId,
  keycloakId,
}: {
  candidacyId: string;
  keycloakId: string;
}) =>
  injectGraphql({
    fastify: global.testApp,
    authorization: authorizationHeaderForUser({
      role: "manage_feasibility",
      keycloakId,
    }),
    payload: {
      requestType: "query",
      endpoint: "feasibility_getActiveFeasibilityByCandidacyId",
      arguments: { candidacyId },
      returnFields: "{id}",
    },
  });

const ERROR_MESSAGES = {
  CANDIDACY_NOT_FOUND: "Candidature inexistante.",
} as const;

describe("isFeasibilityManager", () => {
  describe("manage_feasibility role", () => {
    test("should allow access when user manages the feasibility", async () => {
      const certification = await createCertificationHelper();
      const certificationAuthority = await createCertificationAuthorityHelper();
      const candidacy = await createCandidacyHelper({
        candidacyArgs: {
          certificationId: certification.id,
        },
      });

      if (
        !certificationAuthority?.id ||
        !certificationAuthority.account.id ||
        !candidacy.candidate?.departmentId
      ) {
        throw new Error("Required IDs are undefined");
      }

      await createCertificationAuthorityLocalAccountHelper({
        certificationAuthorityId: certificationAuthority.id,
        accountId: certificationAuthority.account.id,
        certificationAuthorityLocalAccountOnCertification: {
          create: { certificationId: certification.id },
        },
        certificationAuthorityLocalAccountOnDepartment: {
          create: { departmentId: candidacy.candidate.departmentId },
        },
      });

      await createFeasibilityUploadedPdfHelper({
        certificationAuthorityId: certificationAuthority?.id,
        candidacyId: candidacy.id,
      });

      const resp = await getActiveFeasibilityByCandidacyId({
        candidacyId: candidacy.id,
        keycloakId: certificationAuthority?.account.keycloakId,
      });

      expect(resp.statusCode).toEqual(200);
      expect(resp.json()).not.toHaveProperty("errors");
    });

    test("should deny access when user doesn't manage the feasibility", async () => {
      const feasibility = await createFeasibilityUploadedPdfHelper();

      const resp = await getActiveFeasibilityByCandidacyId({
        candidacyId: feasibility.candidacyId,
        keycloakId: faker.string.uuid(),
      });

      expect(resp.json()).toHaveProperty("errors");
      expect(resp.json().errors[0].message).toBe(
        NOT_AUTHORIZED_CANDIDACY_MANAGE,
      );
    });

    test("should deny access when candidacy does not exist", async () => {
      const resp = await getActiveFeasibilityByCandidacyId({
        candidacyId: faker.string.uuid(),
        keycloakId: faker.string.uuid(),
      });

      expect(resp.json()).toHaveProperty("errors");
      expect(resp.json().errors[0].message).toBe(
        ERROR_MESSAGES.CANDIDACY_NOT_FOUND,
      );
    });

    test("should deny access when feasibility file does not exist", async () => {
      const certification = await createCertificationHelper();
      const certificationAuthority = await createCertificationAuthorityHelper();
      const candidacy = await createCandidacyHelper({
        candidacyArgs: {
          certificationId: certification.id,
        },
      });

      if (!candidacy.candidate?.departmentId) {
        throw new Error("Candidate department ID is undefined");
      }

      await createCertificationAuthorityLocalAccountHelper({
        certificationAuthorityId: certificationAuthority.id,
        accountId: certificationAuthority.account.id,
        certificationAuthorityLocalAccountOnCertification: {
          create: { certificationId: certification.id },
        },
        certificationAuthorityLocalAccountOnDepartment: {
          create: { departmentId: candidacy.candidate.departmentId },
        },
      });

      const resp = await getActiveFeasibilityByCandidacyId({
        candidacyId: candidacy.id,
        keycloakId: certificationAuthority?.account.keycloakId,
      });

      expect(resp.json()).toHaveProperty("errors");
      expect(resp.json().errors[0].message).toBe(
        ERROR_MESSAGES.CANDIDACY_NOT_FOUND,
      );
    });

    test("should deny access when account is not found", async () => {
      const feasibility = await createFeasibilityUploadedPdfHelper();

      const resp = await getActiveFeasibilityByCandidacyId({
        candidacyId: feasibility.candidacyId,
        keycloakId: faker.string.uuid(),
      });

      expect(resp.json()).toHaveProperty("errors");
      expect(resp.json().errors[0].message).toBe(
        NOT_AUTHORIZED_CANDIDACY_MANAGE,
      );
    });

    test("should deny access when feasibility is not active", async () => {
      const certificationAuthority = await createCertificationAuthorityHelper();
      const candidacy = await createCandidacyHelper();

      await createFeasibilityUploadedPdfHelper({
        certificationAuthorityId: certificationAuthority?.id,
        candidacyId: candidacy.id,
        isActive: false,
      });

      const resp = await getActiveFeasibilityByCandidacyId({
        candidacyId: candidacy.id,
        keycloakId:
          certificationAuthority?.account.keycloakId ?? faker.string.uuid(),
      });

      expect(resp.json()).toHaveProperty("errors");
      expect(resp.json().errors[0].message).toBe(
        ERROR_MESSAGES.CANDIDACY_NOT_FOUND,
      );
    });
  });

  describe("manage_feasibility role with certification and department checks", () => {
    test("should allow access when user matches certification and department", async () => {
      const certification = await createCertificationHelper();
      const certificationAuthority = await createCertificationAuthorityHelper();
      const candidacy = await createCandidacyHelper({
        candidacyArgs: {
          certificationId: certification.id,
        },
      });

      if (
        !certificationAuthority?.id ||
        !certificationAuthority.account.id ||
        !candidacy.candidate?.departmentId
      ) {
        throw new Error("Required IDs are undefined");
      }

      await createCertificationAuthorityLocalAccountHelper({
        certificationAuthorityId: certificationAuthority.id,
        accountId: certificationAuthority.account.id,
        certificationAuthorityLocalAccountOnCertification: {
          create: { certificationId: certification.id },
        },
        certificationAuthorityLocalAccountOnDepartment: {
          create: { departmentId: candidacy.candidate.departmentId },
        },
      });

      await createFeasibilityUploadedPdfHelper({
        certificationAuthorityId: certificationAuthority?.id,
        candidacyId: candidacy.id,
      });

      const resp = await getActiveFeasibilityByCandidacyId({
        candidacyId: candidacy.id,
        keycloakId: certificationAuthority?.account.keycloakId,
      });

      expect(resp.statusCode).toEqual(200);
      expect(resp.json()).not.toHaveProperty("errors");
    });

    test("should deny access when certification authority does not match", async () => {
      const feasibility = await createFeasibilityUploadedPdfHelper();
      const certificationAuthority = await createCertificationAuthorityHelper();

      const resp = await getActiveFeasibilityByCandidacyId({
        candidacyId: feasibility.candidacyId,
        keycloakId: certificationAuthority.account.keycloakId,
      });

      expect(resp.json()).toHaveProperty("errors");
      expect(resp.json().errors[0].message).toBe(
        NOT_AUTHORIZED_CANDIDACY_MANAGE,
      );
    });

    test("should deny access when department does not match", async () => {
      const certification = await createCertificationHelper();
      const certificationAuthority = await createCertificationAuthorityHelper();
      const managedDepartment = await prismaClient.department.findUniqueOrThrow(
        {
          where: { code: "971" },
        },
      );
      const candidacy = await createCandidacyHelper({
        candidacyArgs: {
          certificationId: certification.id,
        },
      });

      await createCertificationAuthorityLocalAccountHelper({
        certificationAuthorityId: certificationAuthority.id,
        accountId: certificationAuthority.account.id,
        certificationAuthorityLocalAccountOnCertification: {
          create: { certificationId: certification.id },
        },
        certificationAuthorityLocalAccountOnDepartment: {
          create: { departmentId: managedDepartment.id },
        },
      });

      await createFeasibilityUploadedPdfHelper({
        certificationAuthorityId: certificationAuthority.id,
        candidacyId: candidacy.id,
      });

      const resp = await getActiveFeasibilityByCandidacyId({
        candidacyId: candidacy.id,
        keycloakId: certificationAuthority.account.keycloakId,
      });

      expect(resp.json()).toHaveProperty("errors");
      expect(resp.json().errors[0].message).toBe(
        NOT_AUTHORIZED_CANDIDACY_MANAGE,
      );
    });

    test("should deny access when feasibility is not active", async () => {
      const certificationAuthority = await createCertificationAuthorityHelper();
      const candidacy = await createCandidacyHelper();

      await createFeasibilityUploadedPdfHelper({
        certificationAuthorityId: certificationAuthority?.id,
        candidacyId: candidacy.id,
        isActive: false,
      });

      const resp = await getActiveFeasibilityByCandidacyId({
        candidacyId: candidacy.id,
        keycloakId:
          certificationAuthority?.account.keycloakId ?? faker.string.uuid(),
      });

      expect(resp.json()).toHaveProperty("errors");
      expect(resp.json().errors[0].message).toBe(
        ERROR_MESSAGES.CANDIDACY_NOT_FOUND,
      );
    });

    test("should deny access when only certification authority matches", async () => {
      const certificationAuthority = await createCertificationAuthorityHelper();
      const candidacy = await createCandidacyHelper();

      await createCertificationAuthorityLocalAccountHelper({
        certificationAuthorityId: certificationAuthority.id,
        accountId: certificationAuthority.account.id,
      });

      await createFeasibilityUploadedPdfHelper({
        certificationAuthorityId: certificationAuthority.id,
        candidacyId: candidacy.id,
      });

      const resp = await getActiveFeasibilityByCandidacyId({
        candidacyId: candidacy.id,
        keycloakId: certificationAuthority.account.keycloakId,
      });

      expect(resp.json()).toHaveProperty("errors");
      expect(resp.json().errors[0].message).toBe(
        NOT_AUTHORIZED_CANDIDACY_MANAGE,
      );
    });
  });

  describe("other roles", () => {
    test("should deny access for unauthorized roles", async () => {
      const feasibility = await createFeasibilityUploadedPdfHelper();

      const resp = await getActiveFeasibilityByCandidacyId({
        candidacyId: feasibility.candidacyId,
        keycloakId: faker.string.uuid(),
      });

      expect(resp.json()).toHaveProperty("errors");
      expect(resp.json().errors[0].message).toBe(
        NOT_AUTHORIZED_CANDIDACY_MANAGE,
      );
    });
  });
});
