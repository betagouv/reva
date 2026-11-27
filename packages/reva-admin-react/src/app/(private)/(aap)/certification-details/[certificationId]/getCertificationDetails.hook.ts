import { useQuery } from "@tanstack/react-query";

import { useGraphQlClient } from "@/components/graphql/graphql-client/GraphqlClient";
import { PREVIEW_URL_REFETCH_INTERVAL_MS } from "@/constants/previewUrl.constant";

import { graphql } from "@/graphql/generated";

const getCertificationQuery = graphql(`
  query getCertificationForCertificationDetailsPage($certificationId: ID!) {
    getCertification(certificationId: $certificationId) {
      id
      label
      codeRncp
      status
      rncpExpiresAt
      rncpPublishedAt
      rncpEffectiveAt
      rncpDeliveryDeadline
      availableAt
      typeDiplome
      juryTypeMiseEnSituationProfessionnelle
      juryTypeSoutenanceOrale
      juryFrequency
      juryFrequencyOther
      juryPlace
      juryEstimatedCost
      certificationAuthorityStructure {
        hasReducedRequirements
      }
      parcours {
        info {
          totalRows
        }
      }
      parcoursByCertificationAuthorities {
        certificationAuthority {
          id
          label
          websiteUrl
        }
        parcours {
          id
          label
        }
      }
      additionalInfo {
        linkToReferential
        linkToCorrespondenceTable
        dossierDeValidationTemplate {
          name
          previewUrl
          mimeType
        }
        dossierDeValidationLink
        linkToJuryGuide
        certificationExpertContactDetails
        certificationExpertContactPhone
        certificationExpertContactEmail
        usefulResources
        commentsForAAP
        additionalDocuments {
          name
          previewUrl
        }
      }
      degree {
        id
        level
      }
      domains {
        id
        code
        label
        children {
          id
          code
          label
        }
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
      prerequisites {
        id
        label
      }
    }
  }
`);

const getCandidacyById = graphql(`
  query getCandidacyForCertificationDetailsPage($candidacyId: ID!) {
    getCandidacyById(id: $candidacyId) {
      candidacyDropOut {
        createdAt
      }
      id
      status
      certification {
        id
        codeRncp
        label
      }
    }
  }
`);

export const useCertificationDetailsPage = ({
  certificationId,
  candidacyId,
}: {
  certificationId: string;
  candidacyId?: string | null;
}) => {
  const { graphqlClient } = useGraphQlClient();

  const {
    data: getCertificationQueryResponse,
    status: getCertificationQueryStatus,
  } = useQuery({
    queryKey: [
      certificationId,
      "certifications",
      "getCertificationForCertificationDetailsPage",
    ],
    refetchInterval: PREVIEW_URL_REFETCH_INTERVAL_MS,
    queryFn: () =>
      graphqlClient.request(getCertificationQuery, {
        certificationId,
      }),
  });

  const { data: getCandidacyQueryResponse } = useQuery({
    queryKey: [
      candidacyId,
      "candidacies",
      "getCandidacyForCertificationDetailsPage",
    ],
    queryFn: () =>
      candidacyId
        ? graphqlClient.request(getCandidacyById, { candidacyId })
        : null,
  });

  const certification = getCertificationQueryResponse?.getCertification;
  const candidacy = getCandidacyQueryResponse?.getCandidacyById;

  return {
    certification,
    candidacy,
    getCertificationQueryStatus,
  };
};
