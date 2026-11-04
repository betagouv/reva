import { Button } from "@codegouvfr/react-dsfr/Button";
import { Input } from "@codegouvfr/react-dsfr/Input";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { SortableList } from "@/components/sortable-list";
import { sanitizedTextAllowSpecialCharacters } from "@/utils/input-sanitization";

const competenceBlocFormSchema = z.object({
  label: sanitizedTextAllowSpecialCharacters(),
  competences: z
    .object({
      id: z.string().optional(),
      label: sanitizedTextAllowSpecialCharacters(),
      index: z.number(),
    })
    .array(),
});

export type CompetenceBlocFormData = z.infer<typeof competenceBlocFormSchema>;

export const CompetenceBlocForm = ({
  onSubmit,
  defaultValues,
  backUrl,
  className = "",
  onDeleteCompetenceBlocButtonClick,
}: {
  onSubmit(data: CompetenceBlocFormData): Promise<void>;
  defaultValues?: Partial<CompetenceBlocFormData>;
  backUrl: string;
  className?: string;
  onDeleteCompetenceBlocButtonClick?: () => void;
}) => {
  const methods = useForm<CompetenceBlocFormData>({
    resolver: standardSchemaResolver(competenceBlocFormSchema),
    defaultValues,
  });

  const {
    register,
    control,
    reset,
    handleSubmit,
    formState: { isDirty, isSubmitting, errors },
  } = methods;

  const {
    fields: competencesFields,
    append: appendCompetence,
    remove: removeCompetence,
    move: moveCompetences,
  } = useFieldArray({
    control,
    name: "competences",
  });

  const handleFormSubmit = handleSubmit(
    (d: CompetenceBlocFormData) => {
      //Re index the competences since they could have been moved in the form
      const reIndexCompetences = d.competences.map((c, index) => ({
        ...c,
        index,
      }));
      onSubmit({ ...d, competences: reIndexCompetences });
    },
    (e) => console.log(e),
  );
  return (
    <form
      onSubmit={handleFormSubmit}
      className={`flex flex-col ${className}`}
      onReset={(e) => {
        e.preventDefault();
        reset();
      }}
    >
      <Input
        data-testid="competence-bloc-label-input"
        label="Intitulé du bloc de compétences"
        state={errors.label ? "error" : "default"}
        stateRelatedMessage={errors.label?.message?.toString()}
        nativeInputProps={{
          ...register("label"),
        }}
      />
      <div
        className="flex flex-col gap-2 mb-2 pl-4"
        data-testid="competence-list"
      >
        <SortableList
          items={competencesFields}
          onItemMoved={moveCompetences}
          renderItem={(c, cIndex) => (
            <SortableList.Item
              className="flex items-center gap-2"
              id={c.id}
              key={c.id}
            >
              <div className="flex content-betwee gap-2 w-full mt-2" key={c.id}>
                <SortableList.DragHandle />
                <Input
                  className="mb-0 w-full"
                  label=""
                  state={
                    errors.competences?.[cIndex]?.label ? "error" : "default"
                  }
                  stateRelatedMessage={errors.competences?.[
                    cIndex
                  ]?.label?.message?.toString()}
                  nativeInputProps={{
                    ...register(`competences.${cIndex}.label`),
                  }}
                />
                <Button
                  data-testid="delete-competence-button"
                  type="button"
                  priority="tertiary no outline"
                  iconId="fr-icon-delete-line"
                  iconPosition="left"
                  onClick={() => removeCompetence(cIndex)}
                >
                  Supprimer
                </Button>
              </div>
            </SortableList.Item>
          )}
        />
      </div>
      <Button
        data-testid="add-competence-button"
        type="button"
        priority="tertiary no outline"
        iconId="fr-icon-add-line"
        iconPosition="left"
        onClick={() =>
          appendCompetence({ label: "", index: competencesFields.length })
        }
      >
        Ajouter une compétence
      </Button>
      {onDeleteCompetenceBlocButtonClick && (
        <>
          <hr className="mt-6 mb-1" />
          <Button
            data-testid="delete-competence-bloc-button"
            type="button"
            priority="tertiary no outline"
            iconId="fr-icon-delete-line"
            iconPosition="left"
            onClick={onDeleteCompetenceBlocButtonClick}
          >
            Supprimer ce bloc
          </Button>
        </>
      )}
      <FormButtons
        backUrl={backUrl}
        formState={{
          isDirty,
          isSubmitting,
        }}
      />
    </form>
  );
};
