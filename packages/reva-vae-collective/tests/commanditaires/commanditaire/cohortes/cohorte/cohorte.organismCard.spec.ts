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

test.describe("organism card", () => {
  test.describe("when the certification is not set", () => {
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
            mockQueryActiveFeatures(),
            mockQueryGetUserPermissions(["MODIFIER_COHORTE"]),
          ],
          { scope: "test" },
        ],
      });
      test("when i access the page, the empty organism card should be disabled and display the correct text", async ({
        page,
      }) => {
        await login({ page, role: "gestionnaireVaeCollective" });

        await page.goto(
          "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/cohortes/0eda2cbf-78ae-47af-9f28-34d05f972712",
        );

        await expect(
          await page.getByTestId("empty-organism-card").locator("button"),
        ).toBeDisabled();

        await expect(
          await page.getByTestId("empty-organism-card"),
        ).toContainText(
          "Liste accessible une fois la certification sélectionnée.",
        );
      });
    });
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
      test("when i access the page, the empty organism card should be readonly and display the correct text", async ({
        page,
      }) => {
        await login({ page, role: "gestionnaireVaeCollective" });

        await page.goto(
          "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/cohortes/0eda2cbf-78ae-47af-9f28-34d05f972712",
        );

        await expect(
          await page.getByTestId("empty-organism-card"),
        ).toBeEnabled();

        await expect(
          await page.getByTestId("empty-organism-card").locator("a"),
        ).toHaveCount(0);

        await expect(
          await page.getByTestId("empty-organism-card"),
        ).toContainText("Non renseigné");
      });
    });
  });

  test.describe("when the certification is set", () => {
    test.describe("when the organism is not set", () => {
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
                      certificationCohorteVaeCollectives: [
                        {
                          id: "0eda2cbf-78ae-47af-9f28-34d05f972712",
                          certification: {
                            id: "0eda2cbf-78ae-47af-9f28-34d05f972712",
                            certification: {
                              label: "Certification 1",
                              codeRncp: "123456",
                            },
                          },
                        },
                      ],
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

        test("when i access the page, the empty organism card should be displayed", async ({
          page,
        }) => {
          await login({ page, role: "gestionnaireVaeCollective" });

          await page.goto(
            "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/cohortes/0eda2cbf-78ae-47af-9f28-34d05f972712",
          );
          await expect(page.getByTestId("empty-organism-card")).toBeVisible();
        });

        test("when i click on the empty organism card, i should be redirected to the select organism page", async ({
          page,
        }) => {
          await login({ page, role: "gestionnaireVaeCollective" });

          await page.goto(
            "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/cohortes/0eda2cbf-78ae-47af-9f28-34d05f972712",
          );

          await page.getByTestId("empty-organism-card").click();

          await expect(page).toHaveURL(
            "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/cohortes/0eda2cbf-78ae-47af-9f28-34d05f972712/aaps",
          );
        });
      });

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
                      certificationCohorteVaeCollectives: [
                        {
                          id: "0eda2cbf-78ae-47af-9f28-34d05f972712",
                          certification: {
                            id: "0eda2cbf-78ae-47af-9f28-34d05f972712",
                            certification: {
                              label: "Certification 1",
                              codeRncp: "123456",
                            },
                          },
                        },
                      ],
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

        test("when i access the page, the empty organism card should be readonly and display the correct text", async ({
          page,
        }) => {
          await login({ page, role: "gestionnaireVaeCollective" });

          await page.goto(
            "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/cohortes/0eda2cbf-78ae-47af-9f28-34d05f972712",
          );

          await expect(
            await page.getByTestId("empty-organism-card").locator("button"),
          ).toHaveCount(0);

          await expect(
            await page.getByTestId("empty-organism-card"),
          ).toContainText(
            "Choisir un AAP qui sera en charge de cette cohorte.",
          );
        });
      });
    });

    test.describe("when the organism is set", () => {
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
                      certificationCohorteVaeCollectives: [
                        {
                          id: "0eda2cbf-78ae-47af-9f28-34d05f972712",
                          certification: {
                            id: "0eda2cbf-78ae-47af-9f28-34d05f972712",
                            certification: {
                              label: "Certification 1",
                              codeRncp: "123456",
                            },
                          },
                        },
                      ],
                      organism: {
                        id: "0eda2cbf-78ae-47af-9f28-34d05f972712",
                        label: "Organism 1",
                        adresseNumeroEtNomDeRue: "123456",
                        adresseCodePostal: "123456",
                        adresseVille: "123456",
                        emailContact: "123456",
                        telephone: "123456",
                      },
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

        test("when i access the page, the filled organism card should be displayed", async ({
          page,
        }) => {
          await login({ page, role: "gestionnaireVaeCollective" });

          await page.goto(
            "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/cohortes/0eda2cbf-78ae-47af-9f28-34d05f972712",
          );
          await expect(page.getByTestId("filled-organism-card")).toBeVisible();
        });

        test("when i click on the filled organism card, i should be redirected to the select organism page", async ({
          page,
        }) => {
          await login({ page, role: "gestionnaireVaeCollective" });

          await page.goto(
            "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/cohortes/0eda2cbf-78ae-47af-9f28-34d05f972712",
          );

          await expect(
            await page.getByTestId("filled-organism-card").locator("a"),
          ).toBeDefined();

          await page.getByTestId("filled-organism-card").click();

          await expect(page).toHaveURL(
            "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/cohortes/0eda2cbf-78ae-47af-9f28-34d05f972712/aaps",
          );
        });
      });

      test.describe("when the user lacks the MODIFIER_COHORTE permission", () => {
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
                      certificationCohorteVaeCollectives: [
                        {
                          id: "0eda2cbf-78ae-47af-9f28-34d05f972712",
                          certification: {
                            id: "0eda2cbf-78ae-47af-9f28-34d05f972712",
                            certification: {
                              label: "Certification 1",
                              codeRncp: "123456",
                            },
                          },
                        },
                      ],
                      organism: {
                        id: "0eda2cbf-78ae-47af-9f28-34d05f972712",
                        label: "Organism 1",
                        adresseNumeroEtNomDeRue: "123456",
                        adresseCodePostal: "123456",
                        adresseVille: "123456",
                        emailContact: "123456",
                        telephone: "123456",
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

        test("when i access the page, the filled organism card should be readonly", async ({
          page,
        }) => {
          await login({ page, role: "gestionnaireVaeCollective" });

          await page.goto(
            "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/cohortes/0eda2cbf-78ae-47af-9f28-34d05f972712",
          );

          await expect(
            await page.getByTestId("filled-organism-card"),
          ).toBeEnabled();

          await expect(
            await page.getByTestId("filled-organism-card").locator("a"),
          ).toHaveCount(0);

          await expect(
            await page.getByTestId("filled-organism-card"),
          ).not.toContainText("Changer d'AAP");
        });
      });

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
                      certificationCohorteVaeCollectives: [
                        {
                          id: "0eda2cbf-78ae-47af-9f28-34d05f972712",
                          certification: {
                            id: "0eda2cbf-78ae-47af-9f28-34d05f972712",
                            certification: {
                              label: "Certification 1",
                              codeRncp: "123456",
                            },
                          },
                        },
                      ],
                      organism: {
                        id: "0eda2cbf-78ae-47af-9f28-34d05f972712",
                        label: "Organism 1",
                        adresseNumeroEtNomDeRue: "123456",
                        adresseCodePostal: "123456",
                        adresseVille: "123456",
                        emailContact: "123456",
                        telephone: "123456",
                      },
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

        test("when i access the page, the filled organism card should be readonly", async ({
          page,
        }) => {
          await login({ page, role: "gestionnaireVaeCollective" });

          await page.goto(
            "/vae-collective/commanditaires/115c2693-b625-491b-8b91-c7b3875d86a0/cohortes/0eda2cbf-78ae-47af-9f28-34d05f972712",
          );

          await expect(
            await page.getByTestId("filled-organism-card"),
          ).toBeEnabled();

          await expect(
            await page.getByTestId("filled-organism-card").locator("a"),
          ).toHaveCount(0);

          await expect(
            await page.getByTestId("filled-organism-card"),
          ).not.toContainText("Changer d'AAP");
        });
      });
    });
  });
});
