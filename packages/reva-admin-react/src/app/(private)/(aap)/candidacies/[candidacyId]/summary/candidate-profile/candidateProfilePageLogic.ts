import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useGraphQlClient } from "@/components/graphql/graphql-client/GraphqlClient";
import { graphqlErrorToast, successToast } from "@/components/toast/toast";
import {
  sanitizedOptionalText,
  sanitizedText,
} from "@/utils/input-sanitization";

import { graphql } from "@/graphql/generated";

// const schema = z.object({
//   highestDegreeId: sanitizedText(),
//   highestDegreeLabel: sanitizedText(),
//   niveauDeFormationLePlusEleveDegreeId: sanitizedText(),
// });

// type FormData = z.infer<typeof schema>;

const getCandidateProfileQuery = graphql(`
  query getCandidateProfile($candidacyId: ID!) {
    getCandidacyById(id: $candidacyId) {
      candidate {
        id
        firstname
        lastname
        givenName
        highestDegree {
          id
          level
        }
        highestDegreeLabel
        niveauDeFormationLePlusEleve {
          id
        }
      }
    }
  }
`);

const getReferentialQuery = graphql(`
  query getReferentialForCandidateProfile {
    getDegrees {
      id
      level
    }
  }
`);

const updateCandidateProfileMutation = graphql(`
  mutation updateCandidateProfileMutation(
    $candidacyId: String!
    $candidateProfile: CandidateProfileUpdateInput!
  ) {
    candidate_updateCandidateProfile(
      candidacyId: $candidacyId
      candidateProfile: $candidateProfile
    ) {
      id
    }
  }
`);

export const useCandidateProfilePageLogic = () => {
  const { graphqlClient } = useGraphQlClient();
  const queryClient = useQueryClient();
  const { candidacyId } = useParams<{
    candidacyId: string;
  }>();
  const router = useRouter();

  const { data: getCandidateProfileResponse } = useQuery({
    queryKey: ["getCandidateProfile", candidacyId],
    queryFn: () =>
      graphqlClient.request(getCandidateProfileQuery, {
        candidacyId,
      }),
  });

  const { data: getReferentialResponse } = useQuery({
    queryKey: ["getReferential"],
    queryFn: () => graphqlClient.request(getReferentialQuery),
  });

  const updateCandidateProfile = useMutation({
    mutationFn: (candidateProfile: {
      highestDegreeId: string;
      niveauDeFormationLePlusEleveDegreeId: string;
      highestDegreeLabel?: string;
    }) =>
      graphqlClient.request(updateCandidateProfileMutation, {
        candidacyId,
        candidateProfile,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [candidacyId] });
    },
  });

  const candidate = getCandidateProfileResponse?.getCandidacyById?.candidate;

  const degrees = getReferentialResponse?.getDegrees;
  const degreeLevelOne = degrees?.find((d) => d.level === 1);

  const schema = useMemo(() => {
    return z
      .object({
        highestDegreeId: sanitizedText({
          invalid_type_error: "Ce champ est obligatoire",
        }),
        highestDegreeLabel: sanitizedOptionalText(),
        niveauDeFormationLePlusEleveDegreeId: sanitizedText({
          invalid_type_error: "Ce champ est obligatoire",
        }),
      })
      .superRefine((data, ctx) => {
        const highestDegreeId = data?.highestDegreeId;
        // Le champ highestDegreeLabel est obligatoire si le niveau de formation le plus élevé n'est pas le niveau 1 (sans qualification)
        if (
          highestDegreeId !== degreeLevelOne?.id &&
          !data?.highestDegreeLabel
        ) {
          ctx.addIssue({
            code: "custom",
            message: "Ce champ est obligatoire",
            path: ["highestDegreeLabel"],
          });
        }
      });
  }, [degreeLevelOne]);

  type FormData = z.infer<typeof schema>;

  const methods = useForm<FormData>({
    resolver: standardSchemaResolver(schema),
  });
  const {
    register,
    watch,
    handleSubmit,
    reset,
    formState,
    formState: { errors },
    setError,
  } = methods;

  const resetForm = useCallback(() => {
    reset({
      highestDegreeId: candidate?.highestDegree?.id || "",
      highestDegreeLabel: candidate?.highestDegreeLabel || "",
      niveauDeFormationLePlusEleveDegreeId:
        candidate?.niveauDeFormationLePlusEleve?.id || "",
    });
  }, [reset, candidate]);

  useEffect(() => {
    resetForm();
  }, [resetForm]);

  const handleFormSubmit = handleSubmit(async (data) => {
    try {
      const { highestDegreeId, highestDegreeLabel } = data;
      const highestDegreeLevel = degrees?.find(
        (d) => d.id === highestDegreeId,
      )?.level;
      if (
        !highestDegreeLevel ||
        (highestDegreeLevel > 1 && !highestDegreeLabel)
      ) {
        setError("highestDegreeLabel", {
          message: "Merci de remplir ce champ",
        });
      } else {
        await updateCandidateProfile.mutateAsync(data);
        successToast("Les modifications ont bien été enregistrées");
        router.push(`/candidacies/${candidacyId}/summary`);
      }
    } catch (e) {
      graphqlErrorToast(e);
    }
  });

  return {
    candidacyId,
    degrees,
    candidate,
    register,
    handleFormSubmit,
    formState,
    errors,
    resetForm,
    watch,
  };
};
