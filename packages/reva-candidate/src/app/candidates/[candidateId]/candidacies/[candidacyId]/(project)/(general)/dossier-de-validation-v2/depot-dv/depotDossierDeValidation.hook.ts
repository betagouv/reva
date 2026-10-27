/* eslint-disable react-hooks/preserve-manual-memoization */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toDate } from "date-fns";
import { useParams } from "next/navigation";
import { useCallback } from "react";

import { useKeycloakContext } from "@/components/auth/keycloak.context";
import { useGraphQlClient } from "@/components/graphql/graphql-client/GraphqlClient";
import { REST_API_URL } from "@/config/config";

import { graphql } from "@/graphql/generated";

const getCandidacyByIdForDossierDeValidationPage = graphql(`
  query getCandidacyByIdForDepotDossierDeValidationPage($candidacyId: ID!) {
    getCandidacyById(id: $candidacyId) {
      id
      readyForJuryEstimatedAt
      certification {
        id
        label
        additionalInfo {
          dossierDeValidationTemplate {
            previewUrl
          }
          dossierDeValidationLink
        }
      }
      activeDossierDeValidation {
        id
        decision
        decisionSentAt
        decisionComment
        dossierDeValidationSentAt
        dossierDeValidationFile {
          name
          previewUrl
        }
        dossierDeValidationOtherFiles {
          name
          previewUrl
        }
        history {
          id
          decisionSentAt
          decisionComment
        }
        amenagementSpecifique {
          justificationFile {
            name
            previewUrl
          }
          justificationDescription
        }
      }
      jury {
        result
        informationOfResult
        dateOfResult
        dateOfSession
      }
    }
  }
`);

const updateReadyForJuryEstimatedAtMutation = graphql(`
  mutation updateReadyForJuryEstimatedAtForDossierDeValidationPage(
    $candidacyId: UUID!
    $readyForJuryEstimatedAt: Date!
  ) {
    candidacy_setReadyForJuryEstimatedAt(
      candidacyId: $candidacyId
      readyForJuryEstimatedAt: $readyForJuryEstimatedAt
    ) {
      id
      readyForJuryEstimatedAt
    }
  }
`);

export const useDepotDossierDeValidationPage = () => {
  const { graphqlClient } = useGraphQlClient();
  const queryClient = useQueryClient();
  const { accessToken } = useKeycloakContext();

  const { candidacyId } = useParams<{
    candidacyId: string;
  }>();

  const { data: getCandidacyByIdResponse, status: queryStatus } = useQuery({
    queryKey: [
      "candidacy",
      "getCandidacyByIdForDossierDeValidationPage",
      candidacyId,
    ],
    queryFn: () =>
      graphqlClient.request(getCandidacyByIdForDossierDeValidationPage, {
        candidacyId,
      }),
  });

  const updateReadyForJuryEstimatedAt = useMutation({
    mutationFn: (data: { readyForJuryEstimatedAt: string }) =>
      graphqlClient.request(updateReadyForJuryEstimatedAtMutation, {
        readyForJuryEstimatedAt: data.readyForJuryEstimatedAt,
        candidacyId: candidacy?.id,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["candidate"] }),
  });

  const candidacy = getCandidacyByIdResponse?.getCandidacyById;
  const readyForJuryEstimatedAt = candidacy?.readyForJuryEstimatedAt;
  const certification = candidacy?.certification || null;

  const dossierDeValidation = candidacy?.activeDossierDeValidation;

  const dossierDeValidationProblems =
    dossierDeValidation?.history?.map((h) => ({
      decisionSentAt: toDate(h.decisionSentAt || 0),
      decisionComment: h.decisionComment || "",
    })) || [];

  if (dossierDeValidation?.decision === "INCOMPLETE") {
    dossierDeValidationProblems.unshift({
      decisionSentAt: toDate(dossierDeValidation.decisionSentAt || 0),
      decisionComment: dossierDeValidation.decisionComment || "",
    });
  }

  const jury = candidacy?.jury;

  const sendDossierDeValidation = useCallback(
    async (data: {
      dossierDeValidationFile: {
        0: File;
      };
      dossierDeValidationOtherFiles: {
        0?: File | undefined;
      }[];
      amenagementSpecifiqueFile?: {
        0?: File | undefined;
      };
      amenagementSpecifiqueDescription?: string;
    }) => {
      const formData = new FormData();

      formData.append("candidacyId", candidacy?.id || "");

      if (data.dossierDeValidationFile?.[0]) {
        formData.append(
          "dossierDeValidationFile",
          data.dossierDeValidationFile?.[0],
        );
      }

      data.dossierDeValidationOtherFiles.forEach(
        (f) =>
          f?.[0] && formData.append("dossierDeValidationOtherFiles", f?.[0]),
      );

      if (data.amenagementSpecifiqueFile?.[0]) {
        formData.append(
          "amenagementSpecifiqueFile",
          data.amenagementSpecifiqueFile?.[0],
        );
      }

      if (data.amenagementSpecifiqueDescription) {
        formData.append(
          "amenagementSpecifiqueDescription",
          data.amenagementSpecifiqueDescription,
        );
      }
      const result = await fetch(
        `${REST_API_URL}/dossier-de-validation/upload-dossier-de-validation`,
        {
          method: "post",
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        },
      );

      if (!result.ok) {
        if (result.status === 413) {
          throw new Error(
            "Le fichier que vous tentez d'envoyer est trop volumineux. Veuillez soumettre un fichier d'une taille égale ou inférieure à 10 Mo",
          );
        }
        const errorMessage = await result.text();
        throw new Error(errorMessage);
      }
    },
    [accessToken, candidacy?.id],
  );

  return {
    readyForJuryEstimatedAt,
    certification,
    dossierDeValidation,
    dossierDeValidationProblems,
    queryStatus,
    updateReadyForJuryEstimatedAt,
    sendDossierDeValidation,
    jury,
  };
};
