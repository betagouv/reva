import { Page } from "@playwright/test";

import adminToken from "./tokens/adminToken.json";
import gestionnaireVaeCollectiveToken from "./tokens/gestionnaireVaeCollectiveToken.json";
import sousCompteVaeCollectiveToken from "./tokens/sousCompteVaeCollectiveToken.json";

const TOKENS_BY_ROLE = {
  admin: adminToken,
  gestionnaireVaeCollective: gestionnaireVaeCollectiveToken,
  sousCompteVaeCollective: sousCompteVaeCollectiveToken,
};

export const login = async ({
  page,
  role,
}: {
  page: Page;
  role: keyof typeof TOKENS_BY_ROLE | "notConnected";
}) => {
  await page.route(
    "**/auth/realms/reva/protocol/openid-connect/3p-cookies/step1.html",
    async (route) => {
      await route.fulfill({
        path: "tests/shared/utils/auth/pages/step1.html",
      });
    },
  );
  await page.route(
    "**/realms/reva/protocol/openid-connect/login-status-iframe.html",
    async (route) => {
      await route.fulfill({
        path: "tests/shared/utils/auth/pages/status-iframe.html",
      });
    },
  );
  await page.route("**/vae-collective/silent-check-sso.html", async (route) => {
    await route.fulfill({
      path: `tests/shared/utils/auth/pages/silent-check-sso.html`,
    });
  });

  await page.route(
    "**/realms/reva/protocol/openid-connect/auth**",
    async (route) => {
      await route.fulfill({
        path: `tests/shared/utils/auth/pages/mock-redirect-to-silent-check-sso.html`,
      });
    },
  );

  if (role === "notConnected") {
    await page.route(
      "**/realms/reva/protocol/openid-connect/token",
      async (route) => {
        await route.fulfill({
          json: {},
        });
      },
    );
  } else {
    const tokens = TOKENS_BY_ROLE[role];

    await page.route(
      "**/realms/reva/protocol/openid-connect/token",
      async (route) => {
        await route.fulfill({
          json: tokens,
        });
      },
    );

    // Authentification simulee via les cookies persistants lus par
    // KeycloakProvider au mount : /post-login exige un cookie httpOnly
    // pose par l'action serveur, inaccessible cote test.
    await page.context().addCookies([
      {
        name: "VAE_COLLECTIVE_AUTH_TOKENS_ACCESS_TOKEN",
        value: tokens.access_token,
        path: "/vae-collective",
        domain: "localhost",
        sameSite: "Strict",
        secure: false,
        httpOnly: false,
      },
      {
        name: "VAE_COLLECTIVE_AUTH_TOKENS_REFRESH_TOKEN",
        value: tokens.refresh_token,
        path: "/vae-collective",
        domain: "localhost",
        sameSite: "Strict",
        secure: false,
        httpOnly: false,
      },
      {
        name: "VAE_COLLECTIVE_AUTH_TOKENS_ID_TOKEN",
        value: tokens.access_token,
        path: "/vae-collective",
        domain: "localhost",
        sameSite: "Strict",
        secure: false,
        httpOnly: false,
      },
    ]);
  }
};
