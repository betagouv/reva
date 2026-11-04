import { Button } from "@codegouvfr/react-dsfr/Button";
import Checkbox from "@codegouvfr/react-dsfr/Checkbox";
import { Input } from "@codegouvfr/react-dsfr/Input";
import { RadioButtons } from "@codegouvfr/react-dsfr/RadioButtons";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useForm } from "react-hook-form";

import { graphqlErrorToast, successToast } from "@/components/toast/toast";

import {
  getNonConformityMessages,
  getNonConformityMotives,
  nonConformityMotives,
} from "./nonConformityMotives";
import { useUpdateMaisonMereAAPLegalValidationDecision } from "./useUpdateMaisonMereAAPLegalValidationDecision";
import {
  ValidationDecisionFormData,
  validationDecisionFormSchema,
} from "./validationDecisionFormSchema";

const motiveGroups = [
  ...new Set(nonConformityMotives.map(({ group }) => group)),
];

export default function ValidationDecisionForm({
  maisonMereAAPId,
  aapUpdatedDocumentsAt,
}: {
  maisonMereAAPId: string;
  aapUpdatedDocumentsAt: number;
}) {
  const { updateMaisonMereAAPLegalValidationDecisionMutate } =
    useUpdateMaisonMereAAPLegalValidationDecision(maisonMereAAPId);

  const {
    register,
    watch,
    formState: { errors, isSubmitting },
    handleSubmit,
  } = useForm<ValidationDecisionFormData>({
    resolver: standardSchemaResolver(validationDecisionFormSchema),
    defaultValues: {
      decision: undefined,
      motiveKeys: [],
      aapComment: "",
      internalComment: "",
    },
  });

  const decision = watch("decision");
  const motiveKeys = watch("motiveKeys") || [];
  const isPrecisionRequest = decision === "DEMANDE_DE_PRECISION";
  const generatedMessages = getNonConformityMessages(motiveKeys);

  const onSubmit = async (formData: ValidationDecisionFormData) => {
    try {
      await updateMaisonMereAAPLegalValidationDecisionMutate({
        data: {
          maisonMereAAPId: maisonMereAAPId,
          decision: formData.decision,
          // L'API assemble le commentaire stocké à partir des motifs et de ce texte.
          aapComment: isPrecisionRequest ? formData.aapComment : "",
          nonConformityMotives: isPrecisionRequest
            ? getNonConformityMotives(formData.motiveKeys)
            : [],
          internalComment: formData.internalComment,
          aapUpdatedDocumentsAt: aapUpdatedDocumentsAt,
        },
      });
      successToast("Décision enregistrée avec succès pour cet AAP");
    } catch (e) {
      graphqlErrorToast(e);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-2">
          <fieldset className="grid pt-4">
            <RadioButtons
              small
              state={errors.decision ? "error" : "default"}
              stateRelatedMessage={errors.decision?.message}
              legend="Décision sur la demande :"
              options={[
                {
                  label: "Valider la demande",
                  hintText:
                    "Vous pouvez ajouter un commentaire pour l'équipe France VAE.",
                  nativeInputProps: {
                    value: "VALIDE",
                    ...register("decision"),
                  },
                },
                {
                  label: "Demander des précisions",
                  hintText:
                    "Vous pouvez ajouter un commentaire à destination de l'AAP ou sélectionner les différentes demandes de précision générant un message standard.",
                  nativeInputProps: {
                    value: "DEMANDE_DE_PRECISION",
                    ...register("decision"),
                  },
                },
              ]}
            />
          </fieldset>
          <fieldset className="grid border p-4">
            <Input
              label="Description interne (optionnel) :"
              state={errors.internalComment ? "error" : "default"}
              stateRelatedMessage={errors.internalComment?.message}
              hintText="Ce commentaire n'est pas visible par l'AAP. Il s'agit des informations que la personne chargée du référencement souhaite communiquer au sein de l'équipe France VAE."
              textArea
              nativeTextAreaProps={{
                rows: 6,
                ...register("internalComment"),
              }}
            />
          </fieldset>
        </div>
        {isPrecisionRequest && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
              <div>
                <h3 className="text-xl mb-4">Motifs de non-conformité</h3>
                {motiveGroups.map((group) => (
                  <Checkbox
                    key={group}
                    small
                    legend={`${group} :`}
                    options={nonConformityMotives
                      .filter((motive) => motive.group === group)
                      .map(({ key, label }) => ({
                        label,
                        nativeInputProps: {
                          value: key,
                          ...register("motiveKeys"),
                        },
                      }))}
                  />
                ))}
              </div>
              <div className="md:border-l md:border-neutral-300 md:pl-8">
                <h3 className="text-xl mb-4">Commentaire généré :</h3>
                {generatedMessages.length > 0 && (
                  <>
                    <p className="mb-2">Précisions à apporter :</p>
                    <ul className="list-disc pl-6">
                      {generatedMessages.map((message) => (
                        <li key={message}>{message}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
            <Input
              className="mt-4"
              label="Commentaire complémentaire à destination de la structure accompagnatrice :"
              textArea
              state={errors.aapComment ? "error" : "default"}
              stateRelatedMessage={errors.aapComment?.message}
              nativeTextAreaProps={{
                rows: 4,
                ...register("aapComment"),
              }}
            />
          </>
        )}
        <div className="w-full mt-8 flex flex-row justify-between">
          <Button
            priority="secondary"
            linkProps={{ href: "/subscriptions/check-legal-information/" }}
          >
            Retour
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            Envoyer
          </Button>
        </div>
      </form>
    </div>
  );
}
