"use client";

import Checkbox from "@codegouvfr/react-dsfr/Checkbox";
import { Input } from "@codegouvfr/react-dsfr/Input";
import { RadioButtons } from "@codegouvfr/react-dsfr/RadioButtons";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";

import { AutocompleteAddress } from "@/components/autocomplete-address/AutocompleteAddress";
import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { FormOptionalFieldsDisclaimer } from "@/components/form-optional-fields-disclaimer/FormOptionalFieldsDisclaimer";
import { graphqlErrorToast, successToast } from "@/components/toast/toast";

import type { Organism } from "@/graphql/generated/graphql";

import { useOrganismInformationForm } from "./organismInformationForm.hook";
import {
  OrganismInformationInputData,
  OrganismInformationOutputData,
  organismInformationFormSchema,
} from "./organismInformationFormSchema";

import type { AddressOption } from "@/components/use-autocomplete-address/useAutocompleteAddress.hook";

type OrganismInformationInitialData = Partial<
  Pick<
    Organism,
    | "nomPublic"
    | "telephone"
    | "emailContact"
    | "siteInternet"
    | "conformeNormesAccessibilite"
    | "adresseNumeroEtNomDeRue"
    | "adresseInformationsComplementaires"
    | "adresseCodePostal"
    | "adresseVille"
  >
>;

