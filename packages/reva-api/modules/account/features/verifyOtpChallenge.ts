import { generateIAMTokenWithPasswordShared } from "@/modules/shared/auth/keycloak-token.utils";
import { decodeOtpChallengeToken } from "@/modules/shared/auth/otp-challenge.utils";
import {
  COMPTE_NON_TROUVE,
  SESSION_VERIFICATION_EXPIREE_VEUILLEZ_VOUS_RECONNECTER,
} from "@/modules/shared/errors/messages";

import { getAccountByKeycloakId } from "./getAccountByKeycloakId";
import { verifyEmailOtp } from "./verifyEmailOtp";

type AccountTokens = {
  accessToken: string;
  refreshToken: string;
  idToken: string;
};

export const verifyOtpChallenge = async ({
  challengeToken,
  otp,
}: {
  challengeToken: string;
  otp: string;
}) => {
  const payload = decodeOtpChallengeToken(challengeToken);
  if (!payload) {
    throw new Error(SESSION_VERIFICATION_EXPIREE_VEUILLEZ_VOUS_RECONNECTER);
  }

  const account = await getAccountByKeycloakId({
    keycloakId: payload.keycloakId,
  });
  if (!account) {
    throw new Error(COMPTE_NON_TROUVE);
  }

  let tokens: AccountTokens | null = null;

  // 2 types d'OTP: email et authenticator.
  // Si l'account de l'utilisateur a le flag emailOtpEnabled c'est un OTP email géré par l'API, sinon c'est un OTP authenticator géré par Keycloak.
  if (account.emailOtpEnabled) {
    await verifyEmailOtp({ accountId: account.id, userOtp: otp });
    tokens = await generateIAMTokenWithPasswordShared({
      realm: payload.realm,
      clientId: payload.clientId,
      clientSecret: process.env.KEYCLOAK_ADMIN_CLIENT_SECRET as string,
      userId: payload.keycloakId,
      password: payload.password,
    });
  } else {
    // Secret partagé entre reva-admin et reva-vae-collective: pas besoin du wrapper clientApp.
    tokens = await generateIAMTokenWithPasswordShared({
      realm: payload.realm,
      clientId: payload.clientId,
      clientSecret: process.env.KEYCLOAK_ADMIN_CLIENT_SECRET as string,
      userId: payload.keycloakId,
      password: payload.password,
      totp: otp,
    });
  }

  return { tokens, account };
};
