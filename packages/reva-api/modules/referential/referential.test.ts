import { Organism } from "@prisma/client";

import { prismaClient } from "@/prisma/client";
import { attachOrganismToAllDegreesHelper } from "@/test/helpers/attach-organism-to-all-degrees-helper";
import { authorizationHeaderForUser } from "@/test/helpers/authorization-helper";
import { createCandidacyHelper } from "@/test/helpers/entities/create-candidacy-helper";
import { createCertificationAuthorityHelper } from "@/test/helpers/entities/create-certification-authority-helper";
import { createCertificationHelper } from "@/test/helpers/entities/create-certification-helper";
import { createOrganismHelper } from "@/test/helpers/entities/create-organism-helper";
import { createOrganismOnConventionCollectiveHelper } from "@/test/helpers/entities/create-organism-on-convention-collective-helper";
import { createParcoursCertificationHelper } from "@/test/helpers/entities/create-parcours-certification-helper";
import { createCohorteVaeCollectiveHelper } from "@/test/helpers/entities/create-vae-collective-helper";
import { injectGraphql } from "@/test/helpers/graphql-helper";
import { getGraphQLClient } from "@/test/test-graphql-client";

import { graphql } from "../graphql/generated";

import { updateCertificationsVisibility } from "./features/updateCertificationsVisibility";

const createCertifications = async () => {
  for (const cert of particulierEmployeurCertifications) {
    await createCertificationHelper({
      label: cert.label,
    });
  }
};

async function searchCertificationsForCandidate({
  searchText,
  organism,
  candidacyId,
  cohorteVaeCollectiveIdFilter,
}: {
  searchText?: string;
  organism?: Organism | null;
  candidacyId?: string;
  cohorteVaeCollectiveIdFilter?: string;
}) {
  return await injectGraphql({
    fastify: global.testApp,
    authorization: authorizationHeaderForUser({
      role: "candidate",
      keycloakId: "1b0e7046-ca61-4259-b716-785f36ab79b2",
    }),
    payload: {
      requestType: "query",
      endpoint: "searchCertificationsForCandidate",
      arguments: {
        offset: 0,
        limit: 10,
        ...(searchText ? { searchText } : {}),
        ...(organism ? { organismId: organism?.id || "" } : {}),
        ...(candidacyId ? { candidacyId } : {}),
        ...(cohorteVaeCollectiveIdFilter
          ? { cohorteVaeCollectiveIdFilter }
          : {}),
      },
      returnFields: "{ rows { label }, info { totalRows } }",
    },
  });
}

const getCertificationAndParcoursQuery = graphql(`
  query getCertificationAndParcours(
    $certificationId: ID!
    $searchFilter: String
  ) {
    getCertification(certificationId: $certificationId) {
      parcours(searchFilter: $searchFilter) {
        rows {
          id
        }
      }
    }
  }
`);

const getCertificationAndParcours = async ({
  certificationId,
  searchFilter,
}: {
  certificationId: string;
  searchFilter?: string;
}) => {
  const graphqlClient = getGraphQLClient({});
  return graphqlClient.request(getCertificationAndParcoursQuery, {
    certificationId,
    searchFilter,
  });
};

const particulierEmployeurCertifications = [
  "Titre à finalité professionnelle Assistant de vie dépendance (ADVD)",
  "Titre à finalité professionnelle Assistant maternel / garde d'enfants ",
  "Titre à finalité professionnelle Employé familial",
].map((label) => ({ label }));

/**
 * Test search certifications by a candidate
 */
test("doit avoir au moins 208 certifications disponibles au total", async () => {
  const resp = await searchCertificationsForCandidate({});
  const obj = resp.json();
  expect(
    obj.data.searchCertificationsForCandidate.info.totalRows,
  ).toBeGreaterThanOrEqual(208);
});

/**
 * Test search certifications by an organism for reorientation purpose
 */

test("doit renvoyer uniquement les certifications gérées par un expertBranche", async () => {
  await createCertifications();

  const particulierEmployeur =
    await prismaClient.conventionCollective.findFirst({
      where: {
        label: "Particuliers employeurs et emploi à domicile",
      },
    });

  const organismExpertBranche = await createOrganismHelper({
    typology: "expertBranche",
  });
  await attachOrganismToAllDegreesHelper(organismExpertBranche);
  await createOrganismOnConventionCollectiveHelper({
    ccnId: particulierEmployeur?.id || "",
    organismId: organismExpertBranche.id,
  });

  const resp = await searchCertificationsForCandidate({
    organism: organismExpertBranche,
  });
  const obj = resp.json();
  // expertBranche handle only "particulier employeur" branche
  expect(obj.data.searchCertificationsForCandidate.rows).toEqual(
    particulierEmployeurCertifications,
  );
});

