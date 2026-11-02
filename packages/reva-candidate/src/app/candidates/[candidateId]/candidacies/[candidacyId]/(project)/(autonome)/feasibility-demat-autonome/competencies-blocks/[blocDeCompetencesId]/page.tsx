"use client";
import { Alert } from "@codegouvfr/react-dsfr/Alert";
import Breadcrumb from "@codegouvfr/react-dsfr/Breadcrumb";
import { Button } from "@codegouvfr/react-dsfr/Button";
import Input from "@codegouvfr/react-dsfr/Input";
import { createModal } from "@codegouvfr/react-dsfr/Modal";
import RadioButtons from "@codegouvfr/react-dsfr/RadioButtons";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  CertificationCompetenceBlocInput,
  CompetenceDetails,
} from "@/graphql/generated/graphql";

const modal = createModal({
  id: "how-to-write-competence-block-comment",
  isOpenedByDefault: false,
});

const schema = z.object({
  competences: z
    .object({
      competenceId: z.string(),
      label: z.string(),
      state: z.enum(["YES", "NO", "PARTIALLY"], {
        invalid_type_error: "Merci de choisir une option",
      }),
    })
    .array(),
  blocText: sanitizedTextAllowSpecialCharacters({
    minLength: 100,
    maxLength: 10000,
  }),
});

type FormData = z.infer<typeof schema>;

const getBlocDeCompetencesQuery = graphql(`
  query getBlocDeCompetencesForCompetenciesBlockPage(
    $candidacyId: ID!
    $blocDeCompetencesId: ID!
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
        certificationCompetenceDetails {
          state
          certificationCompetence {
            id
          }
        }
        blocsDeCompetences(blocDeCompetencesId: $blocDeCompetencesId) {
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
      }
    }
  }
`);

const createOrUpdateCompetenceDetailsMutation = graphql(`
  mutation createOrUpdateCompetenceDetailsMutation(
    $input: DematerializedFeasibilityFileCreateOrUpdateCertificationCompetenceDetailsInput!
    $candidacyId: ID!
  ) {
    dematerialized_feasibility_file_createOrUpdateCertificationCompetenceDetails(
      candidacyId: $candidacyId
      input: $input
    ) {
      id
    }
  }
`);

