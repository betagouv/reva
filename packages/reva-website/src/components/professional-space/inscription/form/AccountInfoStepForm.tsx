import Alert from "@codegouvfr/react-dsfr/Alert";
import { Button } from "@codegouvfr/react-dsfr/Button";
import Checkbox from "@codegouvfr/react-dsfr/Checkbox";
import { Input } from "@codegouvfr/react-dsfr/Input";
import { Stepper } from "@codegouvfr/react-dsfr/Stepper";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";

import { FormOptionalFieldsDisclaimer } from "@/components/form/form-optional-fields-disclaimer/FormOptionalFieldsDisclaimer";
import { CompanySummary } from "@/components/professional-space/inscription/component/CompanySummary";
import { useProfessionalSpaceSubscriptionContext } from "@/components/professional-space/inscription/context/ProfessionalSpaceSubscriptionContext";
import {
  sanitizedEmail,
  sanitizedPhone,
  sanitizedText,
} from "@/utils/input-sanitization";

export const AccountInfoStepForm = () => {
  const { professionalSpaceInfos, submitAccountInfoStep } =
    useProfessionalSpaceSubscriptionContext();

  const zodSchema = z.object({
    accountFirstname: sanitizedText(),
    accountLastname: sanitizedText(),
    accountEmail: sanitizedEmail(),
    accountPhoneNumber: sanitizedPhone(),
    delegataire: z.boolean(),
  });

  type AccountInfoStepFormSchema = z.infer<typeof zodSchema>;

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<AccountInfoStepFormSchema>({
    resolver: standardSchemaResolver(zodSchema),
    defaultValues: { ...professionalSpaceInfos },
  });

  const { delegataire } = useWatch({ control });

  useEffect(() => {
    if (!delegataire) {
      setValue("accountLastname", professionalSpaceInfos.managerLastname || "");
      setValue(
        "accountFirstname",
        professionalSpaceInfos.managerFirstname || "",
      );
    }
  }, [
    delegataire,
    setValue,
    professionalSpaceInfos.managerLastname,
    professionalSpaceInfos.managerFirstname,
  ]);

  const resetForm = () =>
    reset({
      accountFirstname: professionalSpaceInfos.accountFirstname,
      accountLastname: professionalSpaceInfos.accountLastname,
      accountEmail: "",
      accountPhoneNumber: "",
      delegataire: false,
    });

  return (
    <>
      <h1 className="mb-12">
        Étape 2 - Informations de l’administrateur
        <FormOptionalFieldsDisclaimer />
      </h1>
      <Stepper
        title="Ajoutez les informations de l’administrateur du compte France VAE"
        currentStep={2}
        stepCount={3}
      />
      <div className="md:flex items-stretch gap-x-8">
        <CompanySummary currentStep={2} />
        <div className="w-full flex flex-col">
          <h2>Administrateur du compte France VAE</h2>
          <form
            className="h-full flex flex-col"
            onSubmit={handleSubmit(submitAccountInfoStep)}
            onReset={(e) => {
              e.preventDefault();
              resetForm();
            }}
          >
            <fieldset>
              <legend className="text-xl text-gray-900 mb-6">
                L’administrateur du compte France VAE peut paramétrer les
                structures et/ou lieux d’accueil, ainsi que les domaines et
                niveaux de certification depuis son compte.
              </legend>
              <div className="mb-6 md:mb-0 md:grid grid-cols-1 md:grid-cols-3 gap-x-8">
                <Checkbox
                  className="col-span-3"
                  options={[
                    {
                      label:
                        "L'administrateur du compte France VAE et le dirigeant de la structure sont deux personnes différentes.",
                      nativeInputProps: { ...register("delegataire") },
                    },
                  ]}
                />
                <Input
                  className="col-span-1"
                  label="Nom"
                  state={errors.accountLastname ? "error" : "default"}
                  stateRelatedMessage={errors.accountLastname?.message}
                  disabled={!delegataire}
                  nativeInputProps={{
                    ...register("accountLastname"),
                    autoComplete: "family-name",
                  }}
                />
                <Input
                  className="col-span-2"
                  label="Prénom(s)"
                  state={errors.accountFirstname ? "error" : "default"}
                  stateRelatedMessage={errors.accountFirstname?.message}
                  disabled={!delegataire}
                  nativeInputProps={{
                    ...register("accountFirstname"),
                    autoComplete: "given-name",
                  }}
                />

                <Input
                  className="col-span-1"
                  label="Numéro de téléphone"
                  state={errors.accountPhoneNumber ? "error" : "default"}
                  stateRelatedMessage={errors.accountPhoneNumber?.message}
                  nativeInputProps={{
                    ...register("accountPhoneNumber"),
                    autoComplete: "phone",
                    type: "phone",
                  }}
                />

                <div className="col-span-2 flex flex-col">
                  <Input
                    label="Adresse électronique"
                    state={errors.accountEmail ? "error" : "default"}
                    stateRelatedMessage={errors.accountEmail?.message}
                    nativeInputProps={{
                      ...register("accountEmail"),
                      autoComplete: "email",
                      type: "email",
                      spellCheck: "false",
                    }}
                  />

                  <Alert
                    className="self-start w-full"
                    severity="info"
                    title=""
                    description={
                      <>
                        L’adresse électronique vous permettra de vous connecter
                        à la plateforme. C’est sur celle-ci que vous recevrez la
                        confirmation de la validation de votre compte
                        administrateur.
                        <br />
                        <br />
                        <span className="font-bold">
                          <span
                            className="fr-icon-warning-fill fr-icon--sm"
                            aria-hidden="true"
                          ></span>{" "}
                          Attention : Vous ne pouvez pas renseigner une adresse
                          électronique déjà utilisée sur France VAE.
                        </span>
                      </>
                    }
                  />
                </div>
              </div>
            </fieldset>
            <div className="mt-16 flex gap-2 items-end justify-end">
              <Button type="reset" priority="tertiary no outline">
                Réinitialiser
              </Button>
              <Button type="submit">Passer à l'étape 3</Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};
