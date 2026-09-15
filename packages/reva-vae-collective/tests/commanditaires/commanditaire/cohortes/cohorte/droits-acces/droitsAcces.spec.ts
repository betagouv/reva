import {
  expect,
  graphql,
  HttpResponse,
  test,
} from "next/experimental/testmode/playwright/msw";

import { login } from "../../../../../shared/utils/auth/login";
import { mockQueryActiveFeatures } from "../../../../../shared/utils/mockActiveFeatures";
import { mockQueryGetUserPermissions } from "../../../../../shared/utils/mockGetUserPermissions";

const fvae = graphql.link("https://reva-api/api/graphql");

const commanditaireId = "115c2693-b625-491b-8b91-c7b3875d86a0";
const cohorteVaeCollectiveId = "0eda2cbf-78ae-47af-9f28-34d05f972712";
const pageUrl = `/vae-collective/commanditaires/${commanditaireId}/cohortes/${cohorteVaeCollectiveId}/droits-acces`;

test.describe("Cohorte with more than one page of sous comptes", () => {
  const firstPageRows = Array.from({ length: 10 }, (_, i) => ({
    id: `sous-compte-page1-${i}`,
    account: {
      firstname: "Jean",
      lastname: `Dupont${i}`,
      email: `jean.dupont${i}@example.com`,
    },
  }));
  const secondPageRows = [
    {
      id: "sous-compte-page2-0",
      account: {
        firstname: "Marie",
        lastname: "Curie",
        email: "marie.curie@example.com",
      },
    },
  ];

  test.use({
    mswHandlers: [
      [
        fvae.query(
          "getCommanditaireVaeCollectiveAndCohorteByIdQuery",
          ({ variables }) => {
            const rows =
              variables.offset === 0 ? firstPageRows : secondPageRows;
            return HttpResponse.json({
              data: {
                vaeCollective_getCommanditaireVaeCollective: {
                  id: commanditaireId,
                  sousComptes: {
                    info: { totalRows: 11 },
                    rows,
                  },
                },
                vaeCollective_getCohorteVaeCollectiveById: {
                  id: cohorteVaeCollectiveId,
                  nom: "macohorte",
                },
              },
            });
          },
        ),
        mockQueryActiveFeatures(),
        mockQueryGetUserPermissions(),
      ],
      { scope: "test" },
    ],
  });

  test("it should display only the first 10 sous comptes", async ({ page }) => {
    await login({ page, role: "gestionnaireVaeCollective" });

    await page.goto(pageUrl);

    await expect(
      page.getByRole("heading", { name: "Droits d'accès" }),
    ).toBeVisible();

    await expect(page.getByText("Dupont0 Jean")).toBeVisible();
    await expect(page.getByText("jean.dupont0@example.com")).toBeVisible();
    await expect(page.getByText("Curie Marie")).not.toBeVisible();
  });

  test("it should navigate to the next page", async ({ page }) => {
    await login({ page, role: "gestionnaireVaeCollective" });

    await page.goto(pageUrl);

    await page.getByRole("link", { name: "2", exact: true }).click();

    await expect(page).toHaveURL(`${pageUrl}?page=2`);
    await expect(page.getByText("Curie Marie")).toBeVisible();
    await expect(page.getByText("marie.curie@example.com")).toBeVisible();
  });

  test("it should lead me back to the cohorte page when i click on the back button", async ({
    page,
  }) => {
    await login({ page, role: "gestionnaireVaeCollective" });

    await page.goto(pageUrl);

    await page.getByRole("link", { name: "Retour" }).click();

    await page.waitForURL(
      `/vae-collective/commanditaires/${commanditaireId}/cohortes/${cohorteVaeCollectiveId}`,
    );
  });
});
