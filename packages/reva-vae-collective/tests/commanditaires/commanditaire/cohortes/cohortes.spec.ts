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

test.describe("Commanditaire with no cohorte", () => {
  test.use({
    mswHandlers: [
      [
        fvae.query("commanditaireVaeCollectiveForCohortesPage", () => {
          return HttpResponse.json({
            data: {
              vaeCollective_getCommanditaireVaeCollective: {
                id: "115c2693-b625-491b-8b91-c7b3875d86a0",
                raisonSociale: "moncommanditaire",
                cohorteVaeCollectives: {
                  rows: [],
                  info: {
                    totalRows: 0,
                  },
                },
              },
            },
          });
        }),
        mockQueryActiveFeatures(),
        mockQueryGetUserPermissions(),
      ],
      { scope: "test" },
    ],
  });

  test("it should redirect to the aucune-cohorte page", async ({ page }) => {
    await login({ page, role: "gestionnaireVaeCollective" });

    await page.goto(
      "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/cohortes",
    );

    await expect(page).toHaveURL(
      "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/cohortes/aucune-cohorte",
    );
  });
});

test.describe("Commanditaire with multiple cohortes", () => {
  test.use({
    mswHandlers: [
      [
        fvae.query("commanditaireVaeCollectiveForCohortesPage", () => {
          return HttpResponse.json({
            data: {
              vaeCollective_getCommanditaireVaeCollective: {
                id: "115c2693-b625-491b-8b91-c7b3875d86a0",
                raisonSociale: "moncommanditaire",
                cohorteVaeCollectives: {
                  rows: [
                    {
                      id: "dd419130-551f-40ca-9b49-730eeb95ed2d",
                      nom: "maCohorte",
                      status: "BROUILLON",
                      createdAt: 1752593034738,
                      organism: {
                        id: "0837631c-797f-435c-bda9-b41e75117543",
                        label: "Demain",
                      },
                    },
                    {
                      id: "dd419130-551f-40ca-9b49-730eeb95ed2d",
                      nom: "maDeuxiemeCohorte",
                      status: "PUBLIE",
                      createdAt: 1752593034738,
                    },
                  ],
                  info: {
                    totalRows: 2,
                  },
                },
              },
            },
          });
        }),
        mockQueryActiveFeatures(),
        mockQueryGetUserPermissions(["CREER_COHORTE"]),
      ],
      { scope: "test" },
    ],
  });

  test("it should display the cohortes list", async ({ page }) => {
    await login({ page, role: "gestionnaireVaeCollective" });

    await page.goto(
      "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/cohortes",
    );

    await expect(page).toHaveURL(
      "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/cohortes",
    );

    await expect(page.getByText("Cohortes")).toBeVisible();

    await expect(page.getByTestId("cohorte-card")).toHaveCount(2);

    await expect(
      page.getByTestId("cohorte-card").first().getByRole("heading"),
    ).toHaveText("maCohorte");
    await expect(
      page.getByTestId("cohorte-card").first().getByTestId("organism"),
    ).toHaveText("Demain");
  });

  test("it should display the draft cohorte status badge only when the cohorte status is 'BROUILLON'", async ({
    page,
  }) => {
    await login({ page, role: "gestionnaireVaeCollective" });

    await page.goto(
      "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/cohortes",
    );

    await expect(
      page
        .getByTestId("cohorte-card")
        .first()
        .getByTestId("draft-status-badge"),
    ).toBeVisible();

    await expect(
      page.getByTestId("cohorte-card").nth(1).getByTestId("draft-status-badge"),
    ).toBeHidden();
  });

  test("it should display the active cohorte status badge only when the cohorte status is 'PUBLIE'", async ({
    page,
  }) => {
    await login({ page, role: "gestionnaireVaeCollective" });

    await page.goto(
      "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/cohortes",
    );
    await expect(
      page
        .getByTestId("cohorte-card")
        .first()
        .getByTestId("active-status-badge"),
    ).toBeHidden();
    await expect(
      page
        .getByTestId("cohorte-card")
        .nth(1)
        .getByTestId("active-status-badge"),
    ).toBeVisible();
  });

  test("it should lead me to the create cohorte page when i click on the create cohorte button", async ({
    page,
  }) => {
    await login({ page, role: "gestionnaireVaeCollective" });

    await page.goto(
      "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/cohortes",
    );

    await page.getByRole("link", { name: "Créer une cohorte" }).click();

    await expect(page).toHaveURL(
      "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/cohortes/nouvelle-cohorte",
    );
  });

  test("it should lead me to the cohorte details page when i click on a cohorte card card", async ({
    page,
  }) => {
    await login({ page, role: "gestionnaireVaeCollective" });

    await page.goto(
      "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/cohortes",
    );

    await page.getByTestId("cohorte-card").first().click();

    await expect(page).toHaveURL(
      "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/cohortes/dd419130-551f-40ca-9b49-730eeb95ed2d",
    );
  });
});

test.describe("Commanditaire with multiple cohortes and no CREER_COHORTE permission", () => {
  test.use({
    mswHandlers: [
      [
        fvae.query("commanditaireVaeCollectiveForCohortesPage", () => {
          return HttpResponse.json({
            data: {
              vaeCollective_getCommanditaireVaeCollective: {
                id: "115c2693-b625-491b-8b91-c7b3875d86a0",
                raisonSociale: "moncommanditaire",
                cohorteVaeCollectives: {
                  rows: [
                    {
                      id: "dd419130-551f-40ca-9b49-730eeb95ed2d",
                      nom: "maCohorte",
                      status: "BROUILLON",
                      createdAt: 1752593034738,
                      organism: {
                        id: "0837631c-797f-435c-bda9-b41e75117543",
                        label: "Demain",
                      },
                    },
                  ],
                  info: {
                    totalRows: 1,
                  },
                },
              },
            },
          });
        }),
        mockQueryActiveFeatures(),
        mockQueryGetUserPermissions(),
      ],
      { scope: "test" },
    ],
  });

  test("it should disable the create cohorte button when the user lacks the CREER_COHORTE permission", async ({
    page,
  }) => {
    await login({ page, role: "gestionnaireVaeCollective" });

    await page.goto(
      "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/cohortes",
    );

    await expect(
      page.getByRole("button", { name: "Créer une cohorte" }),
    ).toBeDisabled();
  });
});