const CompetenciesBlockPage = () => {
  const { candidacyId, blocDeCompetencesId } = useParams<{
    candidacyId: string;
    blocDeCompetencesId: string;
  }>();
  const { graphqlClient } = useGraphQlClient();
  const router = useRouter();

  const { data: getBlocDeCompetencesResponse } = useQuery({
    queryKey: [candidacyId, "getBlocDeCompetencesForCompetenciesBlockPage"],
    queryFn: () =>
      graphqlClient.request(getBlocDeCompetencesQuery, {
        candidacyId,
        blocDeCompetencesId,
      }),
  });

  const createOrUpdateCompetenceDetails = useMutation({
    mutationFn: (input: {
      dematerializedFeasibilityFileId: string;
      competenceBloc: CertificationCompetenceBlocInput;
      competenceDetails: CompetenceDetails[];
    }) =>
      graphqlClient.request(createOrUpdateCompetenceDetailsMutation, {
        candidacyId,
        input,
      }),
  });

  const dematerializedFile =
    getBlocDeCompetencesResponse?.feasibility_getActiveFeasibilityByCandidacyId
      ?.dematerializedFeasibilityFile;

  const block =
    dematerializedFile?.blocsDeCompetences?.[0]?.certificationCompetenceBloc;

  const competencesFromBlock = block?.competences;
  const defaultBlocText = dematerializedFile?.blocsDeCompetences?.[0]?.text;

  const candidacy =
    getBlocDeCompetencesResponse?.feasibility_getActiveFeasibilityByCandidacyId
      ?.candidacy;
  const candidate = candidacy?.candidate;
  const certification = candidacy?.certification;

  const defaultValues = useMemo(
    () => ({
      competences: competencesFromBlock?.map((c) => ({
        competenceId: c.id,
        label: c.label,
        state: dematerializedFile?.certificationCompetenceDetails.find(
          (ccd) => ccd.certificationCompetence.id === c.id,
        )?.state,
      })),
      blocText: defaultBlocText || "",
    }),
    [
      competencesFromBlock,
      dematerializedFile?.certificationCompetenceDetails,
      defaultBlocText,
    ],
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting, isDirty, errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const competencesFields = watch("competences");
  const blocText = watch("blocText");

  const resetForm = useCallback(
    () => reset(defaultValues),
    [defaultValues, reset],
  );

  useEffect(resetForm, [resetForm]);

  const handleFormSubmit = handleSubmit(async (data) => {
    const competenceDetails = data.competences.map((c) => ({
      competenceId: c.competenceId,
      state: c.state,
    }));
    try {
      await createOrUpdateCompetenceDetails.mutateAsync({
        dematerializedFeasibilityFileId: dematerializedFile?.id || "",
        competenceBloc: {
          id: blocDeCompetencesId,
          text: data.blocText,
        },
        competenceDetails,
      });
      successToast("Modifications enregistrées");
      router.push("../../");
    } catch (e) {
      graphqlErrorToast(e);
    }
  });

  return (
    <Panel>
      <div className="flex flex-col">
        <Breadcrumb
          currentPageLabel={`Blocs de compétences - ${block?.code}`}
          className="mb-2"
          segments={[
            {
              label: "Ma candidature",
              linkProps: {
                href: "../../../",
              },
            },
            {
              label: "Dossier de faisabilité",
              linkProps: {
                href: "../../",
              },
            },
          ]}
        />

        <h1 className="mb-0">Blocs de compétences</h1>
        <FormOptionalFieldsDisclaimer />
        <p className="text-xl mb-12">
          Pour chaque bloc, décrivez les activités réalisées et le contexte dans
          lequel elles ont été exercées. Si la certification comporte un
          parcours spécifique, précisez les activités liées à celui-ci.
        </p>
        {block && (
          <>
            <form
              onSubmit={handleFormSubmit}
              onReset={(e) => {
                e.preventDefault();
                resetForm();
              }}
            >
              <div className="grid grid-cols-4">
                <div className="col-span-3">
                  <h2 className="mb-0">{block.code}</h2>
                  <p className="text-xl font-bold mb-8">{block.label}</p>
                  <hr className="pb-8" />
                  {competencesFields?.map((c, i) => (
                    <div key={c.competenceId}>
                      <p className="text-m mb-4">{c.label}</p>
                      <RadioButtons
                        small
                        stateRelatedMessage={
                          errors?.competences?.[i]?.state?.message
                        }
                        state={
                          errors?.competences?.[i]?.state ? "error" : "default"
                        }
                        orientation="horizontal"
                        className="[&_label]:py-2"
                        options={[
                          {
                            label: "Oui",
                            nativeInputProps: {
                              value: "YES",
                              checked: c.state == "YES",
                              ...register(`competences.${i}.state`),
                            },
                          },
                          {
                            label: "Non",
                            nativeInputProps: {
                              value: "NO",
                              checked: c.state == "NO",
                              ...register(`competences.${i}.state`),
                            },
                          },
                          {
                            label: "Partiellement",
                            nativeInputProps: {
                              value: "PARTIALLY",
                              checked: c.state == "PARTIALLY",
                              ...register(`competences.${i}.state`),
                            },
                          },
                        ]}
                      />
                    </div>
                  ))}
                  <div className="mb-4 flex flex-col">
                    <Input
                      className="m-0"
                      textArea
                      label="Commentaire sur le bloc"
                      hintText={
                        <span>
                          Décrivez les activités réalisées pour maîtriser les
                          compétences listées ci-dessus. Expliquer également le
                          contexte professionnel dans lequel ces compétences ont
                          été développées.{" "}
                          <strong>
                            Donner des exemples concrets qui illustrent chacune
                            des activités.
                          </strong>
                          <Button
                            type="button"
                            className="underline p-0 m-0 mx-1 text-xs shadow-none min-h-0"
                            priority="secondary"
                            onClick={modal.open}
                          >
                            Voir plus de détails →
                          </Button>
                        </span>
                      }
                      nativeTextAreaProps={{
                        ...register("blocText"),
                      }}
                      stateRelatedMessage={errors?.blocText?.message}
                      state={errors?.blocText ? "error" : "default"}
                      data-testid="block-comment-input"
                    />
                    <p className="m-0 mt-1 self-end text-xs text-dsfr-light-text-mention-grey-500">
                      {blocText?.length}/100 caractères minimum
                    </p>
                  </div>

                  <Alert
                    severity="info"
                    description="Si cette partie n’est pas assez détaillée, le certificateur pourra vous demander de compléter le dossier, ou prononcer un avis défavorable."
                    small
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
                backUrl="../../"
                formState={{
                  isDirty,
                  isSubmitting,
                }}
              />
            </form>
          </>
        )}

        <modal.Component
          title={
            <div>
              <span
                className="fr-icon-info-fill mr-2"
                aria-hidden="true"
              ></span>
              Quelles informations renseigner ?
            </div>
          }
          size="large"
        >
          <p>
            Cette partie permet au certificateur de mieux comprendre les
            expériences en lien avec ce bloc de compétences.
          </p>

          <p>
            <ul>
              <li>
                Précisez s’il s’agit d’un travail en équipe ou seul, et quelle
                était la place occupée dans l’organisation (poste,
                responsabilités).
              </li>
              <li>
                Décrivez le lieu de ce poste. Par exemple : en crèche, à
                domicile, en entreprise, etc… Indiquez aussi le nom de la
                structure, la ville.
              </li>
              <li>
                Donnez des exemples précis de ce qui a été réalisé : projets,
                missions, tâches importantes.
              </li>
            </ul>
          </p>

          <p>Par exemple :</p>

          <p>
            <ul>
              <li>
                pour une activité de gestion des stocks : comment a-t’elle été
                organisée, quels outils ont été utilisés, quelles interactions
                ont eu lieu avec les autres collègues, etc...
              </li>
              <li>
                pour une activité d’entretien des locaux : quel type de locaux
                et de surfaces étaient concernés, quel type de matériel et de
                produits ont été utilisés, etc...
              </li>
              <li>
                pour une activité d’accueil du public : dans quel lieu de
                travail, quelles étaient les intéractions avec le public, une
                langue étrangère était-elle utilisée, etc...
              </li>
            </ul>
          </p>
        </modal.Component>
      </div>
    </Panel>
  );
};

export default CompetenciesBlockPage;
