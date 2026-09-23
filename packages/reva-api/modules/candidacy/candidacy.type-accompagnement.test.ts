import { CandidacyStatusStep, CandidateTypology } from "@prisma/client";

import { prismaClient } from "@/prisma/client";
import { authorizationHeaderForUser } from "@/test/helpers/authorization-helper";
import { createCandidacyCCNHelper } from "@/test/helpers/entities/create-candidacy-ccn-helper";
import { createCandidacyHelper } from "@/test/helpers/entities/create-candidacy-helper";
import { createFeasibilityDematerializedHelper } from "@/test/helpers/entities/create-feasibility-dematerialized-helper";
import { createFeatureHelper } from "@/test/helpers/entities/create-feature-helper";
import { getGraphQLClient } from "@/test/test-graphql-client";

import { graphql } from "../graphql/generated";

const TYPOLOGY_ADDITIONAL = "information complémentaire";

const createCandidacyWithCandidateCcnAndTypology = async ({
  typeAccompagnement,
}: {
  typeAccompagnement: "ACCOMPAGNE" | "AUTONOME";
}) => {
  const conventionCollective = await createCandidacyCCNHelper();
  const candidacy = await createCandidacyHelper({
    candidacyActiveStatus: "PROJET",
    candidacyArgs: {
      typeAccompagnement,
      ccnId: conventionCollective.id,
      typology: CandidateTypology.BENEVOLE,
      typologyAdditional: "ancienne information",
    },
  });

  await prismaClient.candidate.update({
    where: { id: candidacy.candidate!.id },
    data: {
      ccnId: conventionCollective.id,
      typology: CandidateTypology.SALARIE_PRIVE,
      typologyAdditional: TYPOLOGY_ADDITIONAL,
    },
  });

  return { candidacy, conventionCollective };
};

const candidacy_updateTypeAccompagnement_ccn_and_typology = graphql(`
  mutation candidacy_updateTypeAccompagnement_ccn_and_typology(
    $candidacyId: UUID!
    $typeAccompagnement: TypeAccompagnement!
  ) {
    candidacy_updateTypeAccompagnement(
      candidacyId: $candidacyId
      typeAccompagnement: $typeAccompagnement
    ) {
      id
    }
  }
`);

const updateTypeAccompagnementAsCandidate = async ({
  candidacyId,
  keycloakId,
  typeAccompagnement,
}: {
  candidacyId: string;
  keycloakId?: string;
  typeAccompagnement: "ACCOMPAGNE" | "AUTONOME";
}) => {
  const graphqlClient = getGraphQLClient({
    headers: {
      authorization: authorizationHeaderForUser({
        role: "candidate",
        keycloakId,
      }),
    },
  });

  await graphqlClient.request(
    candidacy_updateTypeAccompagnement_ccn_and_typology,
    {
      candidacyId,
      typeAccompagnement,
    },
  );
};

test.each([
  "PROJET",
  "VALIDATION",
  "PRISE_EN_CHARGE",
  "PARCOURS_ENVOYE",
] satisfies CandidacyStatusStep[])(
  "candidate should be able to change it's type_accompagnement to 'autonome' when the candidacy status is '%s'",
  async (status: CandidacyStatusStep) => {
    const candidacy = await createCandidacyHelper({
      candidacyActiveStatus: status,
      candidacyArgs: { typeAccompagnement: "ACCOMPAGNE" },
    });
    const candidateKeycloakId = candidacy.candidate?.keycloakId;

    const graphqlClient = getGraphQLClient({
      headers: {
        authorization: authorizationHeaderForUser({
          role: "candidate",
          keycloakId: candidateKeycloakId,
        }),
      },
    });

    const candidacy_updateTypeAccompagnement = graphql(`
      mutation candidacy_updateTypeAccompagnement_based_on_accompagnement_ACCOMPAGNE(
        $candidacyId: UUID!
        $typeAccompagnement: TypeAccompagnement!
      ) {
        candidacy_updateTypeAccompagnement(
          candidacyId: $candidacyId
          typeAccompagnement: $typeAccompagnement
        ) {
          id
          typeAccompagnement
        }
      }
    `);

    const res = await graphqlClient.request(
      candidacy_updateTypeAccompagnement,
      {
        candidacyId: candidacy.id,
        typeAccompagnement: "AUTONOME",
      },
    );

    expect(res).toMatchObject({
      candidacy_updateTypeAccompagnement: { typeAccompagnement: "AUTONOME" },
    });
  },
);

