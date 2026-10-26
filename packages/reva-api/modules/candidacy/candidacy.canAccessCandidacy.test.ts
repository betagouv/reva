import { faker } from "@faker-js/faker";

import { prismaClient } from "@/prisma/client";
import { authorizationHeaderForUser } from "@/test/helpers/authorization-helper";
import { createAccountHelper } from "@/test/helpers/entities/create-account-helper";
import { createCandidacyHelper } from "@/test/helpers/entities/create-candidacy-helper";
import { createCandidateHelper } from "@/test/helpers/entities/create-candidate-helper";
import { createCertificationAuthorityHelper } from "@/test/helpers/entities/create-certification-authority-helper";
import { createCertificationAuthorityLocalAccountHelper } from "@/test/helpers/entities/create-certification-authority-local-account-helper";
import { createFeasibilityDematerializedHelper } from "@/test/helpers/entities/create-feasibility-dematerialized-helper";
import { createOrganismHelper } from "@/test/helpers/entities/create-organism-helper";
import { getGraphQLClient } from "@/test/test-graphql-client";

import { graphql } from "../graphql/generated";

const canAccessCandidacyQuery = graphql(`
  query CanAccessCandidacy($candidacyId: ID!) {
    candidacy_canAccessCandidacy(candidacyId: $candidacyId)
  }
`);

test("an admin can access any candidacy", async () => {
  const candidacy = await createCandidacyHelper();

  const graphqlClient = getGraphQLClient({
    headers: {
      authorization: authorizationHeaderForUser({
        role: "admin",
        keycloakId: "admin-user",
      }),
    },
  });

  const response = await graphqlClient.request(canAccessCandidacyQuery, {
    candidacyId: candidacy.id,
  });

  expect(response.candidacy_canAccessCandidacy).toBe(true);
});

test("a candidate can access their own candidacy", async () => {
  const candidacy = await createCandidacyHelper();
  const candidateKeycloakId = candidacy.candidate?.keycloakId;

  if (!candidateKeycloakId) {
    throw new Error("Candidate keycloakId not found");
  }

  const graphqlClient = getGraphQLClient({
    headers: {
      authorization: authorizationHeaderForUser({
        role: "candidate",
        keycloakId: candidateKeycloakId,
      }),
    },
  });

  const response = await graphqlClient.request(canAccessCandidacyQuery, {
    candidacyId: candidacy.id,
  });

  expect(response.candidacy_canAccessCandidacy).toBe(true);
});

test("a candidate cannot access someone else's candidacy", async () => {
  const candidacy = await createCandidacyHelper();
  const anotherCandidate = await createCandidateHelper();

  const graphqlClient = getGraphQLClient({
    headers: {
      authorization: authorizationHeaderForUser({
        role: "candidate",
        keycloakId: anotherCandidate.keycloakId,
      }),
    },
  });

  const response = await graphqlClient.request(canAccessCandidacyQuery, {
    candidacyId: candidacy.id,
  });

  expect(response.candidacy_canAccessCandidacy).toBe(false);
});

test("an organism can access candidacy in his scope", async () => {
  const organism = await createOrganismHelper();
  const candidacy = await createCandidacyHelper({
    candidacyArgs: {
      organismId: organism.id,
    },
  });

  const graphqlClient = getGraphQLClient({
    headers: {
      authorization: authorizationHeaderForUser({
        role: "manage_candidacy",
        keycloakId: organism.organismOnAccounts[0].account.keycloakId,
      }),
    },
  });

  const response = await graphqlClient.request(canAccessCandidacyQuery, {
    candidacyId: candidacy.id,
  });

  expect(response.candidacy_canAccessCandidacy).toBe(true);
});

test("an organism cannot access candidacy out of his scope", async () => {
  const organism = await createOrganismHelper();
  const candidacy = await createCandidacyHelper();

  const graphqlClient = getGraphQLClient({
    headers: {
      authorization: authorizationHeaderForUser({
        role: "manage_candidacy",
        keycloakId: organism.organismOnAccounts[0].account.keycloakId,
      }),
    },
  });

  const response = await graphqlClient.request(canAccessCandidacyQuery, {
    candidacyId: candidacy.id,
  });

  expect(response.candidacy_canAccessCandidacy).toBe(false);
});

test("a maison mere can access candidacy if it manages the related organism", async () => {
  const organism = await createOrganismHelper();
  const candidacy = await createCandidacyHelper({
    candidacyArgs: {
      organismId: organism.id,
    },
  });

  const graphqlClient = getGraphQLClient({
    headers: {
      authorization: authorizationHeaderForUser({
        role: "gestion_maison_mere_aap",
        keycloakId: organism.maisonMereAAP?.gestionnaire.keycloakId || "",
      }),
    },
  });

  const response = await graphqlClient.request(canAccessCandidacyQuery, {
    candidacyId: candidacy.id,
  });

  expect(response.candidacy_canAccessCandidacy).toBe(true);
});

test("a maison mere can't access candidacy if doesn't manage the related organism", async () => {
  const organism = await createOrganismHelper();
  const candidacy = await createCandidacyHelper();

  const graphqlClient = getGraphQLClient({
    headers: {
      authorization: authorizationHeaderForUser({
        role: "gestion_maison_mere_aap",
        keycloakId: organism.maisonMereAAP?.gestionnaire.keycloakId || "",
      }),
    },
  });

  const response = await graphqlClient.request(canAccessCandidacyQuery, {
    candidacyId: candidacy.id,
  });

  expect(response.candidacy_canAccessCandidacy).toBe(false);
});

