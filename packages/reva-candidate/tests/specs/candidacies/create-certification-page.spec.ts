import {
  expect,
  graphql,
  test,
} from "next/experimental/testmode/playwright/msw";

import {
  assertCertificationTabVisibility,
  certificationTabsVisibilityScenarios,
  createCertificationForReducedRequirementsScenario,
} from "@tests/helpers/certification-page-tabs-visibility";
import { createCandidateEntity } from "@tests/helpers/entities/create-candidate.entity";
import {
  createCandidaciesGuardsHandlers,
  loginAndWaitForCandidaciesInitialLoad,
} from "@tests/helpers/handlers/candidacies/candidacies-guards.handler";
import { getArticlesForCertificationPageUsefulResourcesHandler } from "@tests/helpers/handlers/certification-page/useful-resources.handler";
import { graphQLResolver } from "@tests/helpers/network/msw";

import { Certification } from "@/graphql/generated/graphql";

const fvae = graphql.link("https://reva-api/api/graphql");

const candidate = createCandidateEntity();

function createCreateCertificationPageHandlers({
  certification,
}: {
  certification: Certification;
}) {
  return [
    ...createCandidaciesGuardsHandlers({ candidate }),
    fvae.query(
      "getCertificationById",
      graphQLResolver({ getCertification: certification }),
    ),
    getArticlesForCertificationPageUsefulResourcesHandler(),
  ];
}

test.describe("create certification page tabs visibility", () => {
  certificationTabsVisibilityScenarios.forEach(
    ({
      name,
      certificationLabel,
      structureLabel,
      reducedRequirementsState,
      expectedTabVisibility,
    }) => {
      test(`shows expected tabs when ${name}`, async ({ page, msw }) => {
        const certificationForScenario =
          createCertificationForReducedRequirementsScenario({
            certificationLabel,
            structureLabel,
            reducedRequirementsState,
            idPrefix: "create-certification",
          });

        msw.use(
          ...createCreateCertificationPageHandlers({
            certification: certificationForScenario,
          }),
        );

        await loginAndWaitForCandidaciesInitialLoad(page);
        await page.goto(
          `candidates/${candidate.id}/candidacies/create/certifications/${certificationForScenario.id}/`,
        );
        await expect(
          page.getByRole("heading", {
            name: certificationForScenario.label,
            level: 1,
          }),
        ).toBeVisible();
        await assertCertificationTabVisibility(page, expectedTabVisibility);
      });
    },
  );
});

test.describe("Shows available parcours", () => {
  test("when i access the tab it shows the available parcours", async ({
    page,
    msw,
  }) => {
    const certification = createCertificationForReducedRequirementsScenario({
      certificationLabel: "Certification du SUP",
      structureLabel: "Structure SUP",
      reducedRequirementsState: true,
      idPrefix: "project-certification",
    });

    msw.use(
      ...createCreateCertificationPageHandlers({
        certification: certification,
      }),
    );

    await loginAndWaitForCandidaciesInitialLoad(page);
    await page.goto(
      `candidates/${candidate.id}/candidacies/create/certifications/${certification.id}/`,
    );

    await page.getByRole("tab", { name: "Établissements" }).click();

    await expect(
      page.getByText(
        "Établissements proposant ce diplôme sur la plateforme France VAE",
      ),
    ).toBeVisible();
    await expect(page.getByText("Certification Authority")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Certification Authority" }),
    ).toHaveAttribute("href", "https://www.certification-authority.com");
    await expect(page.getByText("Parcours 1")).toBeVisible();
    await expect(
      page.getByText("Certification Authority Without Parcours"),
    ).toHaveCount(0);
  });
});
