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

test.describe("delete cohorte button", () => {
  test.describe("when the cohorte status is 'PUBLIE'", () => {
    test.use({
      mswHandlers: [
        [
          fvae.query("getCohorteByIdForCohortePage", () => {
            return HttpResponse.json({
              data: {
                vaeCollective_getCohorteVaeCollectiveById: {
                  id: "0eda2cbf-78ae-47af-9f28-34d05f972712",
                  nom: "macohorte",
                  status: "PUBLIE",
                  certificationCohorteVaeCollectives: [],
                },
              },
            });
          }),
          mockQueryActiveFeatures(),
          mockQueryGetUserPermissions(["MODIFIER_COHORTE"]),
        ],
        { scope: "test" },
      ],
    });

    test("the delete button should not be displayed", async ({ page }) => {
      await login({ page, role: "gestionnaireVaeCollective" });

      await page.goto(
        "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/cohortes/0eda2cbf-78ae-47af-9f28-34d05f972712",
      );

      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "macohorte",
      );

      await expect(
        page.getByRole("button", { name: "Supprimer cette cohorte" }),
      ).toBeHidden();
    });
  });

  test.describe("when the cohorte status is 'BROUILLON'", () => {
    test.use({
      mswHandlers: [
        [
          fvae.query("getCohorteByIdForCohortePage", () => {
            return HttpResponse.json({
              data: {
                vaeCollective_getCohorteVaeCollectiveById: {
                  id: "0eda2cbf-78ae-47af-9f28-34d05f972712",
                  nom: "macohorte",
                  status: "BROUILLON",
                  certificationCohorteVaeCollectives: [],
                },
              },
            });
          }),
          fvae.mutation("deleteCohorteMutation", () => {
            return HttpResponse.json({
              data: {
                vaeCollective_deleteCohorte: null,
              },
            });
          }),
          mockQueryActiveFeatures(),
          mockQueryGetUserPermissions([
            "MODIFIER_COHORTE",
            "SUPPRIMER_COHORTE",
          ]),
        ],
        { scope: "test" },
      ],
    });

    test("the delete button should be enabled", async ({ page }) => {
      await login({ page, role: "gestionnaireVaeCollective" });

      await page.goto(
        "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/cohortes/0eda2cbf-78ae-47af-9f28-34d05f972712",
      );

      await expect(
        page.getByRole("button", { name: "Supprimer cette cohorte" }),
      ).toBeEnabled();
    });

    test("when i click on the delete button, a confirmation modal should be displayed", async ({
      page,
    }) => {
      await login({ page, role: "gestionnaireVaeCollective" });

      await page.goto(
        "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/cohortes/0eda2cbf-78ae-47af-9f28-34d05f972712",
      );
      await page
        .getByRole("button", { name: "Supprimer cette cohorte" })
        .click();
      await expect(
        page.getByRole("heading", {
          name: "La suppression d’une cohorte est irreversible.",
        }),
      ).toBeVisible();
    });

    test("when i click on the modal confirm button, the cohorte should be deleted and i should be redirected to the cohortes list page", async ({
      page,
    }) => {
      await login({ page, role: "gestionnaireVaeCollective" });

      await page.goto(
        "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/cohortes/0eda2cbf-78ae-47af-9f28-34d05f972712",
      );
      await page
        .getByRole("button", { name: "Supprimer cette cohorte" })
        .click();
      await expect(
        page.getByRole("heading", {
          name: "La suppression d’une cohorte est irreversible.",
        }),
      ).toBeVisible();

      await page
        .getByRole("button", { name: "Supprimer", exact: true })
        .click();

      await expect(page).toHaveURL(
        "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/cohortes",
      );
    });

    test.describe("when the user lacks the SUPPRIMER_COHORTE permission", () => {
      test.use({
        mswHandlers: [
          [
            fvae.query("getCohorteByIdForCohortePage", () => {
              return HttpResponse.json({
                data: {
                  vaeCollective_getCohorteVaeCollectiveById: {
                    id: "0eda2cbf-78ae-47af-9f28-34d05f972712",
                    nom: "macohorte",
                    status: "BROUILLON",
                    certificationCohorteVaeCollectives: [],
                  },
                },
              });
            }),
            mockQueryActiveFeatures(),
            mockQueryGetUserPermissions(["MODIFIER_COHORTE"]),
          ],
          { scope: "test" },
        ],
      });

      test("the delete button should not be displayed", async ({ page }) => {
        await login({ page, role: "gestionnaireVaeCollective" });

        await page.goto(
          "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/cohortes/0eda2cbf-78ae-47af-9f28-34d05f972712",
        );

        await expect(
          page.getByRole("button", { name: "Supprimer cette cohorte" }),
        ).toBeHidden();
      });
    });
  });
});