test("a certification authority manager can access candidacy feasibility in his scope", async () => {
  const candidacy = await createCandidacyHelper();
  const certificationAuthority = await createCertificationAuthorityHelper();

  await createFeasibilityDematerializedHelper({
    candidacyId: candidacy.id,
    certificationAuthorityId: certificationAuthority.id,
    isActive: true,
  });

  const graphqlClient = getGraphQLClient({
    headers: {
      authorization: authorizationHeaderForUser({
        role: "manage_certification_authority_local_account",
        keycloakId: certificationAuthority.account.keycloakId,
      }),
    },
  });

  const response = await graphqlClient.request(canAccessCandidacyQuery, {
    candidacyId: candidacy.id,
  });

  expect(response.candidacy_canAccessCandidacy).toBe(true);
});

test("a certification authority manager can't access a candidacy with a feasibility out of his scope", async () => {
  const candidacy = await createCandidacyHelper();
  const certificationAuthority = await createCertificationAuthorityHelper();

  const graphqlClient = getGraphQLClient({
    headers: {
      authorization: authorizationHeaderForUser({
        role: "manage_certification_authority_local_account",
        keycloakId: certificationAuthority.account.keycloakId,
      }),
    },
  });

  const response = await graphqlClient.request(canAccessCandidacyQuery, {
    candidacyId: candidacy.id,
  });

  expect(response.candidacy_canAccessCandidacy).toBe(false);
});

test("a local account can access to a candidacy matching certification and department, and with his certification authority linked to it", async () => {
  const candidacy = await createCandidacyHelper();

  const certificationAuthority = await createCertificationAuthorityHelper();

  const caLocalAccount = await createCertificationAuthorityLocalAccountHelper({
    certificationAuthorityId: certificationAuthority.id,
  });

  await prismaClient.certificationAuthorityLocalAccountOnCertification.create({
    data: {
      certificationAuthorityLocalAccountId: caLocalAccount.id,
      certificationId: candidacy.certificationId || "",
    },
  });

  await prismaClient.certificationAuthorityLocalAccountOnDepartment.create({
    data: {
      certificationAuthorityLocalAccountId: caLocalAccount.id,
      departmentId: candidacy.candidate?.departmentId || "75",
    },
  });

  await createFeasibilityDematerializedHelper({
    candidacyId: candidacy.id,
    certificationAuthorityId: certificationAuthority.id,
    isActive: true,
  });

  const graphqlClient = getGraphQLClient({
    headers: {
      authorization: authorizationHeaderForUser({
        role: "manage_feasibility",
        keycloakId: caLocalAccount.account.keycloakId,
      }),
    },
  });

  const response = await graphqlClient.request(canAccessCandidacyQuery, {
    candidacyId: candidacy.id,
  });

  expect(response.candidacy_canAccessCandidacy).toBe(true);
});

test("a local account can't access to a candidacy with a different certification authority (even with matching certification and department)", async () => {
  const candidacy = await createCandidacyHelper();

  const certificationAuthority = await createCertificationAuthorityHelper();

  const caLocalAccount = await createCertificationAuthorityLocalAccountHelper({
    certificationAuthorityId: certificationAuthority.id,
  });

  // In this test we are not linking the local account to the candidacy's certification

  await prismaClient.certificationAuthorityLocalAccountOnDepartment.create({
    data: {
      certificationAuthorityLocalAccountId: caLocalAccount.id,
      departmentId: candidacy.candidate?.departmentId || "75",
    },
  });

  await createFeasibilityDematerializedHelper({
    candidacyId: candidacy.id,
    certificationAuthorityId: certificationAuthority.id,
    isActive: true,
  });

  const graphqlClient = getGraphQLClient({
    headers: {
      authorization: authorizationHeaderForUser({
        role: "manage_feasibility",
        keycloakId: caLocalAccount.account.keycloakId,
      }),
    },
  });

  const response = await graphqlClient.request(canAccessCandidacyQuery, {
    candidacyId: candidacy.id,
  });

  expect(response.candidacy_canAccessCandidacy).toBe(false);
});

test("a certification registry manager cannot access candidacy", async () => {
  const candidacy = await createCandidacyHelper();
  const account = await createAccountHelper();

  const graphqlClient = getGraphQLClient({
    headers: {
      authorization: authorizationHeaderForUser({
        role: "manage_certification_registry",
        keycloakId: account.keycloakId,
      }),
    },
  });

  const response = await graphqlClient.request(canAccessCandidacyQuery, {
    candidacyId: candidacy.id,
  });

  expect(response.candidacy_canAccessCandidacy).toBe(false);
});

test("candidacy_canAccessCandidacy returns false for non-existent candidacy even if admin", async () => {
  const graphqlClient = getGraphQLClient({
    headers: {
      authorization: authorizationHeaderForUser({
        role: "admin",
        keycloakId: "admin-user",
      }),
    },
  });

  const response = await graphqlClient.request(canAccessCandidacyQuery, {
    candidacyId: faker.string.uuid(),
  });

  expect(response.candidacy_canAccessCandidacy).toBe(false);
});
