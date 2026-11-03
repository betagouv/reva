import { Button } from "@codegouvfr/react-dsfr/Button";
import { Stepper } from "@codegouvfr/react-dsfr/Stepper";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FancyUpload } from "@/components/fancy-upload/FancyUpload";
import { FormOptionalFieldsDisclaimer } from "@/components/form/form-optional-fields-disclaimer/FormOptionalFieldsDisclaimer";
import { CompanySummary } from "@/components/professional-space/inscription/component/CompanySummary";
import { useProfessionalSpaceSubscriptionContext } from "@/components/professional-space/inscription/context/ProfessionalSpaceSubscriptionContext";

const schema = z.object({
  attestationURSSAF: z
    .object({
      0: z.undefined().or(z.instanceof(File)),
    })
    .optional(),

  justificatifIdentiteDirigeant: z
    .object({
      0: z.undefined().or(z.instanceof(File)),
    })
    .optional(),
  lettreDeDelegation: z
    .object({
      0: z.undefined().or(z.instanceof(File)),
    })
    .optional(),
  justificatifIdentiteDelegataire: z
    .object({
      0: z.undefined().or(z.instanceof(File)),
    })
    .optional(),
});

type FormData = z.infer<typeof schema>;

export const CompanyDocumentsStepForm = () => {
  const {
    submitCompanyDocumentsStep,
    professionalSpaceInfos: { delegataire },
  } = useProfessionalSpaceSubscriptionContext();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: standardSchemaResolver(schema),
  });

  const handleFormSubmit = handleSubmit(
    async ({
      attestationURSSAF,
      justificatifIdentiteDirigeant,
      lettreDeDelegation,
      justificatifIdentiteDelegataire,
    }) => {
      let formValid = true;
      if (!attestationURSSAF?.[0]) {
        setError("attestationURSSAF", { message: "Merci de remplir ce champ" });
        formValid = false;
      }
      if (!justificatifIdentiteDirigeant?.[0]) {
        setError("justificatifIdentiteDirigeant", {
          message: "Merci de remplir ce champ",
        });
        formValid = false;
      }

      if (delegataire) {
        if (!lettreDeDelegation?.[0]) {
          setError("lettreDeDelegation", {
            message: "Merci de remplir ce champ",
          });
          formValid = false;
        }
        if (!justificatifIdentiteDelegataire?.[0]) {
          setError("justificatifIdentiteDelegataire", {
            message: "Merci de remplir ce champ",
          });
          formValid = false;
        }
      }

      if (formValid) {
        await submitCompanyDocumentsStep({
          attestationURSSAF: attestationURSSAF?.[0] as File,
          justificatifIdentiteDirigeant:
            justificatifIdentiteDirigeant?.[0] as File,
          lettreDeDelegation: lettreDeDelegation?.[0],
          justificatifIdentiteDelegataire: justificatifIdentiteDelegataire?.[0],
        });
      }
    },
    (e) => console.log(e),
  );

  return (
    <>
      <h1 className="mb-12">
        Étape 3 - Documents juridiques
        <FormOptionalFieldsDisclaimer />
      </h1>
      <Stepper
        title="Transmettez les différentes pièces justificatives "
        currentStep={3}
        stepCount={3}
      />
      <div className="md:flex gap-x-6 items-stretch">
        <CompanySummary currentStep={3} />
        <form className="flex flex-col gap-8" onSubmit={handleFormSubmit}>
          <FancyUpload
            title="Attestation URSSAF ou attestation MSA"
            description={
              <>
                Merci de fournir une attestion URSSAF ou MSA{" "}
                <u>datée de moins de 3 mois</u> qui affiche les informations
                suivantes :
                <ul className="mt-4 leading-normal">
                  <li>
                    Le code de sécurité (visible sur l’attestation de vigilance,
                    l’attestation fiscale ou l’attestation MSA) ;
                  </li>
                  <li>
                    Le numéro de SIRET de la structure accompagnatrice (14
                    chiffres)
                  </li>
                </ul>
              </>
            }
            hint="Format supporté : PDF uniquement avec un poids maximum de 2Mo"
            nativeInputProps={{
              ...register("attestationURSSAF"),
              accept: ".pdf",
            }}
            state={errors.attestationURSSAF ? "error" : "default"}
            stateRelatedMessage={errors.attestationURSSAF?.message}
          />
          <FancyUpload
            title="Copie du justificatif d'identité du dirigeant"
            description={
              <>
                Pour confirmer l’identité du dirigeant, merci de nous
                transmettre l’un des justificatifs d’identité suivants :
                <ul className="my-4 leading-normal">
                  <li>
                    Carte nationale d’identité recto/verso en cours de validité
                    (ou dépassée depuis moins de 5 ans) ;
                  </li>
                  <li>Passeport en cours de validité ;</li>
                </ul>
              </>
            }
            hint="Format supporté : PDF uniquement avec un poids maximum de 2Mo"
            nativeInputProps={{
              ...register("justificatifIdentiteDirigeant"),
              accept: ".pdf",
            }}
            state={errors.justificatifIdentiteDirigeant ? "error" : "default"}
            stateRelatedMessage={errors.justificatifIdentiteDirigeant?.message}
          />
          {delegataire && (
            <>
              <FancyUpload
                title="Lettre de délégation"
                description="Il s'agit de la lettre de délégation de l'administration du compte France VAE signée et datée par le dirigeant et le délégataire."
                hint="Format supporté : PDF uniquement avec un poids maximum de 2Mo"
                nativeInputProps={{
                  ...register("lettreDeDelegation"),
                  accept: ".pdf",
                }}
                state={errors.lettreDeDelegation ? "error" : "default"}
                stateRelatedMessage={errors.lettreDeDelegation?.message}
              />

              <FancyUpload
                title="Copie du justificatif d'identité du délégataire"
                description={
                  <>
                    Pour confirmer l’identité du délégataire, merci de nous
                    transmettre l’un des justificatifs d’identité suivants :
                    <ul className="my-4 leading-normal">
                      <li>
                        Carte nationale d’identité recto/verso en cours de
                        validité (ou dépassée depuis moins de 5 ans) ;
                      </li>
                      <li>Passeport en cours de validité ;</li>
                    </ul>
                  </>
                }
                hint="Format supporté : PDF uniquement avec un poids maximum de 2Mo"
                nativeInputProps={{
                  ...register("justificatifIdentiteDelegataire"),
                  accept: ".pdf",
                }}
                state={
                  errors.justificatifIdentiteDelegataire ? "error" : "default"
                }
                stateRelatedMessage={
                  errors.justificatifIdentiteDelegataire?.message
                }
              />
            </>
          )}
          <div className="h-full flex items-end justify-end gap-2">
            <Button type="submit" disabled={isSubmitting}>
              Envoyer le formulaire
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};
