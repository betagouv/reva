import { formatDuration, intervalToDuration } from "date-fns";

import { createAccount } from "@/modules/account/features/createAccount";
import { generateJwt } from "@/modules/shared/auth/jwt.helper";
import { sendEmailUsingTemplate } from "@/modules/shared/email/sendEmailUsingTemplate";
import { prismaClient } from "@/prisma/client";

export const createCommanditaireVaeCollective = async ({
  raisonSociale,
  gestionnaireEmail,
  gestionnaireFirstname,
  gestionnaireLastname,
}: {
  raisonSociale: string;
  gestionnaireEmail: string;
  gestionnaireFirstname: string;
  gestionnaireLastname: string;
}) => {
  //Create account
  const account = await createAccount({
    email: gestionnaireEmail,
    username: gestionnaireEmail,
    firstname: gestionnaireFirstname,
    lastname: gestionnaireLastname,
    group: "commanditaire_vae_collective",
    dontSendKeycloakEmail: true,
  });

  //Create commanditaire VAE collective
  const commanditaireVaeCollective =
    await prismaClient.commanditaireVaeCollective.create({
      data: {
        raisonSociale,
        gestionnaireAccountId: account.id,
      },
    });

  //Send email to setup password
  await sendSetupPasswordEmail({
    raisonSociale,
    email: gestionnaireEmail,
    firstname: gestionnaireFirstname,
    lastname: gestionnaireLastname,
  });

  return commanditaireVaeCollective;
};

const sendSetupPasswordEmail = async ({
  email,
  raisonSociale,
}: {
  email: string;
  raisonSociale: string;
  firstname: string;
  lastname: string;
}) => {
  const TOKEN_EXPIRATION_IN_SECONDS = 4 * 24 * 60 * 60;
  const baseUrl = process.env.BASE_URL || "https://vae.gouv.fr";
  const token = generateJwt(
    { email, action: "reset-password" },
    TOKEN_EXPIRATION_IN_SECONDS,
  );
  const url = new URL(
    `/vae-collective/reset-password?resetPasswordToken=${token}`,
    baseUrl,
  );

  const tokenDuration = intervalToDuration({
    start: 0,
    end: TOKEN_EXPIRATION_IN_SECONDS * 1000,
  });
  const humanReadableTokenDuration = formatDuration(tokenDuration);

  await sendEmailUsingTemplate({
    to: { email },
    templateId: 635,
    params: {
      raisonSociale,
      setupPasswordUrl: url.toString(),
      tokenDuration: humanReadableTokenDuration,
    },
  });
};
