import { Input } from "@codegouvfr/react-dsfr/Input";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormButtons } from "@/components/form/form-footer/FormButtons";

const readyForJuryEstimatedAtSchema = z.object({
  readyForJuryEstimatedAt: z.string(),
});

export type ReadyForJuryEstimatedAtSchemaFormData = z.infer<
  typeof readyForJuryEstimatedAtSchema
>;

export const ReadyForJuryEstimatedDateTab = ({
  readyForJuryEstimatedAt,
  onFormSubmit,
}: {
  readyForJuryEstimatedAt?: string;
  onFormSubmit: (data: ReadyForJuryEstimatedAtSchemaFormData) => Promise<void>;
}) => {
  const {
    register,
    reset,
    handleSubmit,
    formState: { isDirty, isSubmitting, errors },
  } = useForm<ReadyForJuryEstimatedAtSchemaFormData>({
    resolver: standardSchemaResolver(readyForJuryEstimatedAtSchema),
    defaultValues: {
      readyForJuryEstimatedAt: readyForJuryEstimatedAt,
    },
  });

  const handleReset = useCallback(() => {
    reset({
      readyForJuryEstimatedAt: readyForJuryEstimatedAt,
    });
  }, [readyForJuryEstimatedAt, reset]);

  const handleFormSubmit = handleSubmit(onFormSubmit);

  useEffect(() => {
    handleReset();
  }, [handleReset]);

  return (
    <form
      onSubmit={handleFormSubmit}
      onReset={(e) => {
        e.preventDefault();
        handleReset();
      }}
    >
      <div className="flex flex-col overflow-auto gap-10">
        <p className="m-0">
          La date prévisionnelle est une estimation et sert principalement à
          anticiper le passage devant le jury. Elle n’est pas engageante pour le
          candidat.
        </p>

        <Input
          className="max-w-xs"
          label="Date prévisionnelle"
          hintText="Date au format 31/12/2022"
          nativeInputProps={{
            type: "date",
            ...register("readyForJuryEstimatedAt"),
          }}
          state={errors.readyForJuryEstimatedAt ? "error" : "default"}
          stateRelatedMessage={errors.readyForJuryEstimatedAt?.message}
        />
      </div>

      <FormButtons formState={{ isDirty, isSubmitting }} />
    </form>
  );
};
