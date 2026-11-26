"use client";
import { Breadcrumb } from "@codegouvfr/react-dsfr/Breadcrumb";
import CallOut from "@codegouvfr/react-dsfr/CallOut";
import Input from "@codegouvfr/react-dsfr/Input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";

import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { useGraphQlClient } from "@/components/graphql/graphql-client/GraphqlClient";
import { graphqlErrorToast, successToast } from "@/components/toast/toast";

import { graphql } from "@/graphql/generated";

import { dossierDeValidationAapV2QueryKey } from "../dossierDeValidation.hook";

const getCandidacyByIdForDatePrevisionnellePage = graphql(`
  query getCandidacyForDatePrevisionnelleAapV2Page($candidacyId: ID!) {
    getCandidacyById(id: $candidacyId) {
      id
      readyForJuryEstimatedAt
    }
  }
`);

const updateReadyForJuryEstimatedAtMutation = graphql(`
  mutation setReadyForJuryEstimatedAtForDatePrevisionnelleAapV2Page(
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

const datePrevisionnelleAapV2QueryKey = (candidacyId: string) =>
  [candidacyId, "getCandidacyForDatePrevisionnelleAapV2"] as const;

export default function DatePrevisionnellePage() {
  const { graphqlClient } = useGraphQlClient();
  const queryClient = useQueryClient();

  const { candidacyId } = useParams<{
    candidacyId: string;
  }>();

  const { data, isLoading } = useQuery({
    queryKey: datePrevisionnelleAapV2QueryKey(candidacyId),
    queryFn: () =>
      graphqlClient.request(getCandidacyByIdForDatePrevisionnellePage, {
        candidacyId,
      }),
  });
  const [isDirty, setIsDirty] = useState(false);

  const [readyForJuryEstimatedAt, setReadyForJuryEstimatedAt] = useState(
    data?.getCandidacyById?.readyForJuryEstimatedAt,
  );

  const updateReadyForJuryEstimatedAt = useMutation({
    mutationFn: (data: { readyForJuryEstimatedAt: string }) =>
      graphqlClient.request(updateReadyForJuryEstimatedAtMutation, {
        readyForJuryEstimatedAt: data.readyForJuryEstimatedAt,
        candidacyId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: datePrevisionnelleAapV2QueryKey(candidacyId),
      });
      queryClient.invalidateQueries({
        queryKey: dossierDeValidationAapV2QueryKey(candidacyId),
      });
    },
  });

  const handleReadyForJuryEstimatedDateFormSubmit = async ({
    readyForJuryEstimatedAt,
  }: {
    readyForJuryEstimatedAt: string;
  }) => {
    try {
      await updateReadyForJuryEstimatedAt.mutateAsync({
        readyForJuryEstimatedAt,
      });
      successToast("La date prévisionnelle a été enregistrée");
      setIsDirty(false);
    } catch (error) {
      graphqlErrorToast(error);
    }
  };

  if (isLoading) {
    return <div>Chargement de la candidature...</div>;
  }

  return (
    <div className="flex flex-col">
      <Breadcrumb
        currentPageLabel="Date prévisionnelle de dépot du dossier de validation"
        className="mb-4"
        segments={[
          {
            label: "Aperçu de la candidature",
            linkProps: {
              href: `/candidacies/${candidacyId}/summary`,
            },
          },
          {
            label: "Dossier de validation",
            linkProps: {
              href: `/candidacies/${candidacyId}/dossier-de-validation-aap-v2`,
            },
          },
        ]}
      />
      <h1>Date prévisionnelle de dépôt du dossier de validation</h1>
      <p className="text-lg">
        Cette date est donnée à titre estimatif, elle est non engageante.
      </p>
      <form
        className="flex gap-6 flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          if (readyForJuryEstimatedAt) {
            handleReadyForJuryEstimatedDateFormSubmit({
              readyForJuryEstimatedAt,
            });
          }
        }}
      >
        <div className="flex flex-col gap-6">
          <Input
            label="Date prévisionelle (optionnelle)"
            data-testid="ready-for-jury-estimated-date-input"
            className="w-[282px] mb-0"
            nativeInputProps={{
              type: "date",
              min: new Date().toISOString().split("T")[0],
              max: "2100-01-01",
              defaultValue:
                data?.getCandidacyById?.readyForJuryEstimatedAt || undefined,
              onChange: (e) => {
                setReadyForJuryEstimatedAt(e.target.value);
                if (
                  data?.getCandidacyById?.readyForJuryEstimatedAt ===
                  e.target.value
                ) {
                  setIsDirty(false);
                } else {
                  setIsDirty(true);
                }
              },
            }}
          />
          <CallOut title="">
            Cette date est une estimation et permet au certificateur d'anticiper
            l'organisation du passage devant le jury.
          </CallOut>
        </div>
        <FormButtons
          formState={{
            isSubmitting: updateReadyForJuryEstimatedAt.isPending,
            isDirty,
          }}
          className="self-start justify-between w-full"
          backUrl={`/candidacies/${candidacyId}/dossier-de-validation-aap-v2`}
          hideResetButton
        />
      </form>
    </div>
  );
}
