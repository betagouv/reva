"use client";

import Breadcrumb from "@codegouvfr/react-dsfr/Breadcrumb";
import { Button } from "@codegouvfr/react-dsfr/Button";
import { Input } from "@codegouvfr/react-dsfr/Input";
import { createModal } from "@codegouvfr/react-dsfr/Modal";
import { Select } from "@codegouvfr/react-dsfr/Select";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO, toDate } from "date-fns";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { Panel } from "@/components/layout/Panel";
import { FormOptionalFieldsDisclaimer } from "@/components/legacy/atoms/FormOptionalFieldsDisclaimer/FormOptionalFieldsDisclaimer";
import { graphqlErrorToast } from "@/components/toast/toast";
import { ExperienceDuration } from "@/constants/experience-duration.constant";
import {
  sanitizedText,
  sanitizedTextAllowSpecialCharacters,
} from "@/utils/input-sanitization";

import { useUpdateExperience } from "./update-experience.hooks";

const durationOptions: { label: string; value: ExperienceDuration }[] = [
  { label: "Moins d'un an", value: ExperienceDuration.lessThanOneYear },
  {
    label: "Entre 1 et 3 ans",
    value: ExperienceDuration.betweenOneAndThreeYears,
  },
  { label: "Plus de 3 ans", value: ExperienceDuration.moreThanThreeYears },
  { label: "Plus de 5 ans", value: ExperienceDuration.moreThanFiveYears },
  { label: "Plus de 10 ans", value: ExperienceDuration.moreThanTenYears },
];

const schema = z.object({
  title: sanitizedText(),
  startedAt: sanitizedText(),
  duration: z.nativeEnum(ExperienceDuration, {
    errorMap: () => ({ message: "Ce champ est obligatoire" }),
  }),
  description: sanitizedTextAllowSpecialCharacters(),
});

type ExperienceForm = z.infer<typeof schema>;

const deleteConfirmationModal = createModal({
  id: "delete-experience-confirmation-modal",
  isOpenedByDefault: false,
});

