"use client";

import { Breadcrumb } from "@codegouvfr/react-dsfr/Breadcrumb";
import Button from "@codegouvfr/react-dsfr/Button";
import { Checkbox } from "@codegouvfr/react-dsfr/Checkbox";
import Input from "@codegouvfr/react-dsfr/Input";
import { createModal } from "@codegouvfr/react-dsfr/Modal";
import RadioButtons from "@codegouvfr/react-dsfr/RadioButtons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { CertificationCardReadOnly } from "@/components/card/certification-card-read-only/CertificationCardReadOnly";
import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { Panel } from "@/components/layout/Panel";
import { FormOptionalFieldsDisclaimer } from "@/components/legacy/atoms/FormOptionalFieldsDisclaimer/FormOptionalFieldsDisclaimer";
import { graphqlErrorToast, successToast } from "@/components/toast/toast";
import { sanitizedOptionalText } from "@/utils/input-sanitization";

import { useCertificationPageLogic } from "./_components/certification.hook";

const modal = createModal({
  id: "how-to-choose-option",
  isOpenedByDefault: false,
});

const schema = z.object({
  option: sanitizedOptionalText(),
  firstForeignLanguage: sanitizedOptionalText(),
  secondForeignlanguage: sanitizedOptionalText(),
  completion: z.enum(["PARTIAL", "COMPLETE"], {
    invalid_type_error: "Merci de remplir ce champ",
  }),
  competenceBlocs: z
    .object({
      competenceBlocId: z.string(),
      label: z.string(),
      checked: z.boolean(),
    })
    .array(),
});

type FormData = z.infer<typeof schema>;

