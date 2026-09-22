import {
  expect,
  graphql,
  HttpResponse,
  test,
} from "next/experimental/testmode/playwright/msw";

import { login } from "../../../../shared/utils/auth/login";
import { mockQueryActiveFeatures } from "../../../../shared/utils/mockActiveFeatures";
import { mockQueryGetUserPermissions } from "../../../../shared/utils/mockGetUserPermissions";
const fvae = graphql.link("https://reva-api/api/graphql");

const mockCommanditaireWithNoCohorte = () =>
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
  });

test.describe("Commanditaire with CREER_COHORTE permission", () => {
  test.use({
    mswHandlers: [
      [
        mockCommanditaireWithNoCohorte(),
        mockQueryActiveFeatures(),
        mockQueryGetUserPermissions(["CREER_COHORTE"]),
      ],
      { scope: "test" },
    ],
  });

  test("it should lead me to the create cohorte page when i click on the create cohorte button", async ({
    page,
  }) => {
    await login({ page, role: "gestionnaireVaeCollective" });

    await page.goto(
      "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/cohortes/aucune-cohorte",
    );

    await page.getByRole("link", { name: "Créer une cohorte" }).click();

    await expect(page).toHaveURL(
      "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/cohortes/nouvelle-cohorte",
    );
  });
});

test.describe("Commanditaire without CREER_COHORTE permission", () => {
  test.use({
    mswHandlers: [
      [
        mockCommanditaireWithNoCohorte(),
        mockQueryActiveFeatures(),
        mockQueryGetUserPermissions(),
      ],
      { scope: "test" },
    ],
  });

  test("it should not show the create cohorte button and should explain why when the user lacks the CREER_COHORTE permission", async ({
    page,
  }) => {
    await login({ page, role: "gestionnaireVaeCollective" });

    await page.goto(
      "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/cohortes/aucune-cohorte",
    );

    await expect(
      page.getByRole("link", { name: "Créer une cohorte" }),
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Créer une cohorte" }),
    ).not.toBeVisible();

    await expect(
      page.getByText(
        "Vous n’avez pas la possibilité de créer de cohortes. Cette option est actionnable par votre administrateur à la création de votre compte.",
      ),
    ).toBeVisible();
  });
});
