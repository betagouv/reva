import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

import { useGraphQlClient } from "@/components/graphql/graphql-client/GraphqlClient";
import { PREVIEW_URL_REFETCH_INTERVAL_MS } from "@/constants/previewUrl.constant";

import { graphql } from "@/graphql/generated";

const getCandidacyWithDossierDeValidationQuery = graphql(`
  query getCandidacyWithDossierDeValidationV2($candidacyId: ID!) {
    getCandidacyById(id: $candidacyId) {
      id
      readyForJuryEstimatedAt
      status
      activeDossierDeValidation {
        id
        decision
        decisionSentAt
        decisionComment
        dossierDeValidationSentAt
        dossierDeValidationFile {
          name
          url
          previewUrl
        }
        dossierDeValidationOtherFiles {
          name
          url
          previewUrl
        }
        amenagementSpecifique {
          id
          justificationDescription
          justificationFile {
            name
            url
            previewUrl
          }
        }
      }
      jury {
        id
        result
      }
      historyDossierDeValidation {
        id
        decision
        decisionSentAt
        decisionComment
        dossierDeValidationSentAt
        dossierDeValidationFile {
          name
          url
          previewUrl
        }
        dossierDeValidationOtherFiles {
          name
          url
          previewUrl
        }
      }
    }
  }
`);

export const useDossierDeValidationPageLogic = () => {
  const { graphqlClient } = useGraphQlClient();
  const { candidacyId } = useParams<{
    candidacyId: string;
  }>();

  const { data: getDossierDeValidationResponse } = useQuery({
    queryKey: ["getCandidacyWithDossierDeValidationV2", candidacyId],
    refetchInterval: PREVIEW_URL_REFETCH_INTERVAL_MS,
    queryFn: () =>
      graphqlClient.request(getCandidacyWithDossierDeValidationQuery, {
        candidacyId,
      }),
  });

  const candidacy = getDossierDeValidationResponse?.getCandidacyById;
  const dossierDeValidation = candidacy?.activeDossierDeValidation;
  const jury = candidacy?.jury;
  const historyDossierDeValidation =
    candidacy?.historyDossierDeValidation || [];

  const readyForJuryEstimatedAt = candidacy?.readyForJuryEstimatedAt;

  const canSignalProblem = dossierDeValidation?.decision === "PENDING" && !jury;

  const amenagementSpecifique = jury?.result
    ? null
    : dossierDeValidation?.amenagementSpecifique;

  return {
    amenagementSpecifique,
    dossierDeValidation,
    historyDossierDeValidation,
    candidacy,
    readyForJuryEstimatedAt,
    canSignalProblem,
  };
};
