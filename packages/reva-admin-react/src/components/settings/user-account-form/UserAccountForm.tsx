import { Input } from "@codegouvfr/react-dsfr/Input";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { sanitizedEmail, sanitizedText } from "@/utils/input-sanitization";

const userAccountFormSchema = z.object({
  firstname: sanitizedText({ minLength: 2 }),
  lastname: sanitizedText({ minLength: 2 }),
  email: sanitizedEmail(),
});

export type UserAccountFormData = z.infer<typeof userAccountFormSchema>;

export const UserAccountForm = ({
  onSubmit,
  defaultValues,
  backUrl,
  disabled,
}: {
  onSubmit?(data: UserAccountFormData): Promise<void>;
  defaultValues?: UserAccountFormData;
  backUrl: string;
  disabled?: boolean;
}) => {
  const submitButtonLabel = defaultValues ? "Enregistrer" : "Créer";

  const methods = useForm<UserAccountFormData>({
    resolver: standardSchemaResolver(userAccountFormSchema),
    defaultValues,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = methods;

  const handleFormSubmit = handleSubmit((data) => onSubmit?.(data));

  const handleReset = useCallback(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  return (
    <form
      onSubmit={handleFormSubmit}
      onReset={(e) => {
        e.preventDefault();
        handleReset();
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
        <Input
          label="Nom"
          data-testid="lastname-input"
          state={errors.lastname ? "error" : "default"}
          stateRelatedMessage={errors.lastname?.message?.toString()}
          nativeInputProps={{
            ...register("lastname"),
            autoComplete: "family-name",
          }}
          disabled={disabled}
        />
        <Input
          label="Prénom"
          data-testid="firstname-input"
          state={errors.firstname ? "error" : "default"}
          stateRelatedMessage={errors.firstname?.message?.toString()}
          nativeInputProps={{
            ...register("firstname"),
            autoComplete: "given-name",
          }}
          disabled={disabled}
        />
        <Input
          label="Adresse électronique de connexion"
          data-testid="email-input"
          state={errors.email ? "error" : "default"}
          stateRelatedMessage={errors.email?.message?.toString()}
          nativeInputProps={{
            ...register("email"),
            autoComplete: "email",
            type: "email",
            spellCheck: "false",
          }}
          disabled={disabled}
        />
      </div>
      <FormButtons
        formState={{ isDirty, isSubmitting }}
        backButtonLabel={disabled ? "Retour" : "Annuler"}
        readonly={disabled}
        submitButtonLabel={submitButtonLabel}
        hideResetButton
        backUrl={backUrl}
      />
    </form>
  );
};
