import { useSuspenseQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

import { useGraphQlClient } from "@/components/graphql/graphql-client/GraphqlClient";

import { graphql } from "@/graphql/generated";

const getCandidacyByIdForFeasibilityDematAutonomePage = graphql(`
  query getCandidacyByIdForFeasibilityDematAutonomePage($candidacyId: ID!) {
    getCandidacyById(id: $candidacyId) {
      id
      individualHourCount
      collectiveHourCount
      additionalHourCount
      status
      conventionCollective {
        label
      }
      candidacyDropOut {
        createdAt
      }
      isCertificationPartial
      typology
      typeAccompagnement
      candidate {
        id
        gender
        givenName
        firstname
        firstname2
        firstname3
        middleNames
        lastname
        birthdate
        nationality
        niveauDeFormationLePlusEleve {
          level
        }
        highestDegree {
          level
        }
        highestDegreeLabel
        birthDepartment {
          label
          code
        }
        birthCity
        email
        phone
      }
      candidateInfo {
        street
        city
        zip
        addressComplement
      }
      organism {
        contactAdministrativePhone
        contactAdministrativeEmail
        adresseVille
        adresseCodePostal
        adresseInformationsComplementaires
        adresseNumeroEtNomDeRue
        emailContact
        telephone
        nomPublic
        label
      }
      certificationAuthorities {
        contactFullName
        contactEmail
        contactPhone
        label
        id
      }
      certificationAuthorityLocalAccounts {
        contactFullName
        contactEmail
        contactPhone
      }
      experiences {
        id
        title
        startedAt
        duration
        description
      }
      mandatoryTrainings {
        id
        label
      }
      experiences {
        id
      }
      goals {
        id
        label
      }
      basicSkills {
        id
        label
      }
      certification {
        id
        label
        codeRncp
        rncpExpiresAt
        competenceBlocs {
          id
          label
        }
        certificationAuthorityStructure {
          label
          hasReducedRequirements
        }
      }
      warningOnFeasibilitySubmission
      feasibility {
        certificationAuthority {
          label
          contactFullName
          contactEmail
          contactPhone
        }
        decision
        decisionSentAt
        decisionComment
        feasibilityFileSentAt
        history {
          id
          decision
          decisionComment
          decisionSentAt
        }
        dematerializedFeasibilityFile {
          id
          eligibilityCandidateSituation
          swornStatementFile {
            name
            previewUrl
            mimeType
          }
          isReadyToBeSentToCandidate
          isReadyToBeSentToCertificationAuthority
          sentToCandidateAt
          certificationPartComplete
          competenceBlocsPartCompletion
          attachmentsPartComplete
          prerequisitesPartComplete
          firstForeignLanguage
          secondForeignLanguage
          option
          prerequisitesComment
          prerequisites {
            id
            label
            state
          }
          blocsDeCompetences {
            complete
            text
            certificationCompetenceBloc {
              id
              code
              label
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
          aapDecision
          aapDecisionComment
          candidateDecisionComment
          attachments {
            id
            file {
              previewUrl
              name
            }
          }
          eligibilityRequirement
          eligibilityValidUntil
          dffFile {
            url
            name
            previewUrl
            mimeType
          }
          complementExperienceParcoursVise
        }
      }
    }
  }
`);

export const useFeasibilityDematAutonomePage = () => {
  const { graphqlClient } = useGraphQlClient();

  const { candidacyId } = useParams<{
    candidacyId: string;
  }>();

  const { data: getCandidateResponse, status: queryStatus } = useSuspenseQuery({
    queryKey: [
      "candidacy",
      "getCandidacyByIdForFeasibilityDematAutonomePage",
      candidacyId,
    ],
    queryFn: () =>
      graphqlClient.request(getCandidacyByIdForFeasibilityDematAutonomePage, {
        candidacyId,
      }),
  });

  const candidacy = getCandidateResponse?.getCandidacyById;

  return {
    candidacyId,
    candidacy,
    queryStatus,
  };
};
