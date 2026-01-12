import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";

import { useGraphQlClient } from "@/components/graphql/graphql-client/GraphqlClient";

import { graphql } from "@/graphql/generated";

const sendToCertificationAuthority = graphql(`
  mutation sendToCertificationAuthority(
    $dematerializedFeasibilityFileId: ID!
    $certificationAuthorityId: ID!
    $candidacyId: ID!
  ) {
    dematerialized_feasibility_file_sendToCertificationAuthority(
      dematerializedFeasibilityFileId: $dematerializedFeasibilityFileId
      certificationAuthorityId: $certificationAuthorityId
      candidacyId: $candidacyId
    )
  }
`);

const getActiveFeasibilitySendFileCertificationAuthorityByCandidacyId = graphql(
  `
    query getActiveFeasibilitySendFileCertificationAuthorityByCandidacyId(
      $candidacyId: ID!
    ) {
      feasibility_getActiveFeasibilityByCandidacyId(candidacyId: $candidacyId) {
        feasibilityFileSentAt
        decision
        decisionSentAt
        decisionComment
        dematerializedFeasibilityFile {
          id
          eligibilityCandidateSituation
          swornStatementFile {
            name
            previewUrl
            mimeType
          }
          sentToCandidateAt
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
          attachments {
            type
            file {
              name
              previewUrl
              mimeType
            }
          }
          isReadyToBeSentToCertificationAuthority
          eligibilityRequirement
          eligibilityValidUntil
          dffFile {
            url
            name
            previewUrl
            mimeType
          }
        }
        candidacy {
          id
          isCertificationPartial
          typology
          feasibility {
            certificationAuthority {
              label
              contactFullName
              contactEmail
              contactPhone
            }
          }
          conventionCollective {
            label
          }
          certificationAuthorities {
            id
            label
          }
          certificationAuthorityLocalAccounts {
            contactFullName
            contactEmail
            contactPhone
          }
          individualHourCount
          collectiveHourCount
          additionalHourCount
          basicSkills {
            label
            id
          }
          mandatoryTrainings {
            label
            id
          }
          certification {
            id
            label
            codeRncp
            level
            degree {
              level
            }
            competenceBlocs {
              id
              code
              label
            }
            certificationAuthorityStructure {
              label
            }
          }
          goals {
            id
            label
            isActive
          }
          experiences {
            id
            title
            startedAt
            duration
            description
          }
          certificateSkills
          candidateInfo {
            street
            city
            zip
            addressComplement
          }
          candidate {
            highestDegree {
              level
            }
            niveauDeFormationLePlusEleve {
              level
            }
            highestDegreeLabel
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
              region {
                code
                label
              }
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
          }
        }
      }
    }
  `,
);

export const useSendFileCertificationAuthority = () => {
  const { graphqlClient } = useGraphQlClient();
  const { candidacyId } = useParams<{
    candidacyId: string;
  }>();
  const queryClient = useQueryClient();

  const { data: getCandidacyByIdResponse } = useQuery({
    queryKey: [
      candidacyId,
      "dematerializedFeasibilityFileSendFileCertificationAuthorityByCandidacyId",
    ],
    queryFn: () =>
      graphqlClient.request(
        getActiveFeasibilitySendFileCertificationAuthorityByCandidacyId,
        {
          candidacyId,
        },
      ),
  });

  const { mutateAsync: sendToCertificationAuthorityMutation } = useMutation({
    mutationFn: ({
      dematerializedFeasibilityFileId,
      certificationAuthorityId,
    }: {
      dematerializedFeasibilityFileId: string;
      certificationAuthorityId: string;
    }) =>
      graphqlClient.request(sendToCertificationAuthority, {
        dematerializedFeasibilityFileId,
        certificationAuthorityId,
        candidacyId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [candidacyId],
      });
    },
  });

  const feasibility =
    getCandidacyByIdResponse?.feasibility_getActiveFeasibilityByCandidacyId;
  const candidacy = feasibility?.candidacy;
  const dematerializedFeasibilityFile =
    feasibility?.dematerializedFeasibilityFile;
  const dematerializedFeasibilityFileId = dematerializedFeasibilityFile?.id;

  return {
    dematerializedFeasibilityFileId,
    candidacy,
    sendToCertificationAuthorityMutation,
    dematerializedFeasibilityFile,
    feasibility,
  };
};
