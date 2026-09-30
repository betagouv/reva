import { encodeOtpChallengeToken } from "@/modules/shared/auth/otp-challenge.utils";
import {
  ADRESSE_ELECTRONIQUE_OU_MOT_PASSE_INCORRECT,
  COMPTE_NON_TROUVE,
} from "@/modules/shared/errors/messages";
import { prismaClient } from "@/prisma/client";

import { ClientApp } from "../account.type";
import {
  generateIAMTokenWithPassword,
  getAdminClientIdFor,
  userHasTotpConfigured,
  validatePasswordOnly,
} from "../utils/keycloak.utils";

import { getAccountByEmail } from "./getAccountByEmail";
import { sendEmailOtp } from "./sendEmailOtp";

export const loginWithCredentials = async ({
  email,
  password,
  clientApp,
}: {
  email: string;
  password: string;
  clientApp: ClientApp;
}) => {
  const account = await getAccountByEmail(email);

  if (!account) {
    throw new Error(COMPTE_NON_TROUVE);
  }

  // Valide le MDP d'abord pour distinguer un MDP incorrect d'un OTP incorrect,
  // puis demande l'étape OTP si l'utilisateur en a un configuré.
  const passwordResult = await validatePasswordOnly(
    account.keycloakId,
    password,
  );
  if (!passwordResult.ok) {
    throw new Error(ADRESSE_ELECTRONIQUE_OU_MOT_PASSE_INCORRECT);
  }

  let userOtpType: "authenticator" | "email" | "none" = "none";

  if (account.emailOtpEnabled) {
    userOtpType = "email";
    await sendEmailOtp({ accountId: account.id });
  } else if (await userHasTotpConfigured(account.keycloakId)) {
    userOtpType = "authenticator";
  }

  if (userOtpType === "email" || userOtpType === "authenticator") {
    // Challenge chiffré porté par cookie Next.js: le MDP ne transite pas
    // par le navigateur entre les deux étapes.
    const otpChallengeToken = encodeOtpChallengeToken({
      payload: {
        keycloakId: account.keycloakId,
        realm: process.env.KEYCLOAK_ADMIN_REALM_REVA as string,
        clientId: getAdminClientIdFor(clientApp),
        password,
      },
      otpType: userOtpType,
    });
    return {
      tokens: null,
      account,
      requiresOtp: true,
      otpType: userOtpType,
      otpChallengeToken,
    };
  }

  const tokens = await generateIAMTokenWithPassword(
    account.keycloakId,
    password,
    clientApp,
  );

  await prismaClient.account.update({
    where: { id: account.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    tokens,
    account,
    requiresOtp: false,
    otpChallengeToken: null,
    otpType: "none",
  };
};
