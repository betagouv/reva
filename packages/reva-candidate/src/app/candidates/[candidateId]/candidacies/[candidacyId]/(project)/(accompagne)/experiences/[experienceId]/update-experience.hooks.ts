import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";

import { useGraphQlClient } from "@/components/graphql/graphql-client/GraphqlClient";
import { candidateCanEditCandidacy } from "@/utils/candidateCanEditCandidacy.util";

import { graphql } from "@/graphql/generated";
import { ExperienceInput } from "@/graphql/generated/graphql";

const getCandidacyByIdForUpdateExperience = graphql(`
  query getCandidacyByIdForUpdateExperience($candidacyId: ID!) {
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

const UPDATE_EXPERIENCE = graphql(`
  mutation update_experience(
    $candidacyId: ID!
    $experienceId: ID!
    $experience: ExperienceInput
  ) {
    candidacy_updateExperience(
      candidacyId: $candidacyId
      experienceId: $experienceId
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

const DELETE_EXPERIENCE = graphql(`
  mutation delete_experience($candidacyId: ID!, $experienceId: ID!) {
    candidacy_deleteExperience(
      candidacyId: $candidacyId
      experienceId: $experienceId
    )
  }
`);

export const useUpdateExperience = () => {
  const { graphqlClient } = useGraphQlClient();
  const queryClient = useQueryClient();

  const { candidacyId } = useParams<{
    candidacyId: string;
  }>();

  const { data } = useQuery({
    queryKey: ["candidacy", "getCandidacyByIdForUpdateExperience", candidacyId],
    queryFn: () =>
      graphqlClient.request(getCandidacyByIdForUpdateExperience, {
        candidacyId,
      }),
  });

  const updateExperience = useMutation({
    mutationKey: ["candidacy_updateExperience"],
    mutationFn: ({
      candidacyId,
      experienceId,
      experience,
    }: {
      candidacyId: string;
      experienceId: string;
      experience: ExperienceInput;
    }) =>
      graphqlClient.request(UPDATE_EXPERIENCE, {
        candidacyId,
        experienceId,
        experience,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["candidacy"],
      });
    },
  });

  const deleteExperience = useMutation({
    mutationKey: ["candidacy_deleteExperience"],
    mutationFn: ({
      candidacyId,
      experienceId,
    }: {
      candidacyId: string;
      experienceId: string;
    }) =>
      graphqlClient.request(DELETE_EXPERIENCE, {
        candidacyId,
        experienceId,
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
    updateExperience,
    deleteExperience,
    canEditCandidacy,
    candidacy,
  };
};