test("le passage à 'autonome' doit archiver un DF dématérialisé actif non recevable et basculer le format de la candidature en UPLOADED_PDF", async () => {
  const candidacy = await createCandidacyHelper({
    candidacyActiveStatus: "PROJET",
    candidacyArgs: { typeAccompagnement: "ACCOMPAGNE" },
  });
  const feasibility = await createFeasibilityDematerializedHelper({
    candidacyId: candidacy.id,
    decision: "DRAFT",
  });

  const graphqlClient = getGraphQLClient({
    headers: {
      authorization: authorizationHeaderForUser({
        role: "candidate",
        keycloakId: candidacy.candidate?.keycloakId,
      }),
    },
  });

  const candidacy_updateTypeAccompagnement = graphql(`
    mutation candidacy_updateTypeAccompagnement_archives_demat_feasibility(
      $candidacyId: UUID!
      $typeAccompagnement: TypeAccompagnement!
    ) {
      candidacy_updateTypeAccompagnement(
        candidacyId: $candidacyId
        typeAccompagnement: $typeAccompagnement
      ) {
        id
      }
    }
  `);

  await graphqlClient.request(candidacy_updateTypeAccompagnement, {
    candidacyId: candidacy.id,
    typeAccompagnement: "AUTONOME",
  });

  const updatedCandidacy = await prismaClient.candidacy.findUnique({
    where: { id: candidacy.id },
  });
  const updatedFeasibility = await prismaClient.feasibility.findUnique({
    where: { id: feasibility.id },
  });

  expect(updatedCandidacy?.feasibilityFormat).toBe("UPLOADED_PDF");
  expect(updatedFeasibility?.isActive).toBe(false);
});

test("candidate should be able to change it's type_accompagnement to 'accompagne' when the candidacy status is 'PROJET'", async () => {
  const candidacy = await createCandidacyHelper({
    candidacyActiveStatus: "PROJET",
    candidacyArgs: { typeAccompagnement: "AUTONOME", organismId: null },
  });
  const candidateKeycloakId = candidacy.candidate?.keycloakId;

  const graphqlClient = getGraphQLClient({
    headers: {
      authorization: authorizationHeaderForUser({
        role: "candidate",
        keycloakId: candidateKeycloakId,
      }),
    },
  });

  const candidacy_updateTypeAccompagnement = graphql(`
    mutation candidacy_updateTypeAccompagnement_based_on_accompagnement_AUTONOME(
      $candidacyId: UUID!
      $typeAccompagnement: TypeAccompagnement!
    ) {
      candidacy_updateTypeAccompagnement(
        candidacyId: $candidacyId
        typeAccompagnement: $typeAccompagnement
      ) {
        id
        typeAccompagnement
      }
    }
  `);

  const res = await graphqlClient.request(candidacy_updateTypeAccompagnement, {
    candidacyId: candidacy.id,
    typeAccompagnement: "ACCOMPAGNE",
  });

  expect(res).toMatchObject({
    candidacy_updateTypeAccompagnement: { typeAccompagnement: "ACCOMPAGNE" },
  });
});

test("candidate should NOT be able to change it's type_accompagnement to 'autonome' when the candidacy status is equal to 'PARCOURS_CONFIRME'", async () => {
  const candidacy = await createCandidacyHelper({
    candidacyActiveStatus: CandidacyStatusStep.PARCOURS_CONFIRME,
    candidacyArgs: { typeAccompagnement: "ACCOMPAGNE" },
  });
  const candidateKeycloakId = candidacy.candidate?.keycloakId;

  const graphqlClient = getGraphQLClient({
    headers: {
      authorization: authorizationHeaderForUser({
        role: "candidate",
        keycloakId: candidateKeycloakId,
      }),
    },
  });

  const candidacy_updateTypeAccompagnement = graphql(`
    mutation candidacy_updateTypeAccompagnement_based_on_status_PARCOURS_CONFIRME(
      $candidacyId: UUID!
      $typeAccompagnement: TypeAccompagnement!
    ) {
      candidacy_updateTypeAccompagnement(
        candidacyId: $candidacyId
        typeAccompagnement: $typeAccompagnement
      ) {
        id
        typeAccompagnement
      }
    }
  `);

  await expect(
    graphqlClient.request(candidacy_updateTypeAccompagnement, {
      candidacyId: candidacy.id,
      typeAccompagnement: "AUTONOME",
    }),
  ).rejects.toThrowError(
    "Impossible de modifier le type d'accompagnement une fois le parcours confirmé",
  );
});

