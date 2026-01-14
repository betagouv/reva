import * as AuthHelper from "@/modules/shared/auth/auth.helper";
import { prismaClient } from "@/prisma/client";
import { createCandidateHelper } from "@/test/helpers/entities/create-candidate-helper";
import { getGraphQLClient } from "@/test/test-graphql-client";

import { graphql } from "../../graphql/generated";

import * as FinalizeRegistrationModule from "./candidateFinalizeRegistrationWithPassword";

const resetPasswordMutation = graphql(`
  mutation candidate_resetPassword_reset_test(
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

describe("candidateResetPassword", () => {
  test("delegates to finalize registration when action is finalize-registration", async () => {
    const graphqlClient = getGraphQLClient({});
    const password = "StrongPassword123!";
    const tokens = {
      accessToken: "access-token",
      refreshToken: "refresh-token",
      idToken: "id-token",
    };
    const token = AuthHelper.generateJwt({
      email: "candidate@example.com",
      action: "finalize-registration",
    });

    const finalizeSpy = vi
      .spyOn(
        FinalizeRegistrationModule,
        "candidateFinalizeRegistrationWithPassword",
      )
      .mockResolvedValue(tokens);

    const result = await graphqlClient.request(resetPasswordMutation, {
      token,
      password,
    });

    expect(finalizeSpy).toHaveBeenCalledWith({ token, password });
    expect(result.candidate_resetPassword).toEqual(tokens);
  });

  test("resets password and returns tokens when action is reset-password", async () => {
    const graphqlClient = getGraphQLClient({});
    const password = "StrongPassword123!";
    const keycloakId = "199898a1-dd30-4fe8-8b3f-6339d1c5e1b9";
    const candidate = await createCandidateHelper({
      keycloakId,
    });
    const token = AuthHelper.generateJwt({
      email: candidate.email,
      action: "reset-password",
    });

    vi.spyOn(AuthHelper, "getAccountInIAM").mockResolvedValue({
      id: keycloakId,
    });

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

    expect(resetPasswordSpy).toHaveBeenCalledWith(keycloakId, password, "");
    expect(generateTokensSpy).toHaveBeenCalledWith(keycloakId, password, "");
    expect(result.candidate_resetPassword).toEqual(tokens);

    const updatedCandidate = await prismaClient.candidate.findUnique({
      where: { id: candidate.id },
    });

    expect(updatedCandidate?.passwordUpdatedAt).not.toBeNull();
  });
});
