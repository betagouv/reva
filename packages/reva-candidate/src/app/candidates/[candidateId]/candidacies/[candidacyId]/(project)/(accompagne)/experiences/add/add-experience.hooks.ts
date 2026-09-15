import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";

import { useGraphQlClient } from "@/components/graphql/graphql-client/GraphqlClient";
import { candidateCanEditCandidacy } from "@/utils/candidateCanEditCandidacy.util";

import { graphql } from "@/graphql/generated";
import { ExperienceInput } from "@/graphql/generated/graphql";

const getCandidacyByIdForAddExperience = graphql(`
  query getCandidacyByIdForAddExperience($candidacyId: ID!) {
    getCandidacyById(id: $candidacyId) {
      id
      status
      typeAccompagnement
      candidacyDropOut {
        status
      }
      certification {
        codeRncp
      }
    }
  }
`);

const ADD_EXPERIENCE = graphql(`
  mutation add_experience($candidacyId: ID!, $experience: ExperienceInput) {
    candidacy_addExperience(
      candidacyId: $candidacyId
      experience: $experience
    ) {
      id
      title
      startedAt
      duration
      description
    }
  }
`);

export const useAddExperience = () => {
  const { graphqlClient } = useGraphQlClient();
  const queryClient = useQueryClient();

  const { candidacyId } = useParams<{
    candidacyId: string;
  }>();

  const { data } = useQuery({
    queryKey: ["candidacy", "getCandidacyByIdForAddExperience", candidacyId],
    queryFn: () =>
      graphqlClient.request(getCandidacyByIdForAddExperience, {
        candidacyId,
      }),
  });

  const addExperience = useMutation({
    mutationKey: ["candidacy_addExperience"],
    mutationFn: ({
      candidacyId,
      experience,
    }: {
      candidacyId: string;
      experience: ExperienceInput;
    }) =>
      graphqlClient.request(ADD_EXPERIENCE, {
        candidacyId,
        experience,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["candidacy"],
      });
    },
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
    addExperience,
    canEditCandidacy,
    candidacy,
  };
};
