import { getAccountInIAM } from "@/modules/shared/auth/auth.helper";

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

  if (existingAccount) {
    throw new Error(
      "Un compte existe déjà avec cette adresse email. Veuillez vous connecter ou utiliser la récupération de mot de passe.",
    );
  }

  await sendRegistrationWithPasswordEmail({ email, certificationId });

  return "ok";
};
