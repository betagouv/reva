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
}: {
  candidate: CandidateUseProfile;
  countries?: Countries;
  departments?: Departments;
  hideBackButton?: boolean;
}) => {
  const { updateContactInformationsMutate } = useUpdateContactInformations();
  const router = useRouter();

  const isAddressAlreadyCompleted =
    !!candidate?.street && !!candidate?.zip && !!candidate?.city;

  const [manualAddressSelected, setManualAddress] = useState(
    isAddressAlreadyCompleted,
  );
  const franceId = countries?.find((c) => c.label === "France")?.id;

  const {
    register,
    setValue,
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
      id: candidate?.id,
      firstname: candidate?.firstname ?? "",
      firstname2: candidate?.firstname2 ?? "",
      firstname3: candidate?.firstname3 ?? "",
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
      phone: data.phone,
      email: data.email,
      addressComplement: data.addressComplement,
    };

    try {
      await updateContactInformationsMutate({
        candidateInformation,
      });
      successToast("Les informations ont bien été mises à jour");
      router.push("../");
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
    setValue("street", "");
    setValue("zip", "");
    setValue("city", "");
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
        <div className="grid grid-cols-4 gap-6">
          <div className="col-span-3 flex flex-col gap-6">
            <div className="flex flex-row gap-6">
              {manualAddressSelected ? (
                <Input
                  label="Adresse"
                  className="w-full flex-1 mb-0"
                  nativeInputProps={register("street")}
                  state={errors.street ? "error" : "default"}
                  stateRelatedMessage={errors.street?.message}
                  data-testid="street-input"
                />
              ) : (
                <AutocompleteAddress
                  onOptionSelection={handleOnAddressSelection}
                  className="w-full flex-1 mb-0"
                  nativeInputProps={register("street")}
                  state={errors.street ? "error" : "default"}
                  stateRelatedMessage={errors.street?.message}
                  data-testid="autocomplete-address-input"
                />
              )}
              <Input
                label="Complément d'adresse (Optionnel)"
                className="w-full flex-1 mb-0"
                nativeInputProps={register("addressComplement")}
                state={errors.addressComplement ? "error" : "default"}
                stateRelatedMessage={errors.addressComplement?.message}
                data-testid="address-complement-input"
              />
            </div>

            <Checkbox
              options={[
                {
                  label: "Je saisis manuellement l'adresse",
                  nativeInputProps: {
                    checked: manualAddressSelected,
                    onChange: handleToggleManualAddress,
                  },
                },
              ]}
              className="w-fit"
              data-testid="manual-address-checkbox"
            />

            <div className="flex gap-6">
              <Input
                label="Code postal (France uniquement)"
                className="w-full flex-1 mb-0"
                nativeInputProps={register("zip")}
                state={errors.zip ? "error" : "default"}
                stateRelatedMessage={errors.zip?.message}
                data-testid="zip-input"
              />
              <Input
                label="Ville"
                className="w-full flex-[2] mb-0"
                nativeInputProps={register("city")}
                state={errors.city ? "error" : "default"}
                stateRelatedMessage={errors.city?.message}
                data-testid="city-input"
              />
            </div>
            <div className="flex gap-6">
              <Input
                label="Numéro de téléphone"
                className="w-full mb-0"
                nativeInputProps={register("phone")}
                state={errors.phone ? "error" : "default"}
                stateRelatedMessage={errors.phone?.message}
                data-testid="phone-input"
              />
              <Input
                label="Adresse électronique"
                className="w-full mb-0"
                nativeInputProps={register("email")}
                state={errors.email ? "error" : "default"}
                stateRelatedMessage={errors.email?.message}
                data-testid="email-input"
              />
            </div>
          </div>

          <div className="col-span-1">
            <div className="flex flex-col px-4 pt-6 bg-dsfr-light-decisions-background-background-alt-blue-france">
              <h6>Ressources :</h6>
              <div>
                <p className="font-bold mb-2">
                  Vous ne trouvez pas votre adresse exacte ?
                </p>
                <p>
                  Indiquez-la en <strong>complément d’adresse</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>

        <FormButtons
          backUrl={hideBackButton ? undefined : "../"}
          formState={{ isDirty, isSubmitting }}
          data-testid="form-buttons"
        />
      </form>
    </>
  );
};