describe("VAE collective", () => {
  /**
   * Test search certifications by a candidate restricted by a VAE collective cohort
   */
  test("doit renvoyer toutes les certifications lors d'une recherche avec une cohorte VAE collective sans restriction de certification", async () => {
    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper();

    const candidacy = await createCandidacyHelper({
      candidacyArgs: { cohorteVaeCollectiveId: cohorteVaeCollective.id },
    });
    const resp = await searchCertificationsForCandidate({
      candidacyId: candidacy.id,
    });
    const obj = resp.json();
    expect(
      obj.data.searchCertificationsForCandidate.info.totalRows,
    ).toBeGreaterThanOrEqual(212);
  });

  /**
   * Test search certifications by a candidate restricted by a VAE collective cohort
   */
  test("doit renvoyer uniquement les certifications disponibles pour la cohorte VAE collective de la candidature", async () => {
    const certificationVaeCollective = await createCertificationHelper();
    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper({
      certificationCohorteVaeCollectives: {
        create: { certificationId: certificationVaeCollective.id },
      },
    });

    const candidacy = await createCandidacyHelper({
      candidacyArgs: { cohorteVaeCollectiveId: cohorteVaeCollective.id },
    });
    const resp = await searchCertificationsForCandidate({
      candidacyId: candidacy.id,
    });
    const obj = resp.json();
    expect(obj.data.searchCertificationsForCandidate.info.totalRows).toBe(1);
  });

  /**
   * Test search certifications with a cohorte VAE collective ID filter
   */
  test("doit renvoyer uniquement les certifications disponibles pour la cohorte VAE collective", async () => {
    const certificationVaeCollective = await createCertificationHelper();
    const cohorteVaeCollective = await createCohorteVaeCollectiveHelper({
      certificationCohorteVaeCollectives: {
        create: { certificationId: certificationVaeCollective.id },
      },
    });

    const resp = await searchCertificationsForCandidate({
      cohorteVaeCollectiveIdFilter: cohorteVaeCollective.id,
    });
    const obj = resp.json();
    expect(obj.data.searchCertificationsForCandidate.info.totalRows).toBe(1);
  });
});

describe("Parcours certification", () => {
  test("doit renvoyer tous les parcours d'une certification et uniquement ces parcours", async () => {
    const certification = await createCertificationHelper();
    const parcoursCertification = await createParcoursCertificationHelper({
      certificationId: certification.id,
    });
    await createParcoursCertificationHelper(); //parcours not attached to the certification

    const resp = await getCertificationAndParcours({
      certificationId: certification.id,
    });
    expect(resp.getCertification.parcours.rows).toEqual([
      { id: parcoursCertification.id },
    ]);
  });

  test("doit renvoyer tous les parcours d'une certification correspondant au filtre de recherche", async () => {
    const certification = await createCertificationHelper();
    const parcoursCertification = await createParcoursCertificationHelper({
      certificationId: certification.id,
      label: "Parcours 1",
    });
    const parcoursCertification2 = await createParcoursCertificationHelper({
      certificationId: certification.id,
      label: "Parcours 2",
    });

    await createParcoursCertificationHelper({
      certificationId: certification.id,
      label: "Should not return this one",
    });

    const resp = await getCertificationAndParcours({
      certificationId: certification.id,
      searchFilter: "Parcours",
    });
    expect(resp.getCertification.parcours.rows).toEqual([
      { id: parcoursCertification.id },
      { id: parcoursCertification2.id },
    ]);
  });

  test("should not return a certification whose parcours have no certification authority linked", async () => {
    const certification = await createCertificationHelper({
      label: "Certif without authority",
    });
    await createParcoursCertificationHelper({
      certificationId: certification.id,
    });
    await createCertificationAuthorityHelper({
      certificationAuthorityOnCertification: {
        create: { certificationId: certification.id },
      },
    });
    await updateCertificationsVisibility([certification.id], prismaClient);

    const resp = await searchCertificationsForCandidate({
      searchText: "Certif without authority",
    });
    const obj = resp.json();
    expect(obj.data.searchCertificationsForCandidate.info.totalRows).toBe(0);
  });

  test("should return a certification with at least one parcours linked to a certification authority", async () => {
    const certificationWithAuthority = await createCertificationHelper({
      label: "Certif with authority and parcours",
    });
    const parcoursCertificationWithAuthority =
      await createParcoursCertificationHelper({
        certificationId: certificationWithAuthority.id,
      });
    await createCertificationAuthorityHelper({
      certificationAuthorityOnCertification: {
        create: {
          certificationId: certificationWithAuthority.id,
          certificationAuthorityOnCertificationOnParcoursCertifications: {
            create: {
              parcoursCertificationId: parcoursCertificationWithAuthority.id,
            },
          },
        },
      },
    });
    await updateCertificationsVisibility(
      [certificationWithAuthority.id],
      prismaClient,
    );

    const resp = await searchCertificationsForCandidate({
      searchText: "Certif with authority and parcours",
    });
    const obj = resp.json();
    expect(obj.data.searchCertificationsForCandidate.info.totalRows).toBe(1);
  });

  test("doit renvoyer une certification trouvée uniquement via son rncpObjectifsContexte (Résumé du métier)", async () => {
    const certification = await createCertificationHelper({
      label: "Certif sans le mot distinctif dans le titre",
      rncpObjectifsContexte: "zephyrologie",
    });
    const parcoursCertification = await createParcoursCertificationHelper({
      certificationId: certification.id,
    });
    await createCertificationAuthorityHelper({
      certificationAuthorityOnCertification: {
        create: {
          certificationId: certification.id,
          certificationAuthorityOnCertificationOnParcoursCertifications: {
            create: {
              parcoursCertificationId: parcoursCertification.id,
            },
          },
        },
      },
    });

    const resp = await searchCertificationsForCandidate({
      searchText: "zephyrologie",
    });
    const obj = resp.json();
    expect(obj.data.searchCertificationsForCandidate.info.totalRows).toBe(1);
  });

  test("ne doit pas renvoyer de certification pour un mot absent du titre et du rncpObjectifsContexte", async () => {
    const certification = await createCertificationHelper({
      label: "Certif sans le mot distinctif dans le titre",
      rncpObjectifsContexte: "zephyrologie",
    });
    const parcoursCertification = await createParcoursCertificationHelper({
      certificationId: certification.id,
    });
    await createCertificationAuthorityHelper({
      certificationAuthorityOnCertification: {
        create: {
          certificationId: certification.id,
          certificationAuthorityOnCertificationOnParcoursCertifications: {
            create: {
              parcoursCertificationId: parcoursCertification.id,
            },
          },
        },
      },
    });

    const resp = await searchCertificationsForCandidate({
      searchText: "hydrospeleologie",
    });
    const obj = resp.json();
    expect(obj.data.searchCertificationsForCandidate.info.totalRows).toBe(0);
  });
});

