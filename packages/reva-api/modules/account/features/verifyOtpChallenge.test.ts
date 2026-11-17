import * as KeycloakTokenUtils from "@/modules/shared/auth/keycloak-token.utils";
import { encodeOtpChallengeToken } from "@/modules/shared/auth/otp-challenge.utils";
import { prismaClient } from "@/prisma/client";
import { createAccountHelper } from "@/test/helpers/entities/create-account-helper";

import { verifyOtpChallenge } from "./verifyOtpChallenge";

const ORIGINAL_ENV = { ...process.env };

beforeAll(() => {
  process.env.JWT_PRIVATE_KEY = "test-jwt-private-key";
  process.env.DATA_ENCRYPT_PRIVATE_KEY = "test-data-encrypt-private-key";
});

afterAll(() => {
  process.env = { ...ORIGINAL_ENV };
});

const tokens = { accessToken: "AT", refreshToken: "RT", idToken: "IT" };

const buildChallengeToken = (keycloakId: string) =>
  encodeOtpChallengeToken({
    payload: {
      keycloakId,
      realm: "reva-admin",
      clientId: "reva-admin",
      password: "StrongPassword123!",
    },
    otpType: "authenticator",
  });

const getLastLoginAt = async (accountId: string) =>
  (await prismaClient.account.findUnique({ where: { id: accountId } }))
    ?.lastLoginAt;

describe("verifyOtpChallenge", () => {
  test("authenticator OTP: returns tokens and updates lastLoginAt", async () => {
    const account = await createAccountHelper({ lastLoginAt: null });
    vi.spyOn(
      KeycloakTokenUtils,
      "generateIAMTokenWithPasswordShared",
    ).mockResolvedValue(tokens);

    const result = await verifyOtpChallenge({
      challengeToken: buildChallengeToken(account.keycloakId),
      otp: "123456",
    });

    expect(result.tokens).toEqual(tokens);
    expect(result.account.id).toBe(account.id);
    expect(await getLastLoginAt(account.id)).not.toBeNull();
  });

  test("email OTP: returns tokens and updates lastLoginAt", async () => {
    const account = await createAccountHelper({
      lastLoginAt: null,
      emailOtpEnabled: true,
    });
    await prismaClient.accountEmailOtp.create({
      data: { accountId: account.id, otp: "123456" },
    });
    vi.spyOn(
      KeycloakTokenUtils,
      "generateIAMTokenWithPasswordShared",
    ).mockResolvedValue(tokens);

    const result = await verifyOtpChallenge({
      challengeToken: buildChallengeToken(account.keycloakId),
      otp: "123456",
    });

    expect(result.tokens).toEqual(tokens);
    expect(await getLastLoginAt(account.id)).not.toBeNull();
  });

  test("does not update lastLoginAt when the OTP is rejected", async () => {
    const account = await createAccountHelper({ lastLoginAt: null });
    vi.spyOn(
      KeycloakTokenUtils,
      "generateIAMTokenWithPasswordShared",
    ).mockRejectedValue(new Error("Code de vérification (OTP) invalide"));

    await expect(
      verifyOtpChallenge({
        challengeToken: buildChallengeToken(account.keycloakId),
        otp: "000000",
      }),
    ).rejects.toThrow("Code de vérification (OTP) invalide");

    expect(await getLastLoginAt(account.id)).toBeNull();
  });
});
