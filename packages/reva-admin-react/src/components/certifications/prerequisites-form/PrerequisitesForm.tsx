import { Button } from "@codegouvfr/react-dsfr/Button";
import { Input } from "@codegouvfr/react-dsfr/Input";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { SortableList } from "@/components/sortable-list";
import { sanitizedText } from "@/utils/input-sanitization";

const prerequisitesFormSchema = z.object({
  prerequisites: z
    .object({
      id: z.string().optional(),
      label: sanitizedText(),
      index: z.number(),
    })
    .array(),
});

export type PrerequisitesFormData = z.infer<typeof prerequisitesFormSchema>;

export const PrerequisitesForm = ({
  onSubmit,
  defaultValues,
  backUrl,
  className = "",
  onDeletePrerequisitesButtonClick,
}: {
  onSubmit(data: PrerequisitesFormData): Promise<void>;
  defaultValues?: Partial<PrerequisitesFormData>;
  backUrl: string;
  className?: string;
  onDeletePrerequisitesButtonClick?: () => void;
}) => {
  const methods = useForm<PrerequisitesFormData>({
    resolver: standardSchemaResolver(prerequisitesFormSchema),
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
    fields: prerequisitesFields,
    append: appendPrerequisite,
    remove: removePrerequisite,
    move: movePrerequisites,
  } = useFieldArray({
    control,
    name: "prerequisites",
  });

  const handleFormSubmit = handleSubmit(
    (d: PrerequisitesFormData) => {
      //Re index the prerequisites since they could have been moved in the form
      const reIndexPrerequisites = d.prerequisites.map((c, index) => ({
        ...c,
        index,
      }));
      onSubmit({ prerequisites: reIndexPrerequisites });
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
      <p className="mb-0">Prérequis:</p>
      <div
        className="flex flex-col gap-2 mb-2 pl-4"
        data-testid="prerequisite-list"
      >
        <SortableList
          items={prerequisitesFields}
          onItemMoved={movePrerequisites}
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
                    errors.prerequisites?.[cIndex]?.label ? "error" : "default"
                  }
                  stateRelatedMessage={errors.prerequisites?.[
                    cIndex
                  ]?.label?.message?.toString()}
                  nativeInputProps={{
                    ...register(`prerequisites.${cIndex}.label`),
                  }}
                />
                <Button
                  data-testid="delete-prerequisite-button"
                  type="button"
                  priority="tertiary no outline"
                  iconId="fr-icon-delete-line"
                  iconPosition="left"
                  onClick={() => removePrerequisite(cIndex)}
                >
                  Supprimer
                </Button>
              </div>
            </SortableList.Item>
          )}
        />
      </div>
      <Button
        data-testid="add-prerequisite-button"
        type="button"
        priority="tertiary no outline"
        iconId="fr-icon-add-line"
        iconPosition="left"
        onClick={() =>
          appendPrerequisite({ label: "", index: prerequisitesFields.length })
        }
      >
        Ajouter un prérequis
      </Button>
      <hr className="mt-6 mb-1" />
      {onDeletePrerequisitesButtonClick && (
        <Button
          data-testid="delete-prerequisite-bloc-button"
          type="button"
          priority="tertiary no outline"
          iconId="fr-icon-delete-line"
          iconPosition="left"
          onClick={onDeletePrerequisitesButtonClick}
        >
          Supprimer ce bloc
        </Button>
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