const CertificationPage = () => {
  const router = useRouter();

  const {
    candidacy,
    certification,
    dematerializedFeasibilityFile,
    updateFeasibilityCertification,
  } = useCertificationPageLogic();

  const defaultValues = useMemo(
    () => ({
      option: dematerializedFeasibilityFile?.option || "",
      firstForeignLanguage:
        dematerializedFeasibilityFile?.firstForeignLanguage || "",
      secondForeignlanguage:
        dematerializedFeasibilityFile?.secondForeignLanguage || "",
      completion:
        !dematerializedFeasibilityFile ||
        dematerializedFeasibilityFile?.blocsDeCompetences.length === 0
          ? undefined
          : candidacy?.isCertificationPartial
            ? ("PARTIAL" as const)
            : ("COMPLETE" as const),
      competenceBlocs: certification?.competenceBlocs?.map((bloc) => ({
        competenceBlocId: bloc.id,
        label: bloc.code ? `${bloc.code} - ${bloc.label}` : bloc.label,
        checked: dematerializedFeasibilityFile?.blocsDeCompetences.some(
          (bc) => bc.certificationCompetenceBloc.id === bloc.id,
        ),
      })),
    }),
    [
      candidacy?.isCertificationPartial,
      certification?.competenceBlocs,
      dematerializedFeasibilityFile,
    ],
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { isDirty, isSubmitting, errors },
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const completion = useWatch({ name: "completion", control });

  const competenceBlocFields = watch("competenceBlocs", []);

  const handleCertificationCompletionChange = useCallback(
    (completion: "PARTIAL" | "COMPLETE") => {
      switch (completion) {
        case "COMPLETE": {
          setValue(
            "competenceBlocs",
            competenceBlocFields.map((bloc) => ({ ...bloc, checked: true })),
          );
          break;
        }
      }
    },
    [competenceBlocFields, setValue],
  );

  const resetForm = useCallback(
    () => reset(defaultValues),
    [defaultValues, reset],
  );

  useEffect(resetForm, [resetForm]);

  const handleFormSubmit = handleSubmit(
    async (data) => {
      try {
        await updateFeasibilityCertification.mutateAsync({
          option: data.option,
          firstForeignLanguage: data.firstForeignLanguage,
          secondForeignLanguage: data.secondForeignlanguage,
          completion: data.completion,
          blocDeCompetencesIds: data.competenceBlocs
            .filter((bloc) => bloc.checked)
            .map((bloc) => bloc.competenceBlocId),
        });
        successToast("Modifications enregistrées");
        router.push("../");
      } catch (error) {
        graphqlErrorToast(error);
      }
    },
    (error) => {
      console.error(error);
    },
  );

  return (
    <Panel>
      <div className="flex flex-col">
        <Breadcrumb
          currentPageLabel="Certification visée"
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

        <h1 className="mb-0">Certification visée</h1>
        <FormOptionalFieldsDisclaimer />
        <p className="text-xl mb-10">
          Renseignez les informations sur la certification visée puis
          sélectionner les blocs de compétences.
        </p>

        {certification && (
          <form
            onSubmit={handleFormSubmit}
            onReset={(e) => {
              e.preventDefault();
              resetForm();
            }}
          >
            <div className="grid grid-cols-4">
              <div className="col-span-3">
                <CertificationCardReadOnly
                  certification={{
                    id: certification?.id || "",
                    codeRncp: certification?.codeRncp || "",
                    label: certification?.label || "",
                  }}
                />

                <div className="border border-dsfr-light-border-default p-4 my-8">
                  <p>
                    Pour la plupart des certifications, cette section n'est pas
                    à remplir : vous pouvez la laisser vide.{" "}
                    <strong>Vous avez un doute ?</strong> Consultez la fiche
                    certification ci-dessus.
                  </p>
                  <Input
                    label="Option ou parcours visé (optionnel)"
                    hintText={
                      <div>
                        <span>
                          Si la certification visée dispose de plusieurs options
                          ou parcours, précisez celui qui est choisi.
                        </span>
                        <Button
                          type="button"
                          className="underline p-0 m-0 mx-1 text-xs shadow-none min-h-0"
                          priority="secondary"
                          onClick={modal.open}
                        >
                          Voir plus de détails →
                        </Button>
                      </div>
                    }
                    nativeInputProps={{ ...register("option") }}
                    data-testid="certification-option-input"
                    state={errors.option ? "error" : "default"}
                    stateRelatedMessage={errors.option?.message}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      className="mb-0"
                      label="Langue vivante 1 (optionnel)"
                      hintText="Si la certification visée demande de parler une langue vivante."
                      nativeInputProps={{ ...register("firstForeignLanguage") }}
                      data-testid="certification-first-foreign-language-input"
                      state={errors.firstForeignLanguage ? "error" : "default"}
                      stateRelatedMessage={errors.firstForeignLanguage?.message}
                    />
                    <Input
                      className="mb-0"
                      label="Langue vivante 2 (optionnel)"
                      hintText="Si la certification visée demande de parler deux langues vivantes."
                      nativeInputProps={{
                        ...register("secondForeignlanguage"),
                      }}
                      data-testid="certification-second-foreign-language-input"
                      state={errors.secondForeignlanguage ? "error" : "default"}
                      stateRelatedMessage={
                        errors.secondForeignlanguage?.message
                      }
                    />
                  </div>
                </div>

                <RadioButtons
                  className="mb-6"
                  legend="Choisissez l’option qui correspond à ce qui est visé pour cette demande de recevabilité :"
                  small
                  options={[
                    {
                      label: "Certification visée dans sa totalité",
                      hintText: "Si toute la certification est visée",
                      nativeInputProps: {
                        value: "COMPLETE",
                        ...register("completion", {
                          onChange: (e) =>
                            handleCertificationCompletionChange(e.target.value),
                        }),
                      },
                    },
                    {
                      label: "Un ou plusieurs bloc(s) de compétences visé(s)",
                      hintText:
                        "Si l’obtention de la certification n’est pas visée dans sa totalité ou si des blocs de compétences ont déjà été validés.",
                      nativeInputProps: {
                        value: "PARTIAL",
                        ...register("completion", {
                          onChange: (e) =>
                            handleCertificationCompletionChange(e.target.value),
                        }),
                      },
                    },
                  ]}
                  state={errors.completion ? "error" : "default"}
                  stateRelatedMessage={errors.completion?.message}
                  data-testid="certification-completion-radio-buttons"
                />

                <hr className="pb-8" />

                <Checkbox
                  className="[&_label]:pb-1 [&_label]:py-3"
                  legend={
                    <span>
                      Choisissez le(s) bloc(s) de compétences visé(s) :{" "}
                    </span>
                  }
                  small
                  disabled={!completion}
                  options={competenceBlocFields.map((bloc, blocIndex) => ({
                    label: bloc.label,
                    nativeInputProps: {
                      key: bloc.competenceBlocId,
                      ...register(`competenceBlocs.${blocIndex}.checked`),
                    },
                  }))}
                  data-testid="competence-blocs-checkbox"
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
                        Référentiel France compétences
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
              backUrl="../"
              formState={{
                isDirty:
                  isDirty ||
                  !dematerializedFeasibilityFile?.certificationPartComplete,
                canSubmit: competenceBlocFields.every((bloc) => !bloc.checked)
                  ? false
                  : true,
                isSubmitting,
              }}
            />
          </form>
        )}

        <modal.Component
          title={
            <div>
              <span
                className="fr-icon-info-fill mr-2"
                aria-hidden="true"
              ></span>
              Plus de détails
            </div>
          }
          size="large"
        >
          <p>
            Il s'agit des parcours attachés aux certifications professionnelles
            relevant du ministère de l'enseignement supérieur et de la recherche
            (à l'exception des BTS) ainsi que du ministère de la culture. Cette
            rubrique n'est pas à renseigner pour les autres certificateurs.
          </p>

          <p>
            Le parcours de la certification identifie les compétences précises
            liées au diplôme délivré par l'établissement.
          </p>

          <p>Par exemple :</p>

          <p>
            <ul>
              <li>
                Master de droit public, parcours collectivités territoriales
                (université Paris I Panthéon-Sorbonne)
              </li>
              <li>
                Diplôme national d'art, mention céramique (école nationale
                supérieure d'art et de design de Limoges)
              </li>
            </ul>
          </p>
        </modal.Component>
      </div>
    </Panel>
  );
};

export default CertificationPage;
