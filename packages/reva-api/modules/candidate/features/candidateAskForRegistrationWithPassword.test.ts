import * as AuthHelper from "@/modules/shared/auth/auth.helper";
import { getGraphQLClient, getGraphQLError } from "@/test/test-graphql-client";

import { graphql } from "../../graphql/generated";
import * as RegistrationEmailModule from "../emails/sendRegistrationWithPasswordEmail";

const askForRegistrationWithPasswordMutation = graphql(`
  mutation candidate_askForRegistrationWithPassword_test(
    $email: String!
    $certificationId: String
  ) {
    candidate_askForRegistrationWithPassword(
      email: $email
      certificationId: $certificationId
    )
  }
`);

describe("candidateAskForRegistrationWithPassword", () => {
  test("sends registration email when no IAM account exists", async () => {
    const graphqlClient = getGraphQLClient({});
    const getAccountSpy = vi
      .spyOn(AuthHelper, "getAccountInIAM")
      .mockResolvedValue(null);

    const sendEmailSpy = vi
      .spyOn(RegistrationEmailModule, "sendRegistrationWithPasswordEmail")
      .mockResolvedValue(undefined);

    const result = await graphqlClient.request(
      askForRegistrationWithPasswordMutation,
      {
        email: "alice.doe@example.com",
        certificationId: "certification-id",
      },
    );

    expect(result.candidate_askForRegistrationWithPassword).toBe("ok");
    expect(getAccountSpy).toHaveBeenCalledWith("alice.doe@example.com", "");
    expect(sendEmailSpy).toHaveBeenCalledWith({
      email: "alice.doe@example.com",
      certificationId: "certification-id",
    });
  });

  test("throws when an IAM account already exists", async () => {
    const graphqlClient = getGraphQLClient({});
    vi.spyOn(AuthHelper, "getAccountInIAM").mockResolvedValue({
      id: "existing-account",
    });

    const sendEmailSpy = vi
      .spyOn(RegistrationEmailModule, "sendRegistrationWithPasswordEmail")
      .mockResolvedValue(undefined);

    try {
      await graphqlClient.request(askForRegistrationWithPasswordMutation, {
        email: "alice.doe@example.com",
        certificationId: "certification-id",
      });
      throw new Error("Expected error");
    } catch (error) {
      expect(getGraphQLError(error)).toContain(
        "Un compte existe déjà avec cette adresse email. Veuillez vous connecter ou utiliser la récupération de mot de passe.",
      );
    }
    expect(sendEmailSpy).not.toHaveBeenCalled();
  });
});
