import {
  expect,
  graphql,
  test,
  type Page,
} from "next/experimental/testmode/playwright/msw";

import { createCandidacyEntity } from "@tests/helpers/entities/create-candidacy.entity";
import { createCandidateEntity } from "@tests/helpers/entities/create-candidate.entity";
import { createCertificationEntity } from "@tests/helpers/entities/create-certification.entity";
import {
  createCandidacyGuardsAndDashboardHandlers,
  createCandidaciesGuardsHandlers,
  loginAndWaitForCandidaciesInitialLoad,
} from "@tests/helpers/handlers/candidacies/candidacies-guards.handler";
import { getArticlesForCertificationPageUsefulResourcesHandler } from "@tests/helpers/handlers/certification-page/useful-resources.handler";
import { graphQLResolver } from "@tests/helpers/network/msw";
import { waitGraphQL } from "@tests/helpers/network/requests";

const fvae = graphql.link("https://reva-api/api/graphql");

const ACCOMPAGNEMENT_V2 = "ACCOMPAGNEMENT_V2";

const candidate = createCandidateEntity();
const certification = createCertificationEntity({
  label: "Certification 1",
  codeRncp: "RNCP0001",
});
const candidacy = createCandidacyEntity({
  candidate,
  certification,
  status: "PROJET",
  typeAccompagnement: "AUTONOME",
});

const certificationPageUrl = `candidates/${candidate.id}/candidacies/create/certifications/${certification.id}/`;
const typeAccompagnementPageUrl = `${certificationPageUrl}type-accompagnement/`;
const candidacyPageUrl = `candidates/${candidate.id}/candidacies/${candidacy.id}/`;

function createCertificationChoiceHandlers({
  accompagnementV2,
  candidacyId = candidacy.id,
}: {
  accompagnementV2: boolean;
  candidacyId?: string | null;
}) {
  return [
    ...createCandidaciesGuardsHandlers({
      candidate,
      activeFeaturesForConnectedUser: accompagnementV2
        ? [ACCOMPAGNEMENT_V2]
        : [],
    }),
    fvae.query(
      "getCertificationById",
      graphQLResolver({ getCertification: certification }),
    ),
    fvae.query(
      "getCertificationByIdForCreateCandidacy",
      graphQLResolver({
        getCertification: {
          id: certification.id,
          label: certification.label,
          codeRncp: certification.codeRncp,
          isAapAvailable: true,
        },
      }),
    ),
    getArticlesForCertificationPageUsefulResourcesHandler(),
    fvae.mutation(
      "createCandidacy",
      graphQLResolver({
        candidacy_createCandidacy: candidacyId ? { id: candidacyId } : null,
      }),
    ),
    ...createCandidacyGuardsAndDashboardHandlers(candidacy),
  ];
}

async function openCertificationPage(page: Page) {
  await loginAndWaitForCandidaciesInitialLoad(page);

  const featuresLoaded = waitGraphQL(page, "activeFeaturesForConnectedUser");
  await page.goto(certificationPageUrl);
  await featuresLoaded;

  await expect(
    page.getByRole("button", { name: "Choisir ce diplôme" }),
  ).toBeVisible();
}

test.describe("create candidacy when ACCOMPAGNEMENT_V2 is active", () => {
  test.use({
    mswHandlers: [
      createCertificationChoiceHandlers({ accompagnementV2: true }),
      { scope: "test" },
    ],
  });

  test("creates an autonome candidacy directly from the certification page", async ({
    page,
  }) => {
    await openCertificationPage(page);

    const createCandidacyResponse = waitGraphQL(page, "createCandidacy");
    await page.getByRole("button", { name: "Choisir ce diplôme" }).click();

    const response = await createCandidacyResponse;
    expect(response.request().postDataJSON().variables).toMatchObject({
      candidateId: candidate.id,
      data: {
        certificationId: certification.id,
        typeAccompagnement: "AUTONOME",
      },
    });

    await expect(page).toHaveURL(candidacyPageUrl);
  });

  test("stays on the certification page and shows an error when creation fails", async ({
    page,
    msw,
  }) => {
    msw.use(
      fvae.mutation(
        "createCandidacy",
        graphQLResolver({
          candidacy_createCandidacy: null,
        }),
      ),
    );

    await openCertificationPage(page);

    await page.getByRole("button", { name: "Choisir ce diplôme" }).click();

    await expect(page.getByTestId("toast-error")).toContainText(
      "Une erreur est survenue lors de la création de la candidature",
    );
    await expect(page).toHaveURL(certificationPageUrl);
  });
});

test.describe("create candidacy when ACCOMPAGNEMENT_V2 is inactive", () => {
  test.use({
    mswHandlers: [
      createCertificationChoiceHandlers({ accompagnementV2: false }),
      { scope: "test" },
    ],
  });

  test("opens the type accompagnement step without creating a candidacy", async ({
    page,
  }) => {
    await openCertificationPage(page);

    let createCandidacyCalled = false;
    page.on("request", (request) => {
      if (
        !request.url().includes("api/graphql") ||
        request.method() !== "POST"
      ) {
        return;
      }

      try {
        if (request.postDataJSON()?.operationName === "createCandidacy") {
          createCandidacyCalled = true;
        }
      } catch {
        return;
      }
    });

    await page.getByRole("button", { name: "Choisir ce diplôme" }).click();

    await expect(page).toHaveURL(typeAccompagnementPageUrl);
    await expect(
      page.getByText("Comment je souhaite réaliser ma VAE ?"),
    ).toBeVisible();
    expect(createCandidacyCalled).toBe(false);
  });
});
