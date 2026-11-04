"use client";
import { Input } from "@codegouvfr/react-dsfr/Input";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useDossierDeValidationProblemPageLogic } from "@/app/(private)/(certificateur)/candidacies/[candidacyId]/dossier-de-validation-v2/problem/dossierDeValidationProblemPageLogic";
import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { FormOptionalFieldsDisclaimer } from "@/components/form-optional-fields-disclaimer/FormOptionalFieldsDisclaimer";
import { graphqlErrorToast, successToast } from "@/components/toast/toast";
import { sanitizedTextAllowSpecialCharacters } from "@/utils/input-sanitization";

const schema = z.object({
  decisionComment: sanitizedTextAllowSpecialCharacters(),
});

export type DossierDeValidationProblemFormData = z.infer<typeof schema>;

const DossierDeValidationProblemPage = () => {
  const router = useRouter();
  const { dossierDeValidation, candidacy, signalDossierDeValidationProblem } =
    useDossierDeValidationProblemPageLogic();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting, isValid },
  } = useForm<DossierDeValidationProblemFormData>({
    resolver: standardSchemaResolver(schema),
  });

  const handleFormSubmit = handleSubmit(async (data) => {
    try {
      await signalDossierDeValidationProblem.mutateAsync({
        dossierDeValidationId: dossierDeValidation?.id || "",
        decisionComment: data.decisionComment,
      });
      successToast("Problème signalé avec succès");
      router.push(`/candidacies/${candidacy?.id}/dossier-de-validation-v2`);
    } catch (e) {
      graphqlErrorToast(e);
    }
  });
  return (
    dossierDeValidation && (
      <div className="flex flex-col w-full">
        <h1>Demander une correction</h1>
        <FormOptionalFieldsDisclaimer />
        <p className="text-xl mb-12">
          Vous avez observé un ou plusieurs problèmes ou éléments manquants dans
          le dossier ? Décrivez-les dans l’encart ci-dessous et faites parvenir
          vos remarques à la personne concernée. Une fois modifié, le dossier de
          validation mis à jour vous sera renvoyé.
        </p>
        <form className="flex flex-col w-full" onSubmit={handleFormSubmit}>
          <div className="flex justify-between gap-2 mb-6 border-y py-2">
            <span className="">Dossier déposé le :</span>
            <span className="font-bold">
              {format(
                dossierDeValidation?.dossierDeValidationSentAt,
                "dd/MM/yyyy",
              )}
            </span>
          </div>
          <Input
            textArea
            label="Observations à transmettre :"
            className="mb-2"
            classes={{ nativeInputOrTextArea: "!min-h-[100px]" }}
            nativeTextAreaProps={{ ...register("decisionComment") }}
            state={errors.decisionComment ? "error" : "default"}
            stateRelatedMessage={errors.decisionComment?.message}
          />
          <FormButtons
            backUrl={`/candidacies/${candidacy?.id}/dossier-de-validation-v2`}
            submitButtonLabel="Envoyer"
            hideResetButton
            formState={{
              isDirty: isDirty,
              isSubmitting: isSubmitting,
              canSubmit: isDirty && !isSubmitting && isValid,
            }}
          />
        </form>
      </div>
    )
  );
};

export default DossierDeValidationProblemPage;
