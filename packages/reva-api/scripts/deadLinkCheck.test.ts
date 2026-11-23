import {
  classifyHttpStatus,
  classifyNetworkError,
  extractUrlsFromText,
  normalizeStoredUrl,
} from "./deadLinkCheck";

describe("normalizeStoredUrl", () => {
  test("returns null for empty values and emails", () => {
    expect(normalizeStoredUrl(null)).toBeNull();
    expect(normalizeStoredUrl(undefined)).toBeNull();
    expect(normalizeStoredUrl("   ")).toBeNull();
    expect(normalizeStoredUrl("contact@example.fr")).toBeNull();
  });

  test("returns null when the value is not an http(s) url", () => {
    expect(normalizeStoredUrl("pas un lien")).toBeNull();
    expect(normalizeStoredUrl("ftp://example.fr/file")).toBeNull();
    expect(normalizeStoredUrl("localhost")).toBeNull();
  });

  test("keeps an absolute http(s) url", () => {
    expect(normalizeStoredUrl("  https://example.fr/docs  ")).toBe(
      "https://example.fr/docs",
    );
    expect(normalizeStoredUrl("http://example.fr")).toBe("http://example.fr/");
  });

  test("prefixes https when the value is a hostname without a scheme", () => {
    expect(normalizeStoredUrl("www.example.fr")).toBe(
      "https://www.example.fr/",
    );
    expect(normalizeStoredUrl("example.fr/path")).toBe(
      "https://example.fr/path",
    );
    expect(normalizeStoredUrl("//example.fr/a")).toBe("https://example.fr/a");
  });
});

describe("extractUrlsFromText", () => {
  test("returns no urls when the text has none", () => {
    expect(extractUrlsFromText(null)).toEqual([]);
    expect(extractUrlsFromText("Ressources utiles, sans lien.")).toEqual([]);
  });

  test("extracts distinct absolute urls and drops trailing punctuation", () => {
    expect(
      extractUrlsFromText(
        "Voir https://example.fr/a et https://example.fr/b. Aussi https://example.fr/a",
      ),
    ).toEqual(["https://example.fr/a", "https://example.fr/b"]);

    expect(
      extractUrlsFromText("Le guide (https://example.fr/docs) est en ligne."),
    ).toEqual(["https://example.fr/docs"]);
  });

  test("ignores text that only looks like a host", () => {
    expect(extractUrlsFromText("Site : www.example.fr")).toEqual([]);
  });
});

describe("classifyHttpStatus", () => {
  test("treats a final 2xx or 3xx as healthy", () => {
    expect(classifyHttpStatus(200)).toEqual({
      dead: false,
      httpStatus: 200,
      errorMessage: null,
    });
    expect(classifyHttpStatus(301)).toEqual({
      dead: false,
      httpStatus: 301,
      errorMessage: null,
    });
    expect(classifyHttpStatus(399).dead).toBe(false);
  });

  test("treats 4xx and 5xx as dead", () => {
    for (const status of [400, 401, 403, 404, 429, 500, 503]) {
      expect(classifyHttpStatus(status)).toEqual({
        dead: true,
        httpStatus: status,
        errorMessage: null,
      });
    }
  });
});

describe("classifyNetworkError", () => {
  test("records a network failure without an http status", () => {
    expect(classifyNetworkError(new Error("getaddrinfo ENOTFOUND"))).toEqual({
      dead: true,
      httpStatus: null,
      errorMessage: "getaddrinfo ENOTFOUND",
    });
  });

  test("truncates a long error message", () => {
    const outcome = classifyNetworkError(new Error("x".repeat(800)));
    expect(outcome.dead).toBe(true);
    expect(outcome.httpStatus).toBeNull();
    expect(outcome.errorMessage).toHaveLength(500);
  });

  test("stringifies a non-error throw", () => {
    expect(classifyNetworkError("connection refused")).toEqual({
      dead: true,
      httpStatus: null,
      errorMessage: "connection refused",
    });
  });
});
