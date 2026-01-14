import * as AuthHelper from "@/modules/shared/auth/auth.helper";
import { getGraphQLClient } from "@/test/test-graphql-client";

import { graphql } from "../../graphql/generated";
import * as LoginEmailModule from "../emails/sendLoginEmail";
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

    const loginEmailSpy = vi
      .spyOn(LoginEmailModule, "sendLoginEmail")
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
    expect(loginEmailSpy).not.toHaveBeenCalled();
  });

  test("sends login email when an IAM account already exists", async () => {
    const graphqlClient = getGraphQLClient({});
    vi.spyOn(AuthHelper, "getAccountInIAM").mockResolvedValue({
      id: "existing-account",
    });

    const registrationEmailSpy = vi
      .spyOn(RegistrationEmailModule, "sendRegistrationWithPasswordEmail")
      .mockResolvedValue(undefined);

    const loginEmailSpy = vi
      .spyOn(LoginEmailModule, "sendLoginEmail")
      .mockResolvedValue(undefined);

    const result = await graphqlClient.request(
      askForRegistrationWithPasswordMutation,
      {
        email: "alice.doe@example.com",
        certificationId: "certification-id",
      },
    );

    expect(result.candidate_askForRegistrationWithPassword).toBe("ok");
    expect(registrationEmailSpy).not.toHaveBeenCalled();
    expect(loginEmailSpy).toHaveBeenCalledWith("alice.doe@example.com");
  });
});
