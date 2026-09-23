import { EndAccompagnementReason } from "@prisma/client";

import { prismaClient } from "@/prisma/client";
import { authorizationHeaderForUser } from "@/test/helpers/authorization-helper";
import { createCandidacyHelper } from "@/test/helpers/entities/create-candidacy-helper";
import { createFeasibilityDematerializedHelper } from "@/test/helpers/entities/create-feasibility-dematerialized-helper";
import { createOrganismHelper } from "@/test/helpers/entities/create-organism-helper";
import { getGraphQLClient } from "@/test/test-graphql-client";

import { graphql } from "../../graphql/generated";

describe("accompagnement dual-write", () => {
  test("confirming end without DF terminates the current accompagnement with correct status and reason", async () => {
    const candidacy = await createCandidacyHelper({
      candidacyActiveStatus: "PRISE_EN_CHARGE",
      candidacyArgs: {
        typeAccompagnement: "ACCOMPAGNE",
        financeModule: "hors_plateforme",
      },
    });

    const aapKeycloakId =
      candidacy.organism?.organismOnAccounts[0].account.keycloakId;

    const aapClient = getGraphQLClient({
      headers: {
        authorization: authorizationHeaderForUser({
          role: "manage_candidacy",
          keycloakId: aapKeycloakId,
        }),
      },
    });

    const submitMutation = graphql(`
      mutation submitEndAccompagnement_dual_write(
        $candidacyId: UUID!
        $endAccompagnementDate: Timestamp!
        $endAccompagnementReason: EndAccompagnementReason!
      ) {
        candidacy_submitEndAccompagnement(
          candidacyId: $candidacyId
          endAccompagnementDate: $endAccompagnementDate
          endAccompagnementReason: $endAccompagnementReason
        ) {
          id
          endAccompagnementStatus
        }
      }
    `);

    await aapClient.request(submitMutation, {
      candidacyId: candidacy.id,
      endAccompagnementDate: Date.now(),
      endAccompagnementReason: EndAccompagnementReason.CHOIX_AAP,
    });

    const candidateClient = getGraphQLClient({
      headers: {
        authorization: authorizationHeaderForUser({
          role: "candidate",
          keycloakId: candidacy.candidate?.keycloakId,
        }),
      },
    });

    const decideMutation = graphql(`
      mutation decideEndAccompagnement_dual_write(
        $candidacyId: UUID!
        $endAccompagnement: Boolean!
      ) {
        candidacy_updateCandidacyEndAccompagnementDecision(
          candidacyId: $candidacyId
          endAccompagnement: $endAccompagnement
        ) {
          id
        }
      }
    `);

    await candidateClient.request(decideMutation, {
      candidacyId: candidacy.id,
      endAccompagnement: true,
    });

    const accompagnements = await prismaClient.accompagnement.findMany({
      where: { candidacyId: candidacy.id },
      orderBy: { createdAt: "asc" },
    });

    expect(accompagnements.length).toBe(1);
    expect(accompagnements[0].status).toBe("TERMINE");
    expect(accompagnements[0].endAccompagnementReason).toBe(
      EndAccompagnementReason.CHOIX_AAP,
    );

    const updatedCandidacy = await prismaClient.candidacy.findUniqueOrThrow({
      where: { id: candidacy.id },
    });
    expect(updatedCandidacy.endAccompagnementStatus).toBe("NOT_REQUESTED");
    expect(updatedCandidacy.typeAccompagnement).toBe("ACCOMPAGNE");
    expect(updatedCandidacy.organismId).toBeNull();
    expect(updatedCandidacy.status).toBe("PROJET");
  });

  test("confirming end with a non-draft DF terminates accompagnement and keeps candidacy organism", async () => {
    const candidacy = await createCandidacyHelper({
      candidacyActiveStatus: "DOSSIER_FAISABILITE_RECEVABLE",
      candidacyArgs: {
        typeAccompagnement: "ACCOMPAGNE",
        financeModule: "hors_plateforme",
      },
    });

    await createFeasibilityDematerializedHelper({
      candidacyId: candidacy.id,
      decision: "ADMISSIBLE",
    });

    const aapKeycloakId =
      candidacy.organism?.organismOnAccounts[0].account.keycloakId;

    const aapClient = getGraphQLClient({
      headers: {
        authorization: authorizationHeaderForUser({
          role: "manage_candidacy",
          keycloakId: aapKeycloakId,
        }),
      },
    });

    const submitMutation = graphql(`
      mutation submitEndAccompagnement_with_df(
        $candidacyId: UUID!
        $endAccompagnementDate: Timestamp!
        $endAccompagnementReason: EndAccompagnementReason!
      ) {
        candidacy_submitEndAccompagnement(
          candidacyId: $candidacyId
          endAccompagnementDate: $endAccompagnementDate
          endAccompagnementReason: $endAccompagnementReason
        ) {
          id
          endAccompagnementStatus
        }
      }
    `);

    await aapClient.request(submitMutation, {
      candidacyId: candidacy.id,
      endAccompagnementDate: Date.now(),
      endAccompagnementReason:
        EndAccompagnementReason.CONTRAT_ACCOMPAGNEMENT_TERMINE,
    });

    const candidateClient = getGraphQLClient({
      headers: {
        authorization: authorizationHeaderForUser({
          role: "candidate",
          keycloakId: candidacy.candidate?.keycloakId,
        }),
      },
    });

    const decideMutation = graphql(`
      mutation decideEndAccompagnement_with_df(
        $candidacyId: UUID!
        $endAccompagnement: Boolean!
      ) {
        candidacy_updateCandidacyEndAccompagnementDecision(
          candidacyId: $candidacyId
          endAccompagnement: $endAccompagnement
        ) {
          id
        }
      }
    `);

    await candidateClient.request(decideMutation, {
      candidacyId: candidacy.id,
      endAccompagnement: true,
    });

    const accompagnements = await prismaClient.accompagnement.findMany({
      where: { candidacyId: candidacy.id },
    });
    expect(accompagnements).toHaveLength(1);
    expect(accompagnements[0].status).toBe("TERMINE");

    const updatedCandidacy = await prismaClient.candidacy.findUniqueOrThrow({
      where: { id: candidacy.id },
    });
    expect(updatedCandidacy.typeAccompagnement).toBe("ACCOMPAGNE");
    expect(updatedCandidacy.organismId).toBe(candidacy.organismId);
    expect(updatedCandidacy.endAccompagnementStatus).toBe(
      "CONFIRMED_BY_CANDIDATE",
    );
  });
  test("Submitting candidacy to AAP should create a new draft accompagnement", async () => {
    const candidacy = await createCandidacyHelper({
      candidacyActiveStatus: "PROJET",
      candidacyArgs: {
        typeAccompagnement: "ACCOMPAGNE",
        financeModule: "hors_plateforme",
      },
    });

    const candidateClient = getGraphQLClient({
      headers: {
        authorization: authorizationHeaderForUser({
          role: "candidate",
          keycloakId: candidacy.candidate?.keycloakId,
        }),
      },
    });

    const submitMutation = graphql(`
      mutation candidacy_submitCandidacy($candidacyId: ID!) {
        candidacy_submitCandidacy(candidacyId: $candidacyId) {
          id
        }
      }
    `);

    await candidateClient.request(submitMutation, {
      candidacyId: candidacy.id,
    });

    const accompagnements = await prismaClient.accompagnement.findMany({
      where: { candidacyId: candidacy.id },
    });
    expect(accompagnements).toHaveLength(1);
    expect(accompagnements[0].status).toBe("BROUILLON");
    expect(accompagnements[0].organismId).toBe(candidacy.organismId);
  });
  test("Selecting a new organism by candidate should terminate the current accompagnement and create a new draft accompagnement", async () => {
    const candidacy = await createCandidacyHelper({
      candidacyActiveStatus: "PRISE_EN_CHARGE",
      candidacyArgs: {
        typeAccompagnement: "ACCOMPAGNE",
        financeModule: "hors_plateforme",
      },
    });

    const organism = await createOrganismHelper();

    const candidateClient = getGraphQLClient({
      headers: {
        authorization: authorizationHeaderForUser({
          role: "candidate",
          keycloakId: candidacy.candidate?.keycloakId,
        }),
      },
    });

    const selectOrganismMutation = graphql(`
      mutation selectOrganism($candidacyId: UUID!, $organismId: UUID!) {
        candidacy_selectOrganism(
          candidacyId: $candidacyId
          organismId: $organismId
        ) {
          id
        }
      }
    `);

    await candidateClient.request(selectOrganismMutation, {
      candidacyId: candidacy.id,
      organismId: organism.id,
    });

    const accompagnements = await prismaClient.accompagnement.findMany({
      where: { candidacyId: candidacy.id },
      orderBy: { createdAt: "asc" },
    });
    expect(accompagnements).toHaveLength(2);
    expect(accompagnements[0].status).toBe("TERMINE");
    expect(accompagnements[0].organismId).toBe(candidacy.organismId);
    expect(accompagnements[1].status).toBe("BROUILLON");
    expect(accompagnements[1].organismId).toBe(organism.id);
  });
});
