import { subYears } from "date-fns";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { prismaClient } from "../../prisma/client.js";
import { sendEmailUsingTemplate } from "../../utils/email/sendEmailUsingTemplate.js";

import { sendExpiredApiKeysAlert } from "./sendExpiredApiKeysAlert.js";

const { RECIPIENT } = vi.hoisted(() => {
  const RECIPIENT = "alerts@example.com";
  // The recipient is read at module load, so it must be set before importing
  process.env.EXPIRED_API_KEYS_ALERT_RECIPIENT = RECIPIENT;
  return { RECIPIENT };
});

vi.mock("../../prisma/client.js", () => ({
  prismaClient: { session: { findMany: vi.fn() } },
}));

vi.mock("../../utils/email/sendEmailUsingTemplate.js", () => ({
  sendEmailUsingTemplate: vi.fn(),
}));

const NOW = new Date("2026-11-16T09:00:00+01:00");

const findManyMock = vi.mocked(prismaClient.session.findMany);
const sendEmailMock = vi.mocked(sendEmailUsingTemplate);

describe("sendExpiredApiKeysAlert", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  test("queries only active sessions created more than 1 year ago", async () => {
    findManyMock.mockResolvedValue([]);

    await sendExpiredApiKeysAlert();

    expect(findManyMock).toHaveBeenCalledWith({
      where: { endedAt: null, createdAt: { lt: subYears(NOW, 1) } },
      orderBy: { createdAt: "asc" },
    });
  });

  test("throws when the alert recipient is not configured", async () => {
    vi.stubEnv("EXPIRED_API_KEYS_ALERT_RECIPIENT", "");
    vi.resetModules();
    const { sendExpiredApiKeysAlert: sendAlertWithoutRecipient } =
      await import("./sendExpiredApiKeysAlert.js");

    await expect(sendAlertWithoutRecipient()).rejects.toThrow(
      "EXPIRED_API_KEYS_ALERT_RECIPIENT is not set",
    );
    expect(findManyMock).not.toHaveBeenCalled();
  });

  test("does not send an email when no API key is older than 1 year", async () => {
    findManyMock.mockResolvedValue([]);

    await sendExpiredApiKeysAlert();

    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  test("sends an email to the tech team listing expired API keys without exposing the full key", async () => {
    const session = {
      id: "0d2f6a8e-1234-4cde-9abc-def012345678",
      keycloakId: "5b0c1d2e-3f40-4a5b-8c6d-7e8f9a0b1c2d",
      createdAt: new Date("2025-03-10T12:00:00Z"),
      updatedAt: null,
      endedAt: null,
    };
    findManyMock.mockResolvedValue([session]);

    await sendExpiredApiKeysAlert();

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).toHaveBeenCalledWith({
      to: { email: RECIPIENT },
      templateId: 794,
      params: {
        apiKeys: [
          {
            keyPrefix: "0d2f6a",
            createdAt: "10/03/2025",
          },
        ],
      },
    });
    expect(JSON.stringify(sendEmailMock.mock.calls[0][0])).not.toContain(
      session.id,
    );
  });
});
