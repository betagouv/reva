import {
  expect,
  graphql,
  HttpResponse,
  test,
} from "next/experimental/testmode/playwright/msw";

import { login } from "../../../shared/utils/auth/login";
import { mockQueryActiveFeatures } from "../../../shared/utils/mockActiveFeatures";
import { mockQueryGetUserPermissions } from "../../../shared/utils/mockGetUserPermissions";

const fvae = graphql.link("https://reva-api/api/graphql");

const parametresPageHandlers = (permissions: string[]) => [
  mockQueryActiveFeatures(),
  mockQueryGetUserPermissions(permissions),
  fvae.query("getConnectedUserAccountForParametresPage", () =>
    HttpResponse.json({
      data: {
        account_getAccountForConnectedUser: {
          id: "b5f0a3f2-6a55-4c1d-9d0c-0f3b8f2a1c11",
          firstname: "Jane",
          lastname: "Doe",
          email: "jane.doe@example.com",
        },
      },
    }),
  ),
];

const PARAMETRES_URL =
  "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/parametres";

test.describe("Paramètres page", () => {
  test.describe("when the user can create cohortes", () => {
    test.use({
      mswHandlers: [
        parametresPageHandlers(["CREER_COHORTE"]),
        { scope: "test" },
      ],
    });

    test("should display the account info and cohorte creation as enabled", async ({
      page,
    }) => {
      await login({ page, role: "sousCompteVaeCollective" });
      await page.goto(PARAMETRES_URL);

      await expect(page.getByText("Jane", { exact: true })).toBeVisible();
      await expect(page.getByText("Doe", { exact: true })).toBeVisible();
      await expect(page.getByText("jane.doe@example.com")).toBeVisible();
      await expect(page.getByText("Activé", { exact: true })).toBeVisible();
    });
  });

  test.describe("when the user cannot create cohortes", () => {
    test.use({
      mswHandlers: [parametresPageHandlers([]), { scope: "test" }],
    });

    test("should display cohorte creation as disabled", async ({ page }) => {
      await login({ page, role: "sousCompteVaeCollective" });
      await page.goto(PARAMETRES_URL);

      await expect(page.getByText("Désactivé", { exact: true })).toBeVisible();
    });
  });
});
