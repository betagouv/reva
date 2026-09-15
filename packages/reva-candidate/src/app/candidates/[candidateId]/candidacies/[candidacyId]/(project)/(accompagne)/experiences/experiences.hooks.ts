import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

import { useGraphQlClient } from "@/components/graphql/graphql-client/GraphqlClient";
import { candidateCanEditCandidacy } from "@/utils/candidateCanEditCandidacy.util";

import { graphql } from "@/graphql/generated";

const GET_CANDIDACY_BY_ID_FOR_EXPERIENCES_PAGE = graphql(`
  query getCandidacyByIdForExperiencesPage($candidacyId: ID!) {
    getCandidacyById(id: $candidacyId) {
      id
      status
      typeAccompagnement
      certification {
        id
        codeRncp
      }
      candidacyDropOut {
        status
      }
      experiences {
        id
        title
        startedAt
        duration
        description
      }
    }
  }
`);

export const useExperiences = () => {
  const { graphqlClient } = useGraphQlClient();

  const { candidacyId } = useParams<{
    candidacyId: string;
  }>();

  const { data } = useQuery({
    queryKey: ["candidacy", "getCandidacyByIdForExperiencesPage", candidacyId],
    queryFn: () =>
      graphqlClient.request(GET_CANDIDACY_BY_ID_FOR_EXPERIENCES_PAGE, {
        candidacyId,
      }),
  });

  const candidacy = data?.getCandidacyById;

  let canEditCandidacy = candidateCanEditCandidacy({
    candidacyStatus: candidacy?.status,
    typeAccompagnement: candidacy?.typeAccompagnement,
    candidacyDropOut: !!candidacy?.candidacyDropOut,
  });

  // Candidat accompagné et candidacy.status différent de PROJET
  if (
    candidacy?.typeAccompagnement === "ACCOMPAGNE" &&
    candidacy?.status !== "PROJET"
  ) {
    canEditCandidacy = false;
  }

  return {
    candidacy,
    canEditCandidacy,
  };
};
