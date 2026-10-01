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

const commanditaireId = "115c2693-b625-491b-8b91-c7b3875d86a0";
const cohorteVaeCollectiveId = "0eda2cbf-78ae-47af-9f28-34d05f972712";
const cohortePageUrl = `/vae-collective/commanditaires/${commanditaireId}/cohortes/${cohorteVaeCollectiveId}`;

const mockGetCohorteByIdForCohortePage = (candidacyCount: number) =>
  fvae.query("getCohorteByIdForCohortePage", () => {
    return HttpResponse.json({
      data: {
        vaeCollective_getCohorteVaeCollectiveById: {
          id: cohorteVaeCollectiveId,
          nom: "macohorte",
          status: "BROUILLON",
          certificationCohorteVaeCollectives: [],
          candidacyCount,
        },
      },
    });
  });

test.describe("candidacy count card", () => {
  test.describe("when the cohorte has no candidacy", () => {
    test.use({
      mswHandlers: [
        [
          mockGetCohorteByIdForCohortePage(0),
          mockQueryActiveFeatures(),
          mockQueryGetUserPermissions(["MODIFIER_COHORTE"]),
        ],
        { scope: "test" },
      ],
    });

    test("the card should display that there is no candidacy and should not be a link", async ({
      page,
    }) => {
      await login({ page, role: "gestionnaireVaeCollective" });

      await page.goto(cohortePageUrl);

      const card = page.getByTestId("candidacy-count-card");

      await expect(card).toContainText("Aucune candidature");
      await expect(card).toContainText(
        "Candidatures en cours sur cette cohorte",
      );
      await expect(card.getByRole("link")).toHaveCount(0);
    });
  });

  test.describe("when the cohorte has candidacies", () => {
    test.use({
      mswHandlers: [
        [
          mockGetCohorteByIdForCohortePage(3),
          mockQueryActiveFeatures(),
          mockQueryGetUserPermissions(["MODIFIER_COHORTE"]),
        ],
        { scope: "test" },
      ],
    });

    test("the card should display the candidacy count", async ({ page }) => {
      await login({ page, role: "gestionnaireVaeCollective" });

      await page.goto(cohortePageUrl);

      const card = page.getByTestId("candidacy-count-card");

      await expect(card).toContainText("3 candidatures");
      await expect(card).toContainText(
        "Candidatures en cours sur cette cohorte",
      );
      await expect(card).toContainText("Consulter");
    });

    test("clicking the card should lead to the candidatures page", async ({
      page,
    }) => {
      await login({ page, role: "gestionnaireVaeCollective" });

      await page.goto(cohortePageUrl);

      await page
        .getByTestId("candidacy-count-card")
        .getByRole("link", { name: "Candidatures en cours sur cette cohorte" })
        .click();

      await expect(page).toHaveURL(`${cohortePageUrl}/candidatures`);
    });
  });
});