export default function UpdateExperience() {
  const router = useRouter();
  const params = useParams<{ experienceId: string }>();

  const { experienceId } = params;

  const { updateExperience, deleteExperience, canEditCandidacy, candidacy } =
    useUpdateExperience();
  const backUrl = "../";
  const inputShouldBeDisabled = !canEditCandidacy;

  const experience = candidacy?.experiences.find(
    (experience) => experience.id == experienceId,
  );

  const defaultValues = useMemo(
    () => ({
      title: experience?.title || "",
      startedAt: experience?.startedAt
        ? format(toDate(experience.startedAt), "yyyy-MM-dd")
        : format(toDate("2020-01-31"), "yyyy-MM-dd"),
      duration: experience?.duration as ExperienceDuration,
      description: experience?.description || "",
    }),
    [experience],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<ExperienceForm>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const resetForm = useCallback(
    () => reset(defaultValues),
    [reset, defaultValues],
  );

  useEffect(resetForm, [resetForm]);

  const onSubmit = async (data: ExperienceForm) => {
    if (!candidacy?.id) {
      return;
    }
    try {
      await updateExperience.mutateAsync({
        candidacyId: candidacy.id,
        experienceId,
        experience: {
          title: data.title,
          startedAt: parseISO(data.startedAt).getTime(),
          duration: data.duration,
          description: data.description || "",
        },
      });
      router.push(backUrl);
    } catch (error) {
      graphqlErrorToast(error);
    }
  };

  const handleDelete = async () => {
    if (!candidacy?.id) {
      return;
    }
    try {
      await deleteExperience.mutateAsync({
        candidacyId: candidacy.id,
        experienceId,
      });
      router.push(backUrl);
    } catch (error) {
      graphqlErrorToast(error);
    }
  };

  return (
    <Panel>
      <Breadcrumb
        currentPageLabel="Modifier une expérience"
        className="mb-0"
        segments={[
          {
            label: "Ma candidature",
            linkProps: {
              href: "../../",
            },
          },
          {
            label: "Mes expériences",
            linkProps: {
              href: "../",
            },
          },
        ]}
      />
      <h1 className="mt-2 mb-0">Modifier une expérience</h1>
      <FormOptionalFieldsDisclaimer
        className="mb-6"
        label="Sauf mention contraire “optionnel” dans le label, tous les champs sont obligatoires."
      />

      <p className="text-xl mb-12">
        Ces informations seront envoyées au certificateur avec le dossier de
        faisabilité. Il est donc important d'être très précis : décrivez les
        tâches réalisées et le contexte de travail (lieu, équipe, outils
        utilisés…).
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        onReset={(e) => {
          e.preventDefault();
          resetForm();
        }}
        className="flex flex-col"
      >
        <div className="grid grid-cols-4 gap-6">
          <div className="col-span-3 flex flex-col">
            <fieldset>
              <Input
                label="Intitulé du poste ou de l'activité"
                hintText="Exemple : Agent d'entretien, service à domicile, commercial, etc."
                nativeInputProps={register("title")}
                state={errors.title ? "error" : "default"}
                stateRelatedMessage={errors.title?.message}
                disabled={inputShouldBeDisabled}
              />
              <div className="flex gap-6">
                <Input
                  label="Date de début"
                  nativeInputProps={{
                    type: "date",
                    ...register("startedAt"),
                  }}
                  state={errors.startedAt ? "error" : "default"}
                  stateRelatedMessage={errors.startedAt?.message}
                  disabled={inputShouldBeDisabled}
                />

                <Select
                  label="Durée"
                  nativeSelectProps={register("duration")}
                  state={errors.duration ? "error" : "default"}
                  stateRelatedMessage={errors.duration?.message}
                  disabled={inputShouldBeDisabled}
                >
                  <option value="" disabled hidden>
                    Sélectionner une option
                  </option>
                  {durationOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>

              <Input
                textArea
                label="Description du poste ou de l’activité extra-professionnelle"
                hintText={
                  <span>
                    Décrivez précisément les activités réalisées (par exemple :
                    gestion des stocks, entretien des locaux, accueil du public,
                    etc). <br />
                    Décrivez aussi l’environnement de travail : type
                    d’entreprise ou de structure, travail seul ou en équipe,
                    niveau d’autonomie.
                  </span>
                }
                nativeTextAreaProps={{
                  rows: 3,
                  ...register("description"),
                }}
                state={errors.description ? "error" : "default"}
                stateRelatedMessage={errors.description?.message}
                disabled={inputShouldBeDisabled}
              />
            </fieldset>
          </div>

          <div className="col-span-1">
            <div className="mb-6 flex flex-col px-4 pb-2 pt-6 bg-dsfr-light-decisions-background-background-alt-blue-france">
              <h6>Ressources :</h6>

              <div>
                <p className="font-medium mb-2">Besoin d'aide ?</p>
                <p className="mb-1">
                  Consultez la partie "Résumé de la certification" sur la fiche
                  de la certification :<br />
                  <a
                    className="fr-link"
                    href={`https://www.francecompetences.fr/recherche/rncp/${candidacy?.certification?.codeRncp}`}
                    target="_blank"
                  >
                    www.francecompetences.fr
                  </a>
                </p>

                <p>Vous y trouverez les activités liées à la certification.</p>

                <hr />
                <p>
                  <a
                    className="fr-link"
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
        <hr className="mt-4 pb-4" />

        {canEditCandidacy && (
          <Button
            priority="tertiary no outline"
            size="small"
            iconId="fr-icon-delete-line"
            onClick={() => deleteConfirmationModal.open()}
            disabled={deleteExperience.isPending}
            nativeButtonProps={{
              type: "button",
            }}
          >
            Supprimer cette expérience
          </Button>
        )}

        <FormButtons
          hideResetButton
          backUrl={backUrl}
          formState={{
            isSubmitting,
            canSubmit: canEditCandidacy,
          }}
        />
      </form>

      <deleteConfirmationModal.Component
        title={
          <span className="ml-2">Voulez-vous supprimer cette expérience ?</span>
        }
        iconId="fr-icon-warning-fill"
        buttons={[
          {
            priority: "secondary",
            children: "Annuler",
            nativeButtonProps: {
              "aria-label": "Annuler la suppression",
            },
          },
          {
            priority: "primary",
            onClick: handleDelete,
            children: "Supprimer",
            disabled: deleteExperience.isPending,
            doClosesModal: false,
            nativeButtonProps: {
              "aria-label": "Confirmer la suppression de l'expérience",
            },
          },
        ]}
      >
        <p>
          Attention, cette action est irréversible. Une fois supprimée, vous ne
          pourrez pas revenir en arrière.
        </p>
      </deleteConfirmationModal.Component>
    </Panel>
  );
}
