import Checkbox from "@codegouvfr/react-dsfr/Checkbox";
import Input from "@codegouvfr/react-dsfr/Input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { AutocompleteAddress } from "@/components/autocomplete-address/AutocompleteAddress";
import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { graphqlErrorToast, successToast } from "@/components/toast/toast";
import { GenderEnum } from "@/constants/genders.constant";

import {
  Candidate,
  CandidateUpdateInformationBySelfInput,
} from "@/graphql/generated/graphql";

import {
  FormContactInformationData,
  contactInformationSchema,
} from "./contactInformationSchema";
import {
  CandidateUseProfile,
  Countries,
  Departments,
  useUpdateContactInformations,
} from "./useContactInformations";

export const ContactInformationForm = ({
  candidate,
  countries,
  hideBackButton,
  backButtonLabel,
  backButtonUrl,
  hideResetButton,
  submitButtonLabel,
  submitPath,
  forceIsDirty,
}: {
  candidate: CandidateUseProfile;
  countries?: Countries;
  departments?: Departments;
  hideBackButton?: boolean;
  backButtonLabel?: string;
  backButtonUrl?: string;
  hideResetButton?: boolean;
  submitButtonLabel?: string;
  submitPath?: string;
  forceIsDirty?: boolean;
}) => {
  const { updateContactInformationsMutate } = useUpdateContactInformations({
    candidateId: candidate?.id,
  });
  const isFCLinked = candidate?.franceConnectLinked;
  const router = useRouter();

  const [manualAddressSelected, setManualAddress] = useState(false);
  const franceId = countries?.find((c) => c.label === "France")?.id;

  const {
    register,
    setValue,
    getValues,
    reset,
    formState: { errors, isDirty, isSubmitting },
    handleSubmit,
  } = useForm<FormContactInformationData>({
    resolver: zodResolver(contactInformationSchema()),
    defaultValues: {
      street: candidate?.street ?? "",
      city: candidate?.city ?? "",
      zip: candidate?.zip ?? "",
      phone: candidate?.phone ?? "",
      email: candidate?.email ?? "",
      addressComplement: candidate?.addressComplement ?? "",
    },
  });

  const resetFormData = useCallback(
    (candidate: Candidate) => {
      if (!candidate) return;
      reset({
        street: candidate.street ?? "",
        city: candidate.city ?? "",
        zip: candidate.zip ?? "",
        phone: candidate.phone ?? "",
        email: candidate.email ?? "",
        addressComplement: candidate.addressComplement ?? "",
      });
    },
    [reset],
  );
  useEffect(() => {
    resetFormData(candidate as Candidate);
  }, [candidate, resetFormData]);

  const onSubmit = async (data: FormContactInformationData) => {
    const candidateInformation: CandidateUpdateInformationBySelfInput = {
      firstname: candidate?.firstname ?? "",
      firstname2: candidate?.firstname2 ?? "",
      firstname3: candidate?.firstname3 ?? "",
      middleNames: candidate?.middleNames ?? "",
      lastname: candidate?.lastname ?? "",
      givenName: candidate?.givenName ?? "",
      birthCity: candidate?.birthCity ?? "",
      nationality: candidate?.nationality ?? "",
      gender: (candidate?.gender as GenderEnum) ?? GenderEnum.undisclosed,
      countryId: candidate?.country?.id ?? franceId,
      birthdate: candidate?.birthdate ?? undefined,
      birthDepartmentId: candidate?.birthDepartment?.id ?? "",
      street: data.street,
      zip: data.zip,
      city: data.city,
      phone: data.phone.replace(/\s/g, ""),
      email: data.email,
      addressComplement: data.addressComplement,
    };

    try {
      await updateContactInformationsMutate({
        candidateInformation,
      });
      successToast("Les informations ont bien été mises à jour");
      router.push(submitPath || "../");
    } catch (e) {
      graphqlErrorToast(e);
    }
  };

  const handleOnAddressSelection = ({
    street,
    zip,
    city,
  }: {
    street: string;
    zip: string;
    city: string;
  }) => {
    setValue("street", street, { shouldDirty: true });
    setValue("zip", zip, { shouldDirty: true });
    setValue("city", city, { shouldDirty: true });
    setManualAddress(false);
  };

  const handleToggleManualAddress = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setManualAddress(e.target.checked);
  };

  return (
    <>
      <form
        onSubmit={handleSubmit(onSubmit)}
        onReset={(e) => {
          e.preventDefault();
          resetFormData(candidate as Candidate);
        }}
        className="flex flex-col gap-6"
        data-testid="contact-information-form"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 md:gap-6">
          <div className="col-span-3 flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              {manualAddressSelected ? (
                <Input
                  label="Adresse complète"
                  className="col-span-2 flex-1 mb-0"
                  nativeInputProps={register("street")}
                  state={errors.street ? "error" : "default"}
                  stateRelatedMessage={errors.street?.message}
                  data-testid="street-input"
                />
              ) : (
                <AutocompleteAddress
                  label="Adresse complète"
                  onOptionSelection={handleOnAddressSelection}
                  className="col-span-2 flex-1 mb-0"
                  defaultSearchText={`${getValues("street")} ${getValues("zip")} ${getValues("city")}`}
                  state={errors.street ? "error" : "default"}
                  stateRelatedMessage={errors.street?.message}
                  data-testid="autocomplete-address-input"
                />
              )}
              <Checkbox
                className="col-span-1"
                small
                options={[
                  {
                    label: "Saisir manuellement l'adresse",
                    nativeInputProps: {
                      checked: manualAddressSelected,
                      onChange: handleToggleManualAddress,
                    },
                  },
                ]}
                data-testid="manual-address-checkbox"
              />

              <Input
                label="Complément d'adresse (Optionnel)"
                className="col-span-2 mb-0"
                nativeInputProps={register("addressComplement")}
                state={errors.addressComplement ? "error" : "default"}
                stateRelatedMessage={errors.addressComplement?.message}
                data-testid="address-complement-input"
              />
            </div>

            {manualAddressSelected && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                <div className="flex flex-col md:flex-row gap-6 col-span-2">
                  <Input
                    label="Code postal"
                    className="flex-[1] mb-0"
                    nativeInputProps={register("zip")}
                    state={errors.zip ? "error" : "default"}
                    stateRelatedMessage={errors.zip?.message}
                    data-testid="zip-input"
                  />
                  <Input
                    label="Ville"
                    className="flex-[2] mb-0"
                    nativeInputProps={register("city")}
                    state={errors.city ? "error" : "default"}
                    stateRelatedMessage={errors.city?.message}
                    data-testid="city-input"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 md:gap-6 items-start">
              <Input
                label="Adresse électronique de connexion"
                className="col-span-2 mb-0"
                nativeInputProps={register("email")}
                state={errors.email ? "error" : "default"}
                stateRelatedMessage={errors.email?.message}
                data-testid="email-input"
              />
              <Input
                label="Numéro de téléphone"
                className="col-span-1 mb-0 mt-6 md:mt-0"
                nativeInputProps={register("phone")}
                state={errors.phone ? "error" : "default"}
                stateRelatedMessage={errors.phone?.message}
                data-testid="phone-input"
              />
            </div>
          </div>

          <div className="col-span-1 w-full md:w-auto mt-6 md:mt-0">
            <div className="flex flex-col px-4 pt-6 bg-dsfr-light-decisions-background-background-alt-blue-france">
              <h6>Ressources :</h6>
              <div>
                <p className="font-bold mb-2">
                  Vous ne trouvez pas votre adresse exacte ?
                </p>
                <p>Utiliser l’option de saisie manuelle de l’adresse.</p>
              </div>

              {isFCLinked && (
                <div>
                  <p className="font-bold mb-2">
                    Comment modifier mon adresse électronique de connexion ?
                  </p>
                  <p>
                    Les informations de connexion récupérées via FranceConnect
                    ne peuvent pas être modifiées directement. Pour toute
                    correction ou mise à jour, consultez la{" "}
                    <a
                      className="fr-link"
                      href="https://aide.franceconnect.gouv.fr/faq/erreur-etat-civil/articles/etat-civil-erreur-compte/"
                      target="_blank"
                    >
                      page d’aide FranceConnect
                    </a>
                    .
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <FormButtons
          backUrl={hideBackButton ? undefined : backButtonUrl || "../"}
          backLabel={backButtonLabel}
          hideResetButton={hideResetButton}
          submitButtonLabel={submitButtonLabel}
          formState={{ isDirty: forceIsDirty ?? isDirty, isSubmitting }}
          data-testid="form-buttons"
        />
      </form>
    </>
  );
};
