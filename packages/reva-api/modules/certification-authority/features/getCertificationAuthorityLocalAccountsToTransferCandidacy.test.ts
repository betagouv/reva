import { graphql } from "@/modules/graphql/generated";
import { authorizationHeaderForUser } from "@/test/helpers/authorization-helper";
import { createCertificationAuthorityHelper } from "@/test/helpers/entities/create-certification-authority-helper";
import { createCertificationAuthorityLocalAccountHelper } from "@/test/helpers/entities/create-certification-authority-local-account-helper";
import { createCertificationAuthorityStructureHelper } from "@/test/helpers/entities/create-certification-authority-structure-helper";
import { createFeasibilityUploadedPdfHelper } from "@/test/helpers/entities/create-feasibility-uploaded-pdf-helper";
import { getGraphQLClient } from "@/test/test-graphql-client";

const getLocalAccountsToTransferCandidacyQuery = graphql(`
  query getLocalAccountsToTransferCandidacyForTest($candidacyId: String!) {
    certification_authority_getCertificationAuthorityLocalAccountsToTransferCandidacy(
      candidacyId: $candidacyId
      limit: 10
      offset: 0
      searchFilter: ""
    ) {
      rows {
        id
        account {
          email
        }
      }
    }
  }
`);

const fetchLocalAccountsToTransferCandidacy = async ({
  candidacyId,
  keycloakId,
  role = "manage_certification_authority_local_account",
}: {
  candidacyId: string;
  keycloakId: string;
  role?: KeyCloakUserRole;
}) => {
  const response = await getGraphQLClient({
    headers: {
      authorization: authorizationHeaderForUser({ role, keycloakId }),
    },
  }).request(getLocalAccountsToTransferCandidacyQuery, { candidacyId });

  return response
    .certification_authority_getCertificationAuthorityLocalAccountsToTransferCandidacy
    .rows;
};

const createAuthorityOnStructures = (structureIds: string[]) =>
  createCertificationAuthorityHelper({
    certificationAuthorityOnCertificationAuthorityStructure: {
      create: structureIds.map((certificationAuthorityStructureId) => ({
        certificationAuthorityStructureId,
      })),
    },
  });

// Le certificateur gère la candidature, le collaborateur appartient à une autre
// autorité de la même structure : c'est le périmètre de la liste de transfert.
const createTransferContext = async ({
  certificateurStructureIds,
  localAccountStructureIds,
}: {
  certificateurStructureIds: string[];
  localAccountStructureIds: string[];
}) => {
  const certificateurAuthority = await createAuthorityOnStructures(
    certificateurStructureIds,
  );
  const localAccountAuthority = await createAuthorityOnStructures(
    localAccountStructureIds,
  );

  const localAccount = await createCertificationAuthorityLocalAccountHelper({
    certificationAuthorityId: localAccountAuthority.id,
  });

  const feasibility = await createFeasibilityUploadedPdfHelper({
    certificationAuthorityId: certificateurAuthority.id,
  });

  const certificateurAccount = certificateurAuthority.account;

  if (!certificateurAccount) {
    throw new Error("Le certificateur n'a pas de compte associé");
  }

  return {
    candidacyId: feasibility.candidacyId,
    certificateurAuthorityId: certificateurAuthority.id,
    certificateurKeycloakId: certificateurAccount.keycloakId,
    localAccount,
  };
};

describe("getCertificationAuthorityLocalAccountsToTransferCandidacy", () => {
  test("un certificateur peut consulter le compte d'un collaborateur rattaché à une autre autorité de sa structure", async () => {
    const structure = await createCertificationAuthorityStructureHelper();

    const { candidacyId, certificateurKeycloakId, localAccount } =
      await createTransferContext({
        certificateurStructureIds: [structure.id],
        localAccountStructureIds: [structure.id],
      });

    const rows = await fetchLocalAccountsToTransferCandidacy({
      candidacyId,
      keycloakId: certificateurKeycloakId,
    });

    expect(rows).toContainEqual({
      id: localAccount.id,
      account: { email: localAccount.account.email },
    });
  });

  test("un certificateur peut consulter ce compte même quand les deux autorités sont rattachées à plusieurs structures dans un ordre différent", async () => {
    const firstStructure = await createCertificationAuthorityStructureHelper();
    const secondStructure = await createCertificationAuthorityStructureHelper();

    const { candidacyId, certificateurKeycloakId, localAccount } =
      await createTransferContext({
        certificateurStructureIds: [firstStructure.id, secondStructure.id],
        localAccountStructureIds: [secondStructure.id, firstStructure.id],
      });

    const rows = await fetchLocalAccountsToTransferCandidacy({
      candidacyId,
      keycloakId: certificateurKeycloakId,
    });

    expect(rows).toContainEqual({
      id: localAccount.id,
      account: { email: localAccount.account.email },
    });
  });

  test("un collaborateur peut consulter le compte d'un autre collaborateur de sa structure", async () => {
    const structure = await createCertificationAuthorityStructureHelper();

    const { candidacyId, certificateurAuthorityId, localAccount } =
      await createTransferContext({
        certificateurStructureIds: [structure.id],
        localAccountStructureIds: [structure.id],
      });

    const connectedLocalAccount =
      await createCertificationAuthorityLocalAccountHelper({
        certificationAuthorityId: certificateurAuthorityId,
      });

    const rows = await fetchLocalAccountsToTransferCandidacy({
      candidacyId,
      keycloakId: connectedLocalAccount.account.keycloakId,
      role: "manage_feasibility",
    });

    expect(rows).toContainEqual({
      id: localAccount.id,
      account: { email: localAccount.account.email },
    });
  });
});
