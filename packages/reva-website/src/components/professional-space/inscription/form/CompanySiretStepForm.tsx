import Alert from "@codegouvfr/react-dsfr/Alert";
import { Button } from "@codegouvfr/react-dsfr/Button";
import Input from "@codegouvfr/react-dsfr/Input";
import { Stepper } from "@codegouvfr/react-dsfr/Stepper";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { FormOptionalFieldsDisclaimer } from "@/components/form/form-optional-fields-disclaimer/FormOptionalFieldsDisclaimer";
import { useGraphQlClient } from "@/components/graphql/graphql-client/GraphqlClient";
import { useProfessionalSpaceSubscriptionContext } from "@/components/professional-space/inscription/context/ProfessionalSpaceSubscriptionContext";
import {
  sanitizedSiret,
  sanitizedText,
  sanitizedTextAllowSpecialCharacters,
  sanitizedUrl,
} from "@/utils/input-sanitization";

import { graphql } from "@/graphql/generated";

import { CompanyPreview } from "../component/CompanyPreview";

const legalStatuses = [
  "ASSOCIATION_LOI_1901",
  "EI",
  "EIRL",
  "ETABLISSEMENT_PUBLIC",
  "EURL",
  "SA",
  "SARL",
  "SAS",
  "SASU",
  "FONDATION",
  "AUTRE",
  "NC",
] as const;

const zodSchema = z.object({
  companySiret: sanitizedSiret(),
  companyLegalStatus: z.enum(legalStatuses, {
    error: "obligatoire",
  }),
  companyName: sanitizedTextAllowSpecialCharacters(),
  companyWebsite: z.union([z.literal(""), sanitizedUrl()]),
  managerFirstname: sanitizedText(),
  managerLastname: sanitizedText(),
});

type CompanySiretStepFormSchema = z.infer<typeof zodSchema>;

export const CompanySiretStepForm = () => {
  const {
    goBackToPreviousStep,
    submitCompanySiretStep,
    professionalSpaceInfos,
  } = useProfessionalSpaceSubscriptionContext();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    watch,
  } = useForm<CompanySiretStepFormSchema>({
    resolver: zodResolver(zodSchema),
    defaultValues: { ...professionalSpaceInfos },
  });

  const companySiret = watch("companySiret");

  const { etablissement, isLoading, isFetching } =
    useEtablissement(companySiret);

  const isSiretLengthValid =
    companySiret != undefined && companySiret?.length >= 14;

  useEffect(() => {
    setValue("companyName", etablissement?.raisonSociale || "");
    setValue(
      "companyLegalStatus",
      etablissement?.formeJuridique.legalStatus || "NC",
    );
  }, [etablissement, setValue]);

  const [etablissementError, setEtablissementError] = useState<boolean>(false);

  useEffect(() => {
    setEtablissementError(false);
  }, [companySiret]);

  const handleFormSubmit = (data: CompanySiretStepFormSchema) => {
    if (etablissement) {
      const { siegeSocial, qualiopiStatus, dateFermeture } = etablissement;

      if (!siegeSocial || !!dateFermeture || !qualiopiStatus) {
        setEtablissementError(true);
        return;
      }
    }

    submitCompanySiretStep(data);
  };

  return (
    <>
      <h1 className="mb-12">
        Étape 1 : Vérification du numéro SIRET
        <FormOptionalFieldsDisclaimer />
      </h1>
      <Stepper
        title="Insérez votre numéro SIRET ainsi que les nom et prénom(s) du ou de la dirigeant(e)."
        currentStep={1}
        stepCount={3}
      />

      <form
        className="flex flex-col gap-8 md:gap-0"
        onSubmit={handleSubmit(handleFormSubmit)}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Numéro SIRET du siège social"
            hintText="14 chiffres"
            state={errors.companySiret ? "error" : "default"}
            stateRelatedMessage={errors.companySiret?.message}
            nativeInputProps={{
              ...register("companySiret", {
                setValueAs: (siret) => siret.replace(/\s+/g, ""),
              }),
            }}
          />

          <Input
            label="Site internet"
            hintText="(Optionnel)"
            state={errors.companyWebsite ? "error" : "default"}
            stateRelatedMessage={errors.companyWebsite?.message}
            nativeInputProps={{ ...register("companyWebsite") }}
          />
        </div>

        {isSiretLengthValid && !isLoading && !isFetching && (
          <CompanyPreview siret={companySiret} etablissement={etablissement} />
        )}

        {etablissement &&
          etablissementError &&
          (() => {
            const { siegeSocial, qualiopiStatus, dateFermeture } =
              etablissement;

            const className =
              !siegeSocial || !!dateFermeture || !qualiopiStatus ? "mb-4" : "";

            return (
              <div className={className}>
                {!siegeSocial && (
                  <Alert
                    severity="error"
                    title="Vous avez renseigné un établissement secondaire"
                    description="Il est obligatoire d’enregistrer en premier lieu le siège social pour pouvoir créer un compte."
                  />
                )}
                {dateFermeture && (
                  <Alert
                    severity="error"
                    title="Vous avez renseigné un établissement inactif"
                    description="À notre connaissance, cet établissement n’est plus en activité. Veillez à enregistrer un établissement actif."
                  />
                )}
                {!qualiopiStatus && (
                  <Alert
                    severity="error"
                    title="Votre Qualiopi VAE est inactif"
                    description="Sans Qualiopi VAE actif, vous ne pouvez pas créer de compte AAP sur notre plateforme."
                  />
                )}
              </div>
            );
          })()}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Nom du (de la) dirigeant(e)"
            state={errors.managerLastname ? "error" : "default"}
            stateRelatedMessage={errors.managerLastname?.message}
            nativeInputProps={{ ...register("managerLastname") }}
          />

          <Input
            label="Prénom(s) du (de la) dirigeant(e)"
            state={errors.managerFirstname ? "error" : "default"}
            stateRelatedMessage={errors.managerFirstname?.message}
            nativeInputProps={{ ...register("managerFirstname") }}
          />
        </div>

        <div className="flex gap-2 mt-4 justify-between">
          <Button
            type="button"
            priority="secondary"
            onClick={goBackToPreviousStep}
          >
            Retour
          </Button>
          <Button type="submit">Passer à l'étape 2</Button>
        </div>
      </form>
    </>
  );
};

const getEtablissementQuery = graphql(`
  query getEtablissement($siret: ID!) {
    getEtablissement(siret: $siret) {
      siret
      siegeSocial
      raisonSociale
      formeJuridique {
        code
        libelle
        legalStatus
      }
      dateFermeture
      qualiopiStatus
    }
  }
`);

const useEtablissement = (siret?: string) => {
  const { graphqlClient } = useGraphQlClient();

  const { isLoading, isError, data, error, isFetching } = useQuery({
    queryKey: [siret],
    queryFn: () =>
      graphqlClient.request(getEtablissementQuery, { siret: siret! }),
    enabled: siret != undefined && siret?.length >= 14,
  });

  return {
    etablissement: data?.getEtablissement,
    isLoading,
    isError,
    error,
    isFetching,
  };
};
