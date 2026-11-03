"use client";
import Breadcrumb from "@codegouvfr/react-dsfr/Breadcrumb";
import Input from "@codegouvfr/react-dsfr/Input";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { useGraphQlClient } from "@/components/graphql/graphql-client/GraphqlClient";
import { Panel } from "@/components/layout/Panel";
import { FormOptionalFieldsDisclaimer } from "@/components/legacy/atoms/FormOptionalFieldsDisclaimer/FormOptionalFieldsDisclaimer";
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
      candidacy {
        id
        candidate {
          id
        }
        certification {
          id
          codeRncp
        }
      }
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

  const candidacy =
    getComplementExperienceParcoursViseResponse
      ?.feasibility_getActiveFeasibilityByCandidacyId?.candidacy;
  const candidate = candidacy?.candidate;
  const certification = candidacy?.certification;

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
      router.push("../");
    } catch (e) {
      graphqlErrorToast(e);
    }
  });

  return (
    <Panel>
      <div className="flex flex-col">
        <Breadcrumb
          currentPageLabel={`Blocs de compétences`}
          className="mb-2"
          segments={[
            {
              label: "Ma candidature",
              linkProps: {
                href: "../../",
              },
            },
            {
              label: "Dossier de faisabilité",
              linkProps: {
                href: "../",
              },
            },
          ]}
        />

        <h1 className="mb-0">Blocs de compétences</h1>
        <FormOptionalFieldsDisclaimer />
        <p className="text-xl">
          Pour chaque bloc, décrivez les activités réalisées et le contexte dans
          lequel elles ont été exercées. Si la certification comporte un
          parcours spécifique, précisez les activités liées à celui-ci.
        </p>
        {getComplementExperienceParcoursViseStatus === "success" && (
          <form
            onSubmit={handleFormSubmit}
            onReset={(e) => {
              e.preventDefault();
              resetForm();
            }}
          >
            <div className="grid grid-cols-4">
              <div className="col-span-3">
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
                    errors?.complementExperienceParcoursVise
                      ? "error"
                      : "default"
                  }
                  data-testid="block-comment-input"
                />
              </div>

              <div className="col-span-1 ml-6">
                <div className="flex flex-col px-4 pb-2 pt-6 bg-dsfr-light-decisions-background-background-alt-blue-france">
                  <h6>Ressources :</h6>

                  <div>
                    <p className="font-medium mb-4">Besoin d'aide ?</p>

                    <p>
                      <a
                        className="fr-link text-sm"
                        href={`https://www.francecompetences.fr/recherche/rncp/${certification?.codeRncp}`}
                        target="_blank"
                      >
                        Lien vers le référentiel d’activité
                      </a>
                    </p>

                    <p>
                      <a
                        className="fr-link text-sm"
                        href={`${window.location.origin}/candidat/candidates/${candidate?.id}/candidacies/${candidacy?.id}/certification/${certification?.id}`}
                        target="_blank"
                      >
                        Fiche de la certification
                      </a>
                    </p>

                    <hr />
                    <p>
                      <a
                        className="fr-link text-sm"
                        href="https://scribehow.com/viewer/Tutoriel__Candidat_sans_accompagnement_autonome__0NQyq175SDaI0Epy7bdyLA?referrer=documents&mode=edit"
                        target="_blank"
                      >
                        Consultez le guide pas à pas
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <FormButtons
              hideResetButton
              backUrl={`../`}
              formState={{
                isSubmitting,
              }}
            />
          </form>
        )}
      </div>
    </Panel>
  );
};

export default ComplementExperienceParcoursVisePage;
