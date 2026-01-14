import { getAccountInIAM } from "@/modules/shared/auth/auth.helper";

import { sendLoginEmail } from "../emails/sendLoginEmail";
import { sendRegistrationWithPasswordEmail } from "../emails/sendRegistrationWithPasswordEmail";

export const candidateAskForRegistrationWithPassword = async ({
  email,
  certificationId,
}: {
  email: string;
  certificationId?: string;
}) => {
  const existingAccount = await getAccountInIAM(
    email,
    process.env.KEYCLOAK_APP_REALM as string,
  );

  await (existingAccount
    ? sendLoginEmail(email) // TODO: send link to the futur login page with certification selected
    : sendRegistrationWithPasswordEmail({ email, certificationId }));

  return "ok";
};
