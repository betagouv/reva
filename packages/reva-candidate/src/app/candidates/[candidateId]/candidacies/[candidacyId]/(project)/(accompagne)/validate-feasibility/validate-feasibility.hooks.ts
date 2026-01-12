import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";

import { useGraphQlClient } from "@/components/graphql/graphql-client/GraphqlClient";
import { useUrqlClient } from "@/components/graphql/urql-client/UrqlClient";

import { graphql } from "@/graphql/generated";
import { DematerializedFeasibilityFileCreateOrUpdateCandidateDecisionInput } from "@/graphql/generated/graphql";

const GET_CANDIDACY_BY_ID_WITH_CANDIDATE_FOR_VALIDATE_FEASIBILITY = graphql(`
  query getCandidacyByIdWithCandidateForValidateFeasibility($candidacyId: ID!) {
    getCandidacyById(id: $candidacyId) {
      id
      candidateInfo {
        street
        city
        zip
        addressComplement
      }
      typology
      conventionCollective {
        label
      }
      organism {
        label
        nomPublic
        adresseVille
        adresseCodePostal
        adresseInformationsComplementaires
        adresseNumeroEtNomDeRue
        emailContact
        telephone
      }
      candidate {
        id
        firstname
        firstname2
        firstname3
        lastname
        email
        givenName
        birthdate
        birthCity
        birthDepartment {
          label
          code
        }
        country {
          id
          label
        }
        nationality
        gender
        phone
        city
        street
        zip
        niveauDeFormationLePlusEleve {
          level
        }
        highestDegree {
          level
        }
        highestDegreeLabel
      }
      experiences {
        id
        title
        startedAt
        duration
        description
      }
      certification {
        id
        label
        level
        codeRncp
        degree {
          level
        }
        competenceBlocs {
          label
          id
          code
        }
        certificationAuthorityStructure {
          label
        }
      }
      goals {
        id
        label
        order
        needsAdditionalInformation
        isActive
      }
      basicSkills {
        id
        label
      }
      mandatoryTrainings {
        id
        label
      }
      additionalHourCount
      individualHourCount
      collectiveHourCount
      isCertificationPartial
      certificationAuthorityLocalAccounts {
        contactFullName
        contactEmail
        contactPhone
      }
      feasibility {
        certificationAuthority {
          label
          contactFullName
          contactEmail
          contactPhone
        }
        feasibilityFileSentAt
        dematerializedFeasibilityFile {
          id
          eligibilityCandidateSituation
          attachments {
            type
            file {
              name
              previewUrl
              mimeType
            }
          }
          sentToCandidateAt
          isReadyToBeSentToCandidate
          candidateConfirmationAt
          aapDecision
          aapDecisionComment
          candidateDecisionComment
          prerequisites {
            label
            state
          }
          firstForeignLanguage
          secondForeignLanguage
          option
          blocsDeCompetences {
            text
            complete
            certificationCompetenceBloc {
              id
              code
              label
              FCCompetences
              competences {
                id
                label
              }
            }
          }
          certificationCompetenceDetails {
            state
            certificationCompetence {
              id
              label
            }
          }
          eligibilityRequirement
          eligibilityValidUntil
          swornStatementFile {
            name
            previewUrl
            mimeType
          }
          dffFile {
            url
            name
            previewUrl
            mimeType
          }
        }
      }
    }
  }
`);

const CREATE_OR_UPDATE_SWORN_STATEMENT = graphql(`
  mutation dematerialized_feasibility_file_createOrUpdateSwornStatement(
    $candidacyId: ID!
    $swornStatement: Upload!
  ) {
    dematerialized_feasibility_file_createOrUpdateSwornStatement(
      candidacyId: $candidacyId
      input: { swornStatement: $swornStatement }
    ) {
      id
    }
  }
`);

const dffCandidateConfirmationRequest = graphql(`
  mutation dematerialized_feasibility_file_confirmCandidate(
    $candidacyId: ID!
    $dematerializedFeasibilityFileId: ID!
    $input: DematerializedFeasibilityFileCreateOrUpdateCandidateDecisionInput!
  ) {
    dematerialized_feasibility_file_confirmCandidate(
      candidacyId: $candidacyId
      dematerializedFeasibilityFileId: $dematerializedFeasibilityFileId
      input: $input
    ) {
      id
    }
  }
`);

export const useValidateFeasibility = () => {
  const urqlClient = useUrqlClient();
  const { graphqlClient } = useGraphQlClient();
  const queryClient = useQueryClient();

  const { candidacyId } = useParams<{
    candidacyId: string;
  }>();

  const { data } = useQuery({
    queryKey: ["candidacy", "validate-feasibility", candidacyId],
    queryFn: () =>
      graphqlClient.request(
        GET_CANDIDACY_BY_ID_WITH_CANDIDATE_FOR_VALIDATE_FEASIBILITY,
        {
          candidacyId,
        },
      ),
  });

  const candidacy = data?.getCandidacyById;
  const candidate = candidacy?.candidate;
  const dematerializedFeasibilityFile =
    candidacy?.feasibility?.dematerializedFeasibilityFile;

  const createOrUpdateSwornStatement = ({
    candidacyId,
    swornStatement,
  }: {
    candidacyId: string;
    swornStatement: File;
  }) =>
    urqlClient.mutation(CREATE_OR_UPDATE_SWORN_STATEMENT, {
      candidacyId,
      swornStatement,
    });

  const dffCandidateConfirmation = useMutation({
    mutationKey: ["dematerialized_feasibility_file_confirmCandidate"],
    mutationFn: async ({
      candidacyId,
      dematerializedFeasibilityFileId,
      input,
    }: {
      candidacyId: string;
      dematerializedFeasibilityFileId: string;
      input: DematerializedFeasibilityFileCreateOrUpdateCandidateDecisionInput;
    }) =>
      graphqlClient.request(dffCandidateConfirmationRequest, {
        candidacyId,
        dematerializedFeasibilityFileId,
        input,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["candidacy"],
      }),
  });

  return {
    createOrUpdateSwornStatement,
    dffCandidateConfirmation,
    candidacy,
    dematerializedFeasibilityFile,
    candidate,
  };
};

type ValidateFeasibilityHookReturnType = ReturnType<
  typeof useValidateFeasibility
>;

export type UseValidateFeasibilityCandidacy = NonNullable<
  ValidateFeasibilityHookReturnType["candidacy"]
>;
