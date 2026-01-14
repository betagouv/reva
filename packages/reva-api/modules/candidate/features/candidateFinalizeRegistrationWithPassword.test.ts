import { faker } from "@faker-js/faker";
import { FeasibilityFormat } from "@prisma/client";

import * as AuthHelper from "@/modules/shared/auth/auth.helper";
import { prismaClient } from "@/prisma/client";
import { createCandidateHelper } from "@/test/helpers/entities/create-candidate-helper";
import { createCertificationHelper } from "@/test/helpers/entities/create-certification-helper";
import { getGraphQLClient } from "@/test/test-graphql-client";

import { graphql } from "../../graphql/generated";

const resetPasswordMutation = graphql(`
  mutation candidate_resetPassword_finalize_registration_test(
    $token: String!
    $password: String!
  ) {
    candidate_resetPassword(token: $token, password: $password) {
      accessToken
      refreshToken
      idToken
    }
  }
`);

describe("candidateFinalizeRegistrationWithPassword", () => {
  test("creates candidate and candidacy then returns tokens", async () => {
    const graphqlClient = getGraphQLClient({});
    const email = faker.internet.email();
    const password = "StrongPassword123!";
    const keycloakId = faker.string.uuid();
    const token = AuthHelper.generateJwt({
      email,
      action: "finalize-registration",
    });

    vi.spyOn(AuthHelper, "getJWTContent").mockReturnValue({
      email,
      action: "finalize-registration",
    });

    vi.spyOn(AuthHelper, "getAccountInIAM").mockResolvedValue(null);

    const createAccountSpy = vi
      .spyOn(AuthHelper, "createAccountInIAM")
      .mockResolvedValue(keycloakId);

    const resetPasswordSpy = vi
      .spyOn(AuthHelper, "resetPassword")
      .mockResolvedValue(undefined);

    const tokens = {
      accessToken: "access-token",
      refreshToken: "refresh-token",
      idToken: "id-token",
    };

    const generateTokensSpy = vi
      .spyOn(AuthHelper, "generateIAMTokenWithPassword")
      .mockResolvedValue(tokens);

    const result = await graphqlClient.request(resetPasswordMutation, {
      token,
      password,
    });

    expect(result.candidate_resetPassword).toEqual(tokens);

    expect(createAccountSpy).toHaveBeenCalledWith({ email }, "", ["candidate"]);
    expect(resetPasswordSpy).toHaveBeenCalledWith(keycloakId, password, "");
    expect(generateTokensSpy).toHaveBeenCalledWith(keycloakId, password, "");

    const candidate = await prismaClient.candidate.findUnique({
      where: { email },
    });

    expect(candidate).not.toBeNull();
    expect(candidate?.keycloakId).toBe(keycloakId);
    expect(candidate?.firstname).toBe("");
    expect(candidate?.lastname).toBe("");

    const candidacy = await prismaClient.candidacy.findFirst({
      where: { candidateId: candidate?.id },
    });

    expect(candidacy).not.toBeNull();
    expect(candidacy?.typeAccompagnement).toBe("ACCOMPAGNE");
  });

  test("updates certification when certification is available", async () => {
    const certification = await createCertificationHelper({
      feasibilityFormat: FeasibilityFormat.DEMATERIALIZED,
    });

    const graphqlClient = getGraphQLClient({});
    const email = faker.internet.email();
    const password = "StrongPassword123!";
    const keycloakId = faker.string.uuid();
    const token = AuthHelper.generateJwt({
      email,
      action: "finalize-registration",
      certificationId: certification.id,
    });

    vi.spyOn(AuthHelper, "getJWTContent").mockReturnValue({
      email,
      action: "finalize-registration",
      certificationId: certification.id,
    });

    vi.spyOn(AuthHelper, "getAccountInIAM").mockResolvedValue(null);

    vi.spyOn(AuthHelper, "createAccountInIAM").mockResolvedValue(keycloakId);
    vi.spyOn(AuthHelper, "resetPassword").mockResolvedValue(undefined);
    vi.spyOn(AuthHelper, "generateIAMTokenWithPassword").mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      idToken: "id-token",
    });

    await graphqlClient.request(resetPasswordMutation, { token, password });

    const candidate = await prismaClient.candidate.findUnique({
      where: { email },
    });

    const candidacy = await prismaClient.candidacy.findFirst({
      where: { candidateId: candidate?.id },
    });

    expect(candidacy?.certificationId).toBe(certification.id);
    expect(candidacy?.feasibilityFormat).toBe(certification.feasibilityFormat);
  });

  test("resets password when an IAM account already exists", async () => {
    const graphqlClient = getGraphQLClient({});
    const password = "StrongPassword123!";
    const keycloakId = faker.string.uuid();
    const existingCandidate = await createCandidateHelper({
      keycloakId,
    });
    const token = AuthHelper.generateJwt({
      email: existingCandidate.email,
      action: "finalize-registration",
    });

    vi.spyOn(AuthHelper, "getAccountInIAM").mockResolvedValue({
      id: keycloakId,
    });

    const createAccountSpy = vi.spyOn(AuthHelper, "createAccountInIAM");
    const resetPasswordSpy = vi
      .spyOn(AuthHelper, "resetPassword")
      .mockResolvedValue(undefined);

    const tokens = {
      accessToken: "access-token",
      refreshToken: "refresh-token",
      idToken: "id-token",
    };

    const generateTokensSpy = vi
      .spyOn(AuthHelper, "generateIAMTokenWithPassword")
      .mockResolvedValue(tokens);

    const result = await graphqlClient.request(resetPasswordMutation, {
      token,
      password,
    });

    expect(createAccountSpy).not.toHaveBeenCalled();
    expect(resetPasswordSpy).toHaveBeenCalledWith(keycloakId, password, "");
    expect(generateTokensSpy).toHaveBeenCalledWith(keycloakId, password, "");
    expect(result.candidate_resetPassword).toEqual(tokens);

    const updatedCandidate = await prismaClient.candidate.findUnique({
      where: { id: existingCandidate.id },
    });

    expect(updatedCandidate?.passwordUpdatedAt).not.toBeNull();
  });
});
