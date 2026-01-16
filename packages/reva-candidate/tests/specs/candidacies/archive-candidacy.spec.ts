import {
  expect,
  graphql,
  test,
  type Page,
} from "next/experimental/testmode/playwright/msw";

import { login } from "@tests/helpers/auth/auth";
import {
  CandidacyEntity,
  createCandidacyEntity,
} from "@tests/helpers/entities/create-candidacy.entity";
import { createCandidateEntity } from "@tests/helpers/entities/create-candidate.entity";
import { createCertificationEntity } from "@tests/helpers/entities/create-certification.entity";
import { graphQLResolver } from "@tests/helpers/network/msw";
import { waitGraphQL } from "@tests/helpers/network/requests";

const fvae = graphql.link("https://reva-api/api/graphql");

const candidate = createCandidateEntity();

function createCandidaciesHandlers(args?: { candidacy: CandidacyEntity }) {
  return [
    fvae.query(
      "candidate_getCandidateForCandidatesGuard",
      graphQLResolver({
        candidate_getCandidateWithCandidacy: {
          ...candidate,
        },
      }),
    ),
    fvae.query(
      "getCandidateByIdForCandidateGuard",
      graphQLResolver({
        candidate_getCandidateById: {
          ...candidate,
        },
      }),
    ),
    fvae.query(
      "candidate_getCandidateByIdWithCandidaciesForCandidaciesGuard",
      graphQLResolver({
        candidate_getCandidateById: {
          candidacies: args?.candidacy ? [args.candidacy] : [],
        },
      }),
    ),
    fvae.query(
      "getCandidacyByIdForCandidacyGuard",
      graphQLResolver({ getCandidacyById: args?.candidacy ?? null }),
    ),
    fvae.query(
      "getCandidacyByIdWithCandidate",
      graphQLResolver({ getCandidacyById: args?.candidacy ?? null }),
    ),
    fvae.query(
      "getCandidacyByIdForDashboard",
      graphQLResolver({ getCandidacyById: args?.candidacy ?? null }),
    ),
    fvae.mutation(
      "archiveCandidacyById",
      graphQLResolver({
        archiveCandidacyById: { id: args?.candidacy?.id ?? null },
      }),
    ),
    fvae.mutation(
      "candidate_loginWithToken",
      graphQLResolver({ candidate_loginWithToken: null }),
    ),
    fvae.query(
      "activeFeaturesForConnectedUser",
      graphQLResolver({ activeFeaturesForConnectedUser: ["MULTI_CANDIDACY"] }),
    ),
  ];
}

async function loginAndWaitForInitialLoad(page: Page) {
  await login(page);
  await Promise.all([
    waitGraphQL(page, "candidate_getCandidateForCandidatesGuard"),
    waitGraphQL(page, "getCandidateByIdForCandidateGuard"),
    waitGraphQL(
      page,
      "candidate_getCandidateByIdWithCandidaciesForCandidaciesGuard",
    ),
    waitGraphQL(page, "activeFeaturesForConnectedUser"),
  ]);
}

test.describe("archive candidacy with feasibility file sent", () => {
  const certification = createCertificationEntity({
    label: "Certification 1",
    codeRncp: "RNCP0001",
  });
  const candidacy = createCandidacyEntity({
    candidate,
    certification,
    status: "PROJET",
    feasibility: {
      feasibilityFileSentAt: new Date().getTime(),
    },
  });

  test.use({
    mswHandlers: [createCandidaciesHandlers({ candidacy }), { scope: "test" }],
  });

  test("when i access the page it shows one candidacy card, click on it and redirects to the candidacy page without archive button", async ({
    page,
  }) => {
    await loginAndWaitForInitialLoad(page);

    await page.goto(`candidates/${candidate.id}/candidacies/`);

    const candidacyCard = page.getByText(
      `RNCP ${certification.codeRncp} : ${certification.label}`,
    );
    await expect(candidacyCard).toBeVisible();
    candidacyCard.click();

    await expect(page).toHaveURL(
      `candidates/${candidate.id}/candidacies/${candidacy.id}/`,
    );

    const abandonCandidacyButton = page.getByRole("button", {
      name: "Abandonner cette candidature",
    });

    await expect(abandonCandidacyButton).not.toBeVisible();
  });
});

test.describe("archive candidacy without feasibility file sent", () => {
  const certification = createCertificationEntity({
    label: "Certification 1",
    codeRncp: "RNCP0001",
  });
  const candidacy = createCandidacyEntity({
    candidate,
    certification,
    status: "PROJET",
  });

  test.use({
    mswHandlers: [createCandidaciesHandlers({ candidacy }), { scope: "test" }],
  });

  test("when i access the page it shows one candidacy card, click on it and redirects to the candidacy page with archive button", async ({
    page,
  }) => {
    await loginAndWaitForInitialLoad(page);

    await page.goto(`candidates/${candidate.id}/candidacies/`);

    const candidacyCard = page.getByText(
      `RNCP ${certification.codeRncp} : ${certification.label}`,
    );
    await expect(candidacyCard).toBeVisible();
    candidacyCard.click();

    await expect(page).toHaveURL(
      `candidates/${candidate.id}/candidacies/${candidacy.id}/`,
    );

    const abandonCandidacyButton = page.getByRole("button", {
      name: "Abandonner cette candidature",
    });

    await expect(abandonCandidacyButton).toBeVisible();

    await abandonCandidacyButton.click();

    const confirmAbandonCandidacyButton = page.getByRole("button", {
      name: "Confirmer",
    });

    await expect(confirmAbandonCandidacyButton).toBeVisible();

    await confirmAbandonCandidacyButton.click();

    await expect(page).toHaveURL(`candidates/${candidate.id}/candidacies/`);
  });
});