// Chaque test utilise un mot inventé qui lui est propre : la table certification n'est pas
// vidée entre les tests (cf. DO_NOT_CLEAR_THESE_TABLES), les fixtures s'accumulent donc
// entre elles et avec les certifications du seed.
describe("Recherche dans les objectifs et contexte", () => {
  test("doit renvoyer une certification dont les objectifs contiennent le mot complet recherché", async () => {
    const certification = await createCertificationHelper({
      label: "Certif sans mot distinctif dans le titre",
      rncpObjectifsContexte: "Metiers de la xylotropie du bois",
    });

    const resp = await searchCertificationsForCandidate({
      searchText: "xylotropie",
    });
    const obj = resp.json();
    expect(obj.data.searchCertificationsForCandidate.info.totalRows).toBe(1);
    expect(obj.data.searchCertificationsForCandidate.rows).toEqual([
      { label: certification.label },
    ]);
  });

  test("ne doit pas renvoyer une certification dont les objectifs contiennent seulement un préfixe du mot recherché", async () => {
    await createCertificationHelper({
      label: "Certif sans mot distinctif dans le titre",
      rncpObjectifsContexte: "Metiers de la xylotropie du bois",
    });

    const resp = await searchCertificationsForCandidate({
      searchText: "xylotropi",
    });
    const obj = resp.json();
    expect(obj.data.searchCertificationsForCandidate.info.totalRows).toBe(0);
  });

  test("doit ignorer les accents et la casse pour la recherche dans les objectifs", async () => {
    const certification = await createCertificationHelper({
      label: "Certif sans mot distinctif dans le titre",
      rncpObjectifsContexte: "Techniques de vergiculté",
    });

    const resp = await searchCertificationsForCandidate({
      searchText: "VERGICULTE",
    });
    const obj = resp.json();
    expect(obj.data.searchCertificationsForCandidate.info.totalRows).toBe(1);
    expect(obj.data.searchCertificationsForCandidate.rows).toEqual([
      { label: certification.label },
    ]);
  });

  test("doit toujours renvoyer une certification dont le libellé commence par le texte recherché", async () => {
    const certification = await createCertificationHelper({
      label: "Nimbostratie boulanger",
      rncpObjectifsContexte: "Fabrication de pain",
    });

    const resp = await searchCertificationsForCandidate({
      searchText: "nimbostrat",
    });
    const obj = resp.json();
    expect(obj.data.searchCertificationsForCandidate.info.totalRows).toBe(1);
    expect(obj.data.searchCertificationsForCandidate.rows).toEqual([
      { label: certification.label },
    ]);
  });

  test("doit renvoyer une certification quand un terme correspond au libellé et l'autre aux objectifs", async () => {
    const certification = await createCertificationHelper({
      label: "Pyroglyphie boulanger",
      rncpObjectifsContexte: "Fabrication de pain quadrifolie",
    });

    const resp = await searchCertificationsForCandidate({
      searchText: "pyroglyph quadrifolie",
    });
    const obj = resp.json();
    expect(obj.data.searchCertificationsForCandidate.info.totalRows).toBe(1);
    expect(obj.data.searchCertificationsForCandidate.rows).toEqual([
      { label: certification.label },
    ]);
  });
});
