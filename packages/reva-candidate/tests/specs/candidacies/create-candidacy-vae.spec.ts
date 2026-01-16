import {
  expect,
  graphql,
  test,
  type Page,
} from "next/experimental/testmode/playwright/msw";

import { login } from "@tests/helpers/auth/auth";
import { createCandidacyEntity } from "@tests/helpers/entities/create-candidacy.entity";
import { createCandidateEntity } from "@tests/helpers/entities/create-candidate.entity";
import { createCertificationEntity } from "@tests/helpers/entities/create-certification.entity";
import { graphQLResolver } from "@tests/helpers/network/msw";
import { waitGraphQL } from "@tests/helpers/network/requests";

const fvae = graphql.link("https://reva-api/api/graphql");

const candidate = createCandidateEntity();
const certification = createCertificationEntity({
  label: "Certification 1",
  codeRncp: "RNCP0001",
});
const candidacy = createCandidacyEntity({
  candidate,
  certification,
  status: "PROJET",
  typeAccompagnement: "ACCOMPAGNE",
});

function createCandidaciesHandlers() {
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
          candidacies: [],
        },
      }),
    ),
    fvae.query(
      "getVaeCollectiveCohort",
      graphQLResolver({
        cohorteVaeCollective: {
          id: "12345678",
          codeInscription: "12345678",
        },
      }),
    ),
    fvae.query(
      "getVaeCollectiveCohortForCreateCandidacy",
      graphQLResolver({
        cohorteVaeCollective: {
          id: "12345678",
          nom: "Cohorte VAE Collective",
          codeInscription: "12345678",
          commanditaireVaeCollective: {
            raisonSociale: "Société VAE Collective",
          },
        },
      }),
    ),
    fvae.mutation(
      "createVaeCollectiveCandidacy",
      graphQLResolver({
        candidacy_createCandidacy: {
          id: candidacy.id,
        },
      }),
    ),
    fvae.query(
      "getCandidacyByIdForCandidacyGuard",
      graphQLResolver({ getCandidacyById: candidacy }),
    ),
    fvae.query(
      "getCandidacyByIdWithCandidate",
      graphQLResolver({ getCandidacyById: candidacy }),
    ),
    fvae.query(
      "getCandidacyByIdForDashboard",
      graphQLResolver({ getCandidacyById: candidacy }),
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

test.describe("create candidacy vae from candidacies page", () => {
  test.use({
    mswHandlers: [createCandidaciesHandlers(), { scope: "test" }],
  });

  test("create candidacy", async ({ page }) => {
    await loginAndWaitForInitialLoad(page);

    await page.goto(`candidates/${candidate.id}/candidacies/`);

    await expect(
      page.getByText(
        "Valorisez votre expérience professionnelle en commençant une candidature dès maintenant.",
      ),
    ).toBeVisible();

    const createCandidacyButton = page.getByRole("button", {
      name: "Commencer une VAE",
    });
    createCandidacyButton.click();

    await expect(page).toHaveURL(
      `candidates/${candidate.id}/candidacies/create/`,
    );

    await expect(
      page.getByRole("heading", { name: "Commencer une VAE" }),
    ).toBeVisible();

    const vaeCard = page.getByText("Je dispose d'un code VAE collective");
    await expect(vaeCard).toBeVisible();
    vaeCard.click();

    await expect(page).toHaveURL(
      `candidates/${candidate.id}/candidacies/create/vae-collective/`,
    );

    await expect(
      page.getByRole("heading", { name: "Rejoindre une VAE collective" }),
    ).toBeVisible();

    const accederAVaeCollectiveButton = page.getByRole("button", {
      name: "Accéder à cette VAE collective",
    });
    await expect(accederAVaeCollectiveButton).toBeVisible();

    const vaeCollectiveCodeForm = page.getByRole("textbox", {
      name: "Code VAE collective",
    });
    await expect(vaeCollectiveCodeForm).toBeVisible();

    await vaeCollectiveCodeForm.fill("1234");
    await accederAVaeCollectiveButton.click();

    await expect(
      page.getByText("Le code doit contenir exactement 8 caractères"),
    ).toBeVisible();

    await vaeCollectiveCodeForm.fill("!nco087B@)");
    await accederAVaeCollectiveButton.click();

    await expect(
      page.getByText(
        "Le code ne doit contenir que des lettres et des chiffres",
      ),
    ).toBeVisible();

    await vaeCollectiveCodeForm.fill("12345678");
    await accederAVaeCollectiveButton.click();

    await expect(page).toHaveURL(
      `candidates/${candidate.id}/candidacies/create/vae-collective/12345678/`,
    );

    await expect(
      page.getByRole("heading", { name: "Rejoindre cette VAE collective" }),
    ).toBeVisible();

    const rejoindreCohorteButton = page.getByRole("button", {
      name: "Rejoindre cette cohorte",
    });
    await expect(rejoindreCohorteButton).toBeVisible();
    rejoindreCohorteButton.click();

    await expect(page).toHaveURL(
      `candidates/${candidate.id}/candidacies/${candidacy.id}/`,
    );
  });
});
