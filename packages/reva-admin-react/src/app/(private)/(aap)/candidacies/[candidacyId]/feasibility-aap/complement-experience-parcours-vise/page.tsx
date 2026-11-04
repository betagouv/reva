"use client";
import Input from "@codegouvfr/react-dsfr/Input";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { FormOptionalFieldsDisclaimer } from "@/components/form-optional-fields-disclaimer/FormOptionalFieldsDisclaimer";
import { useGraphQlClient } from "@/components/graphql/graphql-client/GraphqlClient";
import { graphqlErrorToast, successToast } from "@/components/toast/toast";
import { sanitizedTextAllowSpecialCharacters } from "@/utils/input-sanitization";

import { graphql } from "@/graphql/generated";
const schema = z.object({
  complementExperienceParcoursVise: sanitizedTextAllowSpecialCharacters({
    minLength: 0,
    maxLength: 10000,
  }),
});

type FormData = z.infer<typeof schema>;

const getComplementExperienceParcoursViseQuery = graphql(`
  query getDematerializedFeasibilityFileForComplementExperienceParcoursVisePage(
    $candidacyId: ID!
  ) {
    feasibility_getActiveFeasibilityByCandidacyId(candidacyId: $candidacyId) {
      dematerializedFeasibilityFile {
        id
        complementExperienceParcoursVise
      }
    }
  }
`);

const updateComplementExperienceParcoursViseMutation = graphql(`
  mutation updateComplementExperienceParcoursViseForComplementExperienceParcoursVisePage(
    $candidacyId: ID!
    $complementExperienceParcoursVise: String!
  ) {
    dematerialized_feasibility_file_createOrUpdateComplementExperienceParcoursVise(
      candidacyId: $candidacyId
      input: {
        complementExperienceParcoursVise: $complementExperienceParcoursVise
      }
    ) {
      id
      complementExperienceParcoursVise
    }
  }
`);

const ComplementExperienceParcoursVisePage = () => {
  const { candidacyId } = useParams<{
    candidacyId: string;
  }>();
  const { graphqlClient } = useGraphQlClient();
  const router = useRouter();
  const feasibilitySummaryUrl = `/candidacies/${candidacyId}/feasibility-aap`;

  const updateComplementExperienceParcoursVise = useMutation({
    mutationKey: [
      candidacyId,
      "updateComplementExperienceParcoursViseForComplementExperienceParcoursVisePage",
    ],
    mutationFn: (data: FormData) =>
      graphqlClient.request(updateComplementExperienceParcoursViseMutation, {
        candidacyId,
        complementExperienceParcoursVise: data.complementExperienceParcoursVise,
      }),
  });
  const {
    data: getComplementExperienceParcoursViseResponse,
    status: getComplementExperienceParcoursViseStatus,
  } = useQuery({
    queryKey: [
      candidacyId,
      "getComplementExperienceParcoursViseForComplementExperienceParcoursVisePage",
    ],
    queryFn: () =>
      graphqlClient.request(getComplementExperienceParcoursViseQuery, {
        candidacyId,
      }),
  });

  const defaultValues = useMemo(
    () => ({
      complementExperienceParcoursVise:
        getComplementExperienceParcoursViseResponse
          ?.feasibility_getActiveFeasibilityByCandidacyId
          ?.dematerializedFeasibilityFile?.complementExperienceParcoursVise ||
        "",
    }),
    [getComplementExperienceParcoursViseResponse],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<FormData>({
    resolver: standardSchemaResolver(schema),
    defaultValues,
  });

  const resetForm = useCallback(
    () => reset(defaultValues),
    [defaultValues, reset],
  );

  useEffect(resetForm, [resetForm]);

  const handleFormSubmit = handleSubmit(async (data) => {
    try {
      await updateComplementExperienceParcoursVise.mutateAsync(data);
      successToast("Modifications enregistrées");
      router.push(feasibilitySummaryUrl);
    } catch (e) {
      graphqlErrorToast(e);
    }
  });

  return (
    <div className="flex flex-col">
      <h1>Blocs de compétences</h1>
      <FormOptionalFieldsDisclaimer />
      <p className="text-xl">
        Pour chaque bloc, décrivez les activités réalisées et le contexte dans
        lequel elles ont été exercées. Si la certification comporte un parcours
        spécifique, précisez les activités liées à celui-ci.
      </p>
      {getComplementExperienceParcoursViseStatus === "success" && (
        <form
          onSubmit={handleFormSubmit}
          onReset={(e) => {
            e.preventDefault();
            resetForm();
          }}
        >
          <Input
            textArea
            label="Complément d’expérience lié au parcours visé (optionnel)"
            hintText="Apportez toutes informations complémentaires liées aux activités réalisées, spécifiques au parcours visé. Pour en savoir plus sur le parcours, consultez le site du certificateur."
            nativeTextAreaProps={{
              ...register("complementExperienceParcoursVise"),
              rows: 8,
            }}
            stateRelatedMessage={
              errors?.complementExperienceParcoursVise?.message
            }
            state={
              errors?.complementExperienceParcoursVise ? "error" : "default"
            }
            data-testid="block-comment-input"
          />
          <FormButtons
            hideResetButton
            backUrl={`/candidacies/${candidacyId}/feasibility-aap`}
            formState={{
              isSubmitting,
            }}
          />
        </form>
      )}
    </div>
  );
};

export default ComplementExperienceParcoursVisePage;
