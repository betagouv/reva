import { graphql, type Page } from "next/experimental/testmode/playwright/msw";

import type { Organism } from "@/graphql/generated/graphql";

import { graphQLResolver } from "../../network/msw";
import { waitGraphQL } from "../../network/requests";
import {
  createCandidaciesGuardsHandlers,
  createCandidacyGuardsAndDashboardHandlers,
} from "../candidacies/candidacies-guards.handler";

import type { CandidacyEntity } from "@tests/helpers/entities/create-candidacy.entity";

const fvae = graphql.link("https://reva-api/api/graphql");

interface SetOrganismHandlersOptions {
  candidacy: CandidacyEntity;
  organisms?: Organism[];
  activeFeaturesForConnectedUser?: string[];
}

export const setOrganismHandlers = ({
  candidacy,
  organisms = [],
  activeFeaturesForConnectedUser = [],
}: SetOrganismHandlersOptions) => [
  ...createCandidaciesGuardsHandlers({
    candidate: candidacy.candidate,
    candidacies: [candidacy],
    activeFeaturesForConnectedUser,
  }),
  ...createCandidacyGuardsAndDashboardHandlers(candidacy),
  fvae.query(
    "getCandidacyByIdForSetOrganism",
    graphQLResolver({ getCandidacyById: candidacy }),
  ),
  fvae.query(
    "getRandomOrganismsForCandidacy",
    graphQLResolver({
      getRandomOrganismsForCandidacy: {
        rows: organisms,
        totalRows: organisms.length,
      },
    }),
  ),
  fvae.query(
    "getDepartments",
    graphQLResolver({
      getDepartments: [
        { id: "dept-44", label: "Loire-Atlantique", code: "44" },
        { id: "dept-75", label: "Paris", code: "75" },
      ],
    }),
  ),
  fvae.mutation(
    "candidacy_selectOrganism",
    graphQLResolver({
      candidacy_selectOrganism: {
        id: candidacy.id,
      },
    }),
  ),
];

export async function setOrganismPageWait(page: Page) {
  await Promise.all([
    waitGraphQL(page, "getCandidacyByIdForSetOrganism"),
    waitGraphQL(page, "getRandomOrganismsForCandidacy"),
    waitGraphQL(page, "getDepartments"),
  ]);
}
