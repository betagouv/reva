import { Breadcrumb } from "@codegouvfr/react-dsfr/Breadcrumb";
import Button from "@codegouvfr/react-dsfr/Button";
import { Input } from "@codegouvfr/react-dsfr/Input";
import { createModal } from "@codegouvfr/react-dsfr/Modal";
import { Select } from "@codegouvfr/react-dsfr/Select";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useParams } from "next/navigation";
import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { FormOptionalFieldsDisclaimer } from "@/components/form-optional-fields-disclaimer/FormOptionalFieldsDisclaimer";
import {
  sanitizedText,
  sanitizedTextAllowSpecialCharacters,
} from "@/utils/input-sanitization";

const modal = createModal({
  id: "confirm-delete-experience",
  isOpenedByDefault: false,
});

const durationValues = [
  "unknown",
  "lessThanOneYear",
  "betweenOneAndThreeYears",
  "moreThanThreeYears",
  "moreThanFiveYears",
  "moreThanTenYears",
] as const;

type Duration = (typeof durationValues)[number];

const durationToString: {
  [key in Duration]: string;
} = {
  unknown: "Sélectionner une durée",
  lessThanOneYear: "Moins d'un an",
  betweenOneAndThreeYears: "Entre 1 et 3 ans",
  moreThanThreeYears: "Plus de 3 ans",
  moreThanFiveYears: "Plus de 5 ans",
  moreThanTenYears: "Plus de 10 ans",
};

const schema = z
  .object({
    title: sanitizedText(),
    description: sanitizedTextAllowSpecialCharacters(),
    startedAt: sanitizedText(),
    duration: z.enum(durationValues),
  })
  .superRefine((data, ctx) => {
    if (data.startedAt > new Date().toISOString()) {
      ctx.addIssue({
        code: "custom",
        path: ["startedAt"],
        message: "La date de début ne peut pas se situer dans le futur.",
      });
    }

    if (data.duration === "unknown") {
      ctx.addIssue({
        code: "custom",
        path: ["duration"],
        message: "Ce champ est obligatoire",
      });
    }
  });

export type CandidateExperienceFormData = z.infer<typeof schema>;

export const CandidateExperienceForm = ({
  onSubmit,
  onDelete,
  editedExperience,
  disabled = false,
  candidate,
}: {
  onSubmit(data: CandidateExperienceFormData): Promise<void>;
  onDelete?: () => Promise<void>;
  editedExperience?: CandidateExperienceFormData;
  disabled?: boolean;
  candidate?: {
    firstname: string;
    lastname: string;
    givenName?: string | null;
  };
}) => {
  const { candidacyId } = useParams<{
    candidacyId: string;
  }>();

  const methods = useForm<CandidateExperienceFormData>({
    resolver: standardSchemaResolver(schema),
    defaultValues: {
      ...editedExperience,
      duration: editedExperience?.duration || "unknown",
    },
  });

  const {
    register,
    formState: { errors, isDirty, isSubmitting },
    handleSubmit,
    reset,
  } = methods;

  const resetForm = useCallback(() => {
    if (editedExperience) {
      reset(editedExperience);
    } else {
      reset({
        title: "",
        description: "",
        startedAt: undefined,
        duration: "unknown",
      });
    }
  }, [editedExperience, reset]);

  useEffect(() => {
    if (!isDirty) {
      resetForm();
    }
  }, [isDirty, resetForm]);

  const handleFormSubmit = handleSubmit(onSubmit);
  return (
    <div className="flex flex-col">
      <Breadcrumb
        className="mb-4"
        currentPageLabel="Nouvelle expérience"
        segments={[
          {
            label: (
              <span>
                {candidate?.givenName
                  ? candidate.givenName
                  : candidate?.lastname}{" "}
                {candidate?.firstname}
              </span>
            ),
            linkProps: { href: "../" },
          },
        ]}
      />
      <h1>Nouvelle expérience</h1>
      <FormOptionalFieldsDisclaimer />
      <p className="text-xl mb-12">
        Ces informations seront envoyées au certificateur avec le dossier de
        faisabilité. Il est donc important d'être très précis : décrivez les
        tâches réalisées et le contexte de travail (lieu, équipe, outils
        utilisés…).
      </p>
      <form
        onReset={(e) => {
          e.preventDefault();
          resetForm();
        }}
        onSubmit={handleFormSubmit}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-6">
          <Input
            className="col-span-2"
            label="Intitulé du poste ou de l’activité"
            hintText="Exemple : Agent d'entretien, service à domicile, commercial, etc."
            nativeInputProps={{ ...register("title") }}
            state={errors.title ? "error" : "default"}
            stateRelatedMessage={errors.title?.message}
            disabled={disabled}
          />
          <Input
            label="Date de début"
            nativeInputProps={{
              type: "date",
              max: new Date().toISOString().split("T")[0],
              ...register("startedAt"),
            }}
            state={errors.startedAt ? "error" : "default"}
            stateRelatedMessage={errors.startedAt?.message}
            disabled={disabled}
          />
          <Select
            label="Durée"
            nativeSelectProps={{
              ...register("duration"),
            }}
            state={errors.duration ? "error" : "default"}
            stateRelatedMessage={errors.duration?.message}
            disabled={disabled}
          >
            {durationValues.map((d) => (
              <option disabled={d === "unknown"} key={d} value={d}>
                {durationToString[d]}
              </option>
            ))}
          </Select>
          <Input
            className="col-span-2"
            classes={{ nativeInputOrTextArea: "min-h-[100px]" }}
            textArea
            label="Description du poste ou de l’activité extra-professionnelle"
            hintText={
              <span>
                Décrivez précisément les activités réalisées (par exemple :
                gestion des stocks, entretien des locaux, accueil du public,
                etc). <br />
                Décrivez aussi l’environnement de travail : type d’entreprise ou
                de structure, travail seul ou en équipe, niveau d’autonomie.
              </span>
            }
            nativeTextAreaProps={{ ...register("description") }}
            state={errors.description ? "error" : "default"}
            stateRelatedMessage={errors.description?.message}
            disabled={disabled}
          />
        </div>

        {onDelete && (
          <div className="mt-4 border-t border-gray-200 pt-4">
            <Button
              data-testid="delete-experience-button"
              type="button"
              onClick={modal.open}
              priority="tertiary no outline"
              iconId="fr-icon-delete-line"
              className="col-span-full"
            >
              Supprimer cette expérience
            </Button>
          </div>
        )}
        <FormButtons
          hideResetButton
          backUrl={`/candidacies/${candidacyId}/summary`}
          formState={{ isSubmitting }}
          disabled={disabled}
        />
      </form>

      <modal.Component
        title={
          <span className="ml-2">Voulez-vous supprimer cette expérience ?</span>
        }
        iconId="fr-icon-warning-fill"
        buttons={[
          {
            priority: "secondary",
            children: "Annuler",
          },
          {
            priority: "primary",
            children: "Supprimer",
            onClick: onDelete,
          },
        ]}
      >
        <p>
          Attention, cette action est irréversible. Une fois supprimée, vous ne
          pourrez pas revenir en arrière.
        </p>
      </modal.Component>
    </div>
  );
};
