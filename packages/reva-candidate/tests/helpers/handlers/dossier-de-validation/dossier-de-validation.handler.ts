import { graphql, type Page } from "next/experimental/testmode/playwright/msw";

import readyForJuryMutation from "@tests/fixtures/candidate/dossier-de-validation/ready-for-jury-mutation.json";
import { graphQLResolver } from "@tests/helpers/network/msw";
import { waitGraphQL } from "@tests/helpers/network/requests";

import {
  createCandidaciesGuardsHandlers,
  createCandidacyGuardsAndDashboardHandlers,
} from "../candidacies/candidacies-guards.handler";

import type { CandidacyEntity } from "@tests/helpers/entities/create-candidacy.entity";

export async function navigateToDossierValidation(
  page: Page,
  candidateId: string,
  candidacyId: string,
) {
  await page.goto(
    `candidates/${candidateId}/candidacies/${candidacyId}/dossier-de-validation/`,
  );
}

export async function clickDossierTab(page: Page) {
  await page.getByRole("tab", { name: /du dossier/ }).click();
}

interface DashboardHandlersOptions {
  candidacy: CandidacyEntity;
  activeFeaturesForConnectedUser?: string[];
}

const dossierDeValidationWait = async (page: Page) => {
  await Promise.all([
    waitGraphQL(page, "activeFeaturesForConnectedUser"),
    waitGraphQL(page, "getCandidacyByIdForDossierDeValidationPage"),
  ]);
};

export const dossierDeValidationHandlers = ({
  candidacy,
  activeFeaturesForConnectedUser = [],
}: DashboardHandlersOptions) => {
  const fvae = graphql.link("https://reva-api/api/graphql");

  const candidacyInput = {
    getCandidacyById: candidacy,
  };

  return {
    handlers: [
      ...createCandidaciesGuardsHandlers({
        candidate: candidacy.candidate,
        candidacies: [candidacy],
        activeFeaturesForConnectedUser,
      }),
      ...createCandidacyGuardsAndDashboardHandlers(candidacy),
      fvae.query(
        "getCandidacyByIdForDossierDeValidationPage",
        graphQLResolver(candidacyInput),
      ),
      fvae.mutation(
        "updateReadyForJuryEstimatedAtForDossierDeValidationPage",
        graphQLResolver(readyForJuryMutation),
      ),
    ],
    dossierDeValidationWait,
  };
};

export async function navigateToDossierValidationV2(
  page: Page,
  candidateId: string,
  candidacyId: string,
) {
  await page.goto(
    `candidates/${candidateId}/candidacies/${candidacyId}/dossier-de-validation-v2/`,
  );
}

const dossierDeValidationV2Wait = async (page: Page) => {
  await Promise.all([
    waitGraphQL(page, "activeFeaturesForConnectedUser"),
    waitGraphQL(page, "getCandidacyByIdForDossierDeValidationPageV2"),
  ]);
};

export const dossierDeValidationV2Handlers = ({
  candidacy,
  activeFeaturesForConnectedUser = [],
}: DashboardHandlersOptions) => {
  const fvae = graphql.link("https://reva-api/api/graphql");

  const candidacyInput = {
    getCandidacyById: candidacy,
  };

  return {
    handlers: [
      ...createCandidaciesGuardsHandlers({
        candidate: candidacy.candidate,
        candidacies: [candidacy],
        activeFeaturesForConnectedUser,
      }),
      ...createCandidacyGuardsAndDashboardHandlers(candidacy),
      fvae.query(
        "getCandidacyByIdForDossierDeValidationPageV2",
        graphQLResolver(candidacyInput),
      ),
      fvae.query(
        "getCandidacyByIdForDatePrevisionnellePage",
        graphQLResolver(candidacyInput),
      ),
      fvae.query(
        "getCandidacyByIdForDepotDossierDeValidationPage",
        graphQLResolver(candidacyInput),
      ),
    ],
    dossierDeValidationV2Wait,
  };
};
