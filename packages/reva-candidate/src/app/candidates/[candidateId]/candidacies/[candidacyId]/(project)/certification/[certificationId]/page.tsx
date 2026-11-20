import { CertificationPage } from "@/components/certification-page/CertificationPage";
import { getSsrGraphQlClient } from "@/components/graphql/graphql-client/GraphqlClient";
import { Panel } from "@/components/layout/Panel";

import { graphql } from "@/graphql/generated";

import CertificationBreadcrumbs from "./_components/CertificationBreadcrumbs";
import CertificationChangeButtons from "./_components/CertificationChangeButtons";

const GET_CERTIFICATION = graphql(`
  query getCertificationByIdForCertificationPage($certificationId: ID!) {
    getCertification(certificationId: $certificationId) {
      id
      prerequisites {
        id
        label
      }
      juryPlace
      juryEstimatedCost
      juryTypeSoutenanceOrale
      juryTypeMiseEnSituationProfessionnelle
      rncpObjectifsContexte
      level
      typeDiplome
      rncpExpiresAt
      id
      label
      codeRncp
      isAapAvailable
      additionalInfo {
        dossierDeValidationLink
        dossierDeValidationTemplate {
          url
          name
          mimeType
        }
        linkToReferential
        linkToJuryGuide
        linkToCorrespondenceTable
        additionalDocuments {
          url
          name
          mimeType
        }
        certificationExpertContactDetails
        certificationExpertContactPhone
        certificationExpertContactEmail
        usefulResources
        commentsForAAP
      }
      competenceBlocs {
        id
        code
        label
        competences {
          id
          label
        }
      }
      parcours {
        info {
          totalRows
        }
      }
      parcoursByCertificationAuthorities {
        certificationAuthority {
          label
          websiteUrl
        }
        parcours {
          id
          label
        }
      }
      certificationAuthorityStructure {
        label
        hasReducedRequirements
      }
    }
  }
`);

export default async function CertificationDetail({
  params,
}: {
  params: Promise<{ certificationId: string }>;
}) {
  const { graphqlClient } = getSsrGraphQlClient();
  const { certificationId } = await params;

  const data = await graphqlClient.request(GET_CERTIFICATION, {
    certificationId,
  });
  const certification = data?.getCertification;

  if (!certification) {
    return null;
  }

  return (
    <Panel>
      <div data-testid="certificates">
        <CertificationBreadcrumbs currentlyShownCertification={certification} />
        <CertificationPage certification={certification} />
        <CertificationChangeButtons selectedCertification={certification} />
      </div>
    </Panel>
  );
}