const OrganismInformationForm = ({
  mutationOnSubmit,
  pathRedirection,
  defaultData,
}: {
  mutationOnSubmit: (data: OrganismInformationOutputData) => Promise<void>;
  pathRedirection: string;
  defaultData?: OrganismInformationInitialData;
}) => {
  const router = useRouter();

  const defaultValues: OrganismInformationInputData = useMemo(() => {
    const {
      adresseNumeroEtNomDeRue,
      adresseCodePostal,
      adresseVille,
      conformeNormesAccessibilite,
    } = defaultData ?? {};

    const hasCompleteAddress =
      adresseNumeroEtNomDeRue && adresseCodePostal && adresseVille;

    return {
      nomPublic: defaultData?.nomPublic ?? "",
      adresseComplete: hasCompleteAddress
        ? `${adresseNumeroEtNomDeRue} ${adresseCodePostal} ${adresseVille}`
        : "",
      adresseFragments: hasCompleteAddress
        ? {
            adresseNumeroEtNomDeRue,
            adresseCodePostal,
            adresseVille,
          }
        : undefined,
      adresseInformationsComplementaires:
        defaultData?.adresseInformationsComplementaires ?? "",
      telephone: defaultData?.telephone ?? "",
      emailContact: defaultData?.emailContact ?? "",
      siteInternet: defaultData?.siteInternet ?? "",
      conformeNormesAccessibilite:
        conformeNormesAccessibilite === "CONFORME" ||
        conformeNormesAccessibilite === "NON_CONFORME"
          ? conformeNormesAccessibilite
          : "",
    };
  }, [defaultData]);

  const {
    gestionnaireMaisonMerAAPOrganismPhone,
    gestionnaireMaisonMerAAPOrganismEmail,
  } = useOrganismInformationForm();

  const methods = useForm<
    OrganismInformationInputData,
    undefined,
    OrganismInformationOutputData
  >({
    defaultValues,
    resolver: standardSchemaResolver(organismInformationFormSchema),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState,
    setValue,
    resetField,
    watch,
    clearErrors,
  } = methods;
  const { errors, isDirty, isSubmitting } = formState;
  const adresseComplete = watch("adresseComplete");
  const adresseCompleteRegister = register("adresseComplete");

  const handleOnAddressSelection = ({
    label,
    street,
    zip,
    city,
  }: AddressOption) => {
    setValue(
      "adresseFragments",
      {
        adresseNumeroEtNomDeRue: street,
        adresseCodePostal: zip,
        adresseVille: city,
      },
      { shouldDirty: true },
    );
    setValue("adresseComplete", label, { shouldDirty: true });
    clearErrors(["adresseComplete"]);
  };

  const handleAddressInputChange = (value: string) => {
    setValue("adresseComplete", value, { shouldDirty: true });
    resetField("adresseFragments", {
      defaultValue: undefined,
      keepDirty: true,
    });
    clearErrors(["adresseComplete"]);
  };

  const handleFormSubmit = handleSubmit(async (data) => {
    try {
      await mutationOnSubmit(data);
      successToast("Modifications enregistrées");
      router.push(pathRedirection);
    } catch (e) {
      graphqlErrorToast(e);
    }
  });

  const handleReset = useCallback(() => {
    reset(defaultValues);
    clearErrors();
  }, [reset, defaultValues, clearErrors]);

  useEffect(() => {
    handleReset();
  }, [handleReset]);

  const handleCheckUseGestionnaireMaisonMerAAPOrganismEmailInfo = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (e.target.checked) {
      if (gestionnaireMaisonMerAAPOrganismPhone) {
        setValue("telephone", gestionnaireMaisonMerAAPOrganismPhone);
      }
      if (gestionnaireMaisonMerAAPOrganismEmail) {
        setValue("emailContact", gestionnaireMaisonMerAAPOrganismEmail);
      }
    } else {
      setValue("telephone", "");
      setValue("emailContact", "");
    }
  };

  return (
    <div>
      <h1>Informations affichées aux candidats</h1>
      <FormOptionalFieldsDisclaimer />
      <p className="text-xl">
        Renseignez les informations liées au lieu d'accueil qui accueillera les
        candidats. Celles-ci seront visibles dans leurs résultats de recherche.
      </p>
      <form
        onSubmit={handleFormSubmit}
        onReset={(e) => {
          e.preventDefault();
          handleReset();
        }}
      >
        <div className="flex flex-col gap-8">
          <fieldset className="flex flex-col mt-6">
            <div className="lg:grid grid-cols-1 md:grid-cols-3 gap-x-6">
              <Input
                className="col-span-3"
                label="Nom du lieu d’accueil"
                nativeInputProps={{ ...register("nomPublic") }}
                state={errors.nomPublic ? "error" : "default"}
                stateRelatedMessage={errors.nomPublic?.message?.toString()}
              />

              <div className="col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <AutocompleteAddress
                  className="w-full"
                  onOptionSelection={handleOnAddressSelection}
                  onInputChange={handleAddressInputChange}
                  value={adresseComplete}
                  nativeInputProps={{
                    name: adresseCompleteRegister.name,
                    onBlur: adresseCompleteRegister.onBlur,
                    ref: adresseCompleteRegister.ref,
                  }}
                  state={errors.adresseComplete ? "error" : "default"}
                  stateRelatedMessage={errors.adresseComplete?.message?.toString()}
                />

                <Input
                  className="w-full"
                  label="Informations complémentaires (optionnel)"
                  nativeInputProps={{
                    ...register("adresseInformationsComplementaires"),
                    autoComplete: "off",
                  }}
                  state={
                    errors.adresseInformationsComplementaires
                      ? "error"
                      : "default"
                  }
                  stateRelatedMessage={errors.adresseInformationsComplementaires?.message?.toString()}
                />
              </div>

              <Input
                label="Téléphone"
                nativeInputProps={{ ...register("telephone") }}
                state={errors.telephone ? "error" : "default"}
                stateRelatedMessage={errors.telephone?.message?.toString()}
              />

              <Input
                label="Adresse électronique de contact"
                nativeInputProps={{ ...register("emailContact") }}
                state={errors.emailContact ? "error" : "default"}
                stateRelatedMessage={errors.emailContact?.message?.toString()}
              />

              <Input
                label="Site internet (optionnel)"
                nativeInputProps={{ ...register("siteInternet") }}
                state={errors.siteInternet ? "error" : "default"}
                stateRelatedMessage={errors.siteInternet?.message?.toString()}
              />

              <Checkbox
                className="col-span-3 mb-6"
                options={[
                  {
                    label:
                      "Utiliser le téléphone et l'adresse électronique renseignés dans les informations générales.",
                    nativeInputProps: {
                      onChange:
                        handleCheckUseGestionnaireMaisonMerAAPOrganismEmailInfo,
                    },
                  },
                ]}
              />

              <RadioButtons
                className="col-span-3 mb-0"
                legend="Le lieu d’accueil est-il conforme aux normes d'accessibilité pour les personnes à mobilité réduite ?"
                options={[
                  {
                    label: "Oui",
                    nativeInputProps: {
                      value: "CONFORME",
                      ...register("conformeNormesAccessibilite"),
                    },
                  },
                  {
                    label: "Non",
                    nativeInputProps: {
                      value: "NON_CONFORME",
                      ...register("conformeNormesAccessibilite"),
                    },
                  },
                ]}
                state={errors.conformeNormesAccessibilite ? "error" : "default"}
                stateRelatedMessage={
                  errors.conformeNormesAccessibilite &&
                  "Veuillez sélectionner une option"
                }
              />
            </div>
          </fieldset>
        </div>

        <FormButtons
          formState={{ isDirty, isSubmitting }}
          backUrl={pathRedirection}
        />
      </form>
    </div>
  );
};

export default OrganismInformationForm;
