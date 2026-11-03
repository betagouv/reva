import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

import { useGraphQlClient } from "@/components/graphql/graphql-client/GraphqlClient";

import { graphql } from "@/graphql/generated";

const getCandidacyWithDossierDeValidationQuery = graphql(`
  query getCandidacyWithDossierDeValidationQueryForProblemPage(
    $candidacyId: ID!
  ) {
    getCandidacyById(id: $candidacyId) {
      id
      activeDossierDeValidation {
        id
        dossierDeValidationSentAt
      }
    }
  }
`);

const signalDossierDeValidationProblemMutation = graphql(`
  mutation dossierDeValidation_markAsIncomplete(
    $dossierDeValidationId: ID!
    $decisionComment: String!
  ) {
    dossierDeValidation_markAsIncomplete(
      dossierDeValidationId: $dossierDeValidationId
      decisionComment: $decisionComment
    ) {
      id
    }
  }
`);

export const useDossierDeValidationProblemPageLogic = () => {
  const { graphqlClient } = useGraphQlClient();
  const { candidacyId } = useParams<{
    candidacyId: string;
  }>();

  const { data: getDossierDeValidationResponse } = useQuery({
    queryKey: ["getCandidacyWithDossierDeValidationQuery", candidacyId],
    queryFn: () =>
      graphqlClient.request(getCandidacyWithDossierDeValidationQuery, {
        candidacyId,
      }),
  });

  const signalDossierDeValidationProblem = useMutation({
    mutationFn: ({
      dossierDeValidationId,
      decisionComment,
    }: {
      dossierDeValidationId: string;
      decisionComment: string;
    }) =>
      graphqlClient.request(signalDossierDeValidationProblemMutation, {
        dossierDeValidationId,
        decisionComment,
      }),
  });

  const candidacy = getDossierDeValidationResponse?.getCandidacyById;
  const dossierDeValidation = candidacy?.activeDossierDeValidation;

  return {
    dossierDeValidation,
    candidacy,
    signalDossierDeValidationProblem,
  };
};
