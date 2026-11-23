/* eslint-disable import/no-unused-modules */
const HTTP_URL = /^https?:\/\//i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TRAILING_PUNCTUATION = /[),.;:!?]+$/;

const DEAD_LINK_CHECK_TIMEOUT_MS = 10_000;
const DEAD_LINK_CHECK_USER_AGENT = "RevaDeadLinkChecker";
const DEAD_LINK_ERROR_MESSAGE_MAX_LENGTH = 500;

export type UrlCheckOutcome =
  | { dead: false; httpStatus: number; errorMessage: null }
  | { dead: true; httpStatus: number; errorMessage: null }
  | { dead: true; httpStatus: null; errorMessage: string };

export function normalizeStoredUrl(
  raw: string | null | undefined,
): string | null {
  if (raw == null) {
    return null;
  }

  const trimmed = raw.trim();
  if (!trimmed || EMAIL.test(trimmed)) {
    return null;
  }

  const withScheme = HTTP_URL.test(trimmed)
    ? trimmed
    : trimmed.startsWith("//")
      ? `https:${trimmed}`
      : looksLikeHostname(trimmed)
        ? `https://${trimmed}`
        : null;

  if (!withScheme) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }

  if (!parsed.hostname.includes(".")) {
    return null;
  }

  return parsed.href;
}

export function extractUrlsFromText(
  value: string | null | undefined,
): string[] {
  return readUrlsFromText(value).urls;
}

export function readUrlsFromText(value: string | null | undefined): {
  urls: string[];
  discarded: number;
} {
  if (!value) {
    return { urls: [], discarded: 0 };
  }

  const urls = new Set<string>();
  let discarded = 0;

  for (const match of value.matchAll(/https?:\/\/[^\s<>"']+/gi)) {
    const url = normalizeStoredUrl(match[0].replace(TRAILING_PUNCTUATION, ""));
    if (url) {
      urls.add(url);
    } else {
      discarded += 1;
    }
  }

  return { urls: [...urls], discarded };
}

export function classifyHttpStatus(status: number): UrlCheckOutcome {
  if (status >= 400) {
    return { dead: true, httpStatus: status, errorMessage: null };
  }

  return { dead: false, httpStatus: status, errorMessage: null };
}

export function classifyNetworkError(error: unknown): UrlCheckOutcome {
  const message = error instanceof Error ? error.message : String(error);
  return {
    dead: true,
    httpStatus: null,
    errorMessage: message.slice(0, DEAD_LINK_ERROR_MESSAGE_MAX_LENGTH),
  };
}

export async function checkUrl(url: string): Promise<UrlCheckOutcome> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    DEAD_LINK_CHECK_TIMEOUT_MS,
  );

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "*/*",
        "User-Agent": DEAD_LINK_CHECK_USER_AGENT,
      },
    });
    await response.body?.cancel();
    return classifyHttpStatus(response.status);
  } catch (error) {
    return classifyNetworkError(error);
  } finally {
    clearTimeout(timeout);
  }
}

function looksLikeHostname(value: string): boolean {
  return !value.includes("@") && !/\s/.test(value) && value.includes(".");
}
