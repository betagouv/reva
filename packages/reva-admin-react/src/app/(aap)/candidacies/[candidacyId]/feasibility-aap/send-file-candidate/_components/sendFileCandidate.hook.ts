import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

import { useGraphQlClient } from "@/components/graphql/graphql-client/GraphqlClient";

import { graphql } from "@/graphql/generated";

const sendToCandidate = graphql(`
  mutation sendToCandidate(
    $dematerializedFeasibilityFileId: ID!
    $candidacyId: ID!
  ) {
    dematerialized_feasibility_file_sendToCandidate(
      dematerializedFeasibilityFileId: $dematerializedFeasibilityFileId
      candidacyId: $candidacyId
    )
  }
`);

const feasibilityWithDematerializedFeasibilityFileSendFileCandidateByCandidacyId =
  graphql(`
    query feasibilityWithDematerializedFeasibilityFileSendFileCandidateByCandidacyId(
      $candidacyId: ID!
    ) {
      feasibility_getActiveFeasibilityByCandidacyId(candidacyId: $candidacyId) {
        dematerializedFeasibilityFile {
          id
          eligibilityCandidateSituation
          sentToCandidateAt
          aapDecision
          aapDecisionComment
          candidateDecisionComment
          prerequisites {
            id
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
        candidacy {
          id
          individualHourCount
          collectiveHourCount
          additionalHourCount
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
  `);

export const useSendFileCandidate = () => {
  const { graphqlClient } = useGraphQlClient();
  const { candidacyId } = useParams<{
    candidacyId: string;
  }>();

  const { data: getCandidacyByIdResponse } = useQuery({
    queryKey: [
      candidacyId,
      "dematerializedFeasibilityFileSendFileCandidateByCandidacyId",
    ],
    queryFn: () =>
      graphqlClient.request(
        feasibilityWithDematerializedFeasibilityFileSendFileCandidateByCandidacyId,
        {
          candidacyId,
        },
      ),
  });

  const { mutateAsync: sendToCandidateMutation } = useMutation({
    mutationFn: (dematerializedFeasibilityFileId: string) =>
      graphqlClient.request(sendToCandidate, {
        dematerializedFeasibilityFileId,
        candidacyId,
      }),
  });

  const feasibility =
    getCandidacyByIdResponse?.feasibility_getActiveFeasibilityByCandidacyId;
  const dematerializedFeasibilityFile =
    feasibility?.dematerializedFeasibilityFile;
  const dematerializedFeasibilityFileId = dematerializedFeasibilityFile?.id;
  const candidacy = feasibility?.candidacy;
  return {
    dematerializedFeasibilityFileId,
    candidacy,
    sendToCandidateMutation,
    dematerializedFeasibilityFile,
  };
};