test("candidate should NOT be able to change it's type_accompagnement to 'accompagne' when the candidacy status is equal to 'DOSSIER_FAISABILITE_ENVOYE'", async () => {
  const candidacy = await createCandidacyHelper({
    candidacyActiveStatus: CandidacyStatusStep.DOSSIER_FAISABILITE_ENVOYE,
    candidacyArgs: { typeAccompagnement: "AUTONOME", organismId: null },
  });
  const candidateKeycloakId = candidacy.candidate?.keycloakId;

  const graphqlClient = getGraphQLClient({
    headers: {
      authorization: authorizationHeaderForUser({
        role: "candidate",
        keycloakId: candidateKeycloakId,
      }),
    },
  });

  const candidacy_updateTypeAccompagnement = graphql(`
    mutation candidacy_updateTypeAccompagnement_based_on_status_DOSSIER_FAISABILITE_ENVOYE(
      $candidacyId: UUID!
      $typeAccompagnement: TypeAccompagnement!
    ) {
      candidacy_updateTypeAccompagnement(
        candidacyId: $candidacyId
        typeAccompagnement: $typeAccompagnement
      ) {
        id
        typeAccompagnement
      }
    }
  `);

  await expect(
    graphqlClient.request(candidacy_updateTypeAccompagnement, {
      candidacyId: candidacy.id,
      typeAccompagnement: "ACCOMPAGNE",
    }),
  ).rejects.toThrowError(
    "Impossible de modifier le type d'accompagnement une fois le dossier de faisabilité envoyé",
  );
});

test("le passage à 'accompagne' doit recopier la ccn, la typologie et la typologie additionnelle du candidat", async () => {
  const { candidacy, conventionCollective } =
    await createCandidacyWithCandidateCcnAndTypology({
      typeAccompagnement: "AUTONOME",
    });

  await updateTypeAccompagnementAsCandidate({
    candidacyId: candidacy.id,
    keycloakId: candidacy.candidate?.keycloakId,
    typeAccompagnement: "ACCOMPAGNE",
  });

  const updatedCandidacy = await prismaClient.candidacy.findUnique({
    where: { id: candidacy.id },
  });

  expect(updatedCandidacy?.ccnId).toBe(conventionCollective.id);
  expect(updatedCandidacy?.typology).toBe(CandidateTypology.SALARIE_PRIVE);
  expect(updatedCandidacy?.typologyAdditional).toBe(TYPOLOGY_ADDITIONAL);
});

test("le passage à 'autonome' sans DF demat autonome doit réinitialiser la ccn, la typologie et la typologie additionnelle", async () => {
  const { candidacy } = await createCandidacyWithCandidateCcnAndTypology({
    typeAccompagnement: "ACCOMPAGNE",
  });

  await updateTypeAccompagnementAsCandidate({
    candidacyId: candidacy.id,
    keycloakId: candidacy.candidate?.keycloakId,
    typeAccompagnement: "AUTONOME",
  });

  const updatedCandidacy = await prismaClient.candidacy.findUnique({
    where: { id: candidacy.id },
  });

  expect(updatedCandidacy?.ccnId).toBeNull();
  expect(updatedCandidacy?.typology).toBe(CandidateTypology.NON_SPECIFIE);
  expect(updatedCandidacy?.typologyAdditional).toBeNull();
});

test("le passage à 'autonome' avec DF demat autonome actif doit recopier la ccn, la typologie et la typologie additionnelle du candidat", async () => {
  await createFeatureHelper({
    args: {
      key: "DF_DEMAT_AUTONOME",
      isActive: true,
    },
  });

  const { candidacy, conventionCollective } =
    await createCandidacyWithCandidateCcnAndTypology({
      typeAccompagnement: "ACCOMPAGNE",
    });

  await updateTypeAccompagnementAsCandidate({
    candidacyId: candidacy.id,
    keycloakId: candidacy.candidate?.keycloakId,
    typeAccompagnement: "AUTONOME",
  });

  const updatedCandidacy = await prismaClient.candidacy.findUnique({
    where: { id: candidacy.id },
  });

  expect(updatedCandidacy?.ccnId).toBe(conventionCollective.id);
  expect(updatedCandidacy?.typology).toBe(CandidateTypology.SALARIE_PRIVE);
  expect(updatedCandidacy?.typologyAdditional).toBe(TYPOLOGY_ADDITIONAL);
});
