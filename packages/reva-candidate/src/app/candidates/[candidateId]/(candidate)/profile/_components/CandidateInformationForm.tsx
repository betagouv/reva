import Checkbox from "@codegouvfr/react-dsfr/Checkbox";
import Input from "@codegouvfr/react-dsfr/Input";
import Select from "@codegouvfr/react-dsfr/Select";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { AutocompleteAddress } from "@/components/autocomplete-address/AutocompleteAddress";
import { useFeatureFlipping } from "@/components/feature-flipping/featureFlipping";
import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { graphqlErrorToast, successToast } from "@/components/toast/toast";
import { GenderEnum } from "@/constants/genders.constant";

import {
  Candidate,
  CandidateUpdateInformationBySelfInput,
} from "@/graphql/generated/graphql";

import {
  FormCandidateInformationData,
  candidateInformationSchema,
} from "./candidateInformationSchema";
import {
  CandidateUseProfile,
  Countries,
  Departments,
  useUpdateCandidateInformation,
} from "./useProfile";

const CandidateInformationForm = ({
  candidate,
  countries,
  departments,
  hideBackButton,
}: {
  candidate: CandidateUseProfile;
  countries?: Countries;
  departments?: Departments;
  hideBackButton?: boolean;
}) => {
  const { isFeatureActive } = useFeatureFlipping();
  const isMiddleNamesEnabled = isFeatureActive("MIDDLE_NAMES");

  const { updateCandidateInformationMutate } = useUpdateCandidateInformation({
    candidateId: candidate?.id,
  });
  const isFCLinked = candidate?.franceConnectLinked;
  const router = useRouter();

  const isAddressAlreadyCompleted =
    !!candidate?.street && !!candidate?.zip && !!candidate?.city;

  const [manualAddressSelected, setManualAddress] = useState(
    isAddressAlreadyCompleted,
  );
  const franceId = countries?.find((c) => c.label === "France")?.id;

  const genders = [
    { label: "Madame", value: "woman" },
    { label: "Monsieur", value: "man" },
    { label: "Ne se prononce pas", value: "undisclosed" },
  ];

  const {
    register,
    control,
    setValue,
    reset,
    formState: { errors, isDirty, isSubmitting },
    clearErrors,
    handleSubmit,
  } = useForm<FormCandidateInformationData>({
    resolver: standardSchemaResolver(candidateInformationSchema()),
    defaultValues: {
      firstname: candidate?.firstname,
      lastname: candidate?.lastname,
      givenName: candidate?.givenName ?? "",
      firstname2: candidate?.firstname2 ?? "",
      firstname3: candidate?.firstname3 ?? "",
      middleNames: candidate?.middleNames ?? "",
      gender: (candidate?.gender as GenderEnum) ?? GenderEnum.undisclosed,
      birthCity: candidate?.birthCity ?? "",
      birthdate: candidate?.birthdate ?? "",
      birthDepartment: candidate?.birthDepartment?.id ?? "",
      country: candidate?.country?.id ?? franceId,
      nationality: candidate?.nationality ?? "",
      countryIsFrance: candidate?.country?.id === franceId,
      street: candidate?.street ?? "",
      city: candidate?.city ?? "",
      zip: candidate?.zip ?? "",
      phone: candidate?.phone ?? "",
      email: candidate?.email ?? "",
      addressComplement: candidate?.addressComplement ?? "",
    },
  });

  const country = useWatch({ control, name: "country" });
  const [disabledDepartment, setDisabledDepartment] = useState(
    country !== "France",
  );

  const resetFormData = useCallback(
    (candidate: Candidate) => {
      if (!candidate) return;
      reset({
        firstname: candidate.firstname,
        lastname: candidate.lastname,
        givenName: candidate.givenName ?? "",
        firstname2: candidate.firstname2 ?? "",
        firstname3: candidate.firstname3 ?? "",
        middleNames: candidate.middleNames ?? "",
        birthCity: candidate.birthCity ?? "",
        birthdate: candidate.birthdate ?? "",
        birthDepartment: candidate.birthDepartment?.id ?? "",
        country: candidate.country?.id ?? franceId,
        countryIsFrance: candidate.country?.id === franceId,
        gender: (candidate.gender as GenderEnum) ?? GenderEnum.undisclosed,
        nationality: candidate.nationality ?? "",
        street: candidate.street ?? "",
        city: candidate.city ?? "",
        zip: candidate.zip ?? "",
        phone: candidate.phone ?? "",
        email: candidate.email ?? "",
        addressComplement: candidate.addressComplement ?? "",
      });
    },
    [reset, franceId],
  );
  useEffect(() => {
    resetFormData(candidate as Candidate);
  }, [candidate, resetFormData]);

  useEffect(() => {
    if (country !== franceId) {
      setValue("birthDepartment", "");
      setDisabledDepartment(true);
      setValue("countryIsFrance", false);
      clearErrors("birthDepartment");
    } else {
      setDisabledDepartment(false);
      setValue("countryIsFrance", true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, franceId, setValue, setDisabledDepartment]);

  useEffect(() => {
    setValue("country", candidate?.country?.id ?? franceId);
  }, [franceId, countries, candidate, setValue]);

  const onSubmit = async (data: FormCandidateInformationData) => {
    let firstname2 = data.firstname2;
    let firstname3 = data.firstname3;
    let middleNames = data.middleNames;

    if (isMiddleNamesEnabled) {
      firstname2 = middleNames?.split(" ")[0];
      firstname3 = middleNames?.split(" ")[1];
    } else {
      middleNames = `${firstname2 || ""}${firstname2 ? " " : ""}${firstname3 || ""}`;
    }

    const candidateInformation: CandidateUpdateInformationBySelfInput = {
      firstname: data.firstname,
      firstname2: firstname2,
      firstname3: firstname3,
      middleNames: middleNames,
      lastname: data.lastname,
      givenName: data.givenName,
      birthCity: data.birthCity,
      nationality: data.nationality,
      gender: data.gender as GenderEnum,
      countryId: data.country,
      birthdate: data.birthdate || undefined,
      birthDepartmentId: data.birthDepartment,
      street: data.street,
      zip: data.zip,
      city: data.city,
      phone: data.phone,
      email: data.email,
      addressComplement: data.addressComplement,
    };

    try {
      await updateCandidateInformationMutate({
        candidateInformation,
      });
      successToast("Les informations ont bien été mises à jour");
      router.push("../");
    } catch (e) {
      graphqlErrorToast(e);
    }
  };

  console.log("errors", errors);

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
        data-testid="candidate-information-form"
      >
        <h2 className="mb-0 text-xl font-bold">Informations civiles</h2>
        <div className="flex gap-8">
          <Select
            label="Civilité"
            className="w-full mb-0"
            nativeSelectProps={register("gender")}
            state={errors.gender ? "error" : "default"}
            stateRelatedMessage={errors.gender?.message}
            data-testid="gender-select"
          >
            {genders.map(
              ({ value, label }: { value: string; label: string }) => (
                <option
                  key={value}
                  value={value}
                  data-testid={`gender-option-${value}`}
                >
                  {label}
                </option>
              ),
            )}
          </Select>
          <Input
            label="Nom de naissance"
            className="w-full mb-0"
            disabled={isFCLinked}
            nativeInputProps={register("lastname")}
            state={errors.lastname ? "error" : "default"}
            stateRelatedMessage={errors.lastname?.message}
            data-testid="lastname-input"
          />
          <Input
            label="Nom d'usage (optionnel)"
            className="w-full mb-0"
            nativeInputProps={register("givenName")}
            data-testid="given-name-input"
          />
          {isMiddleNamesEnabled && (
            <Input
              label="Prénom principal"
              className="w-full mb-0"
              disabled={isFCLinked}
              nativeInputProps={register("firstname")}
              state={errors.firstname ? "error" : "default"}
              stateRelatedMessage={errors.firstname?.message}
              data-testid="firstname-input"
            />
          )}
        </div>
        {isMiddleNamesEnabled ? (
          <div className="flex gap-8">
            <Input
              label="Autre(s) prénom(s)"
              hintText="Tous les prénoms remplis sur votre état civil doivent être renseignés en les séparant par des espaces."
              className="w-full mb-0"
              disabled={isFCLinked}
              nativeInputProps={register("middleNames")}
              state={errors.middleNames ? "error" : "default"}
              stateRelatedMessage={errors.middleNames?.message}
              data-testid="middle-names-input"
            />
          </div>
        ) : (
          <div className="flex gap-8">
            <Input
              label="Prénom principal"
              className="w-full mb-0"
              disabled={isFCLinked}
              nativeInputProps={register("firstname")}
              state={errors.firstname ? "error" : "default"}
              stateRelatedMessage={errors.firstname?.message}
              data-testid="firstname-input"
            />
            <Input
              label="Prénom 2 (optionnel)"
              className="w-full mb-0"
              disabled={isFCLinked}
              nativeInputProps={register("firstname2")}
              data-testid="firstname2-input"
            />
            <Input
              label="Prénom 3 (optionnel)"
              className="w-full mb-0"
              disabled={isFCLinked}
              nativeInputProps={register("firstname3")}
              data-testid="firstname3-input"
            />
          </div>
        )}
        <div className="flex gap-8">
          <Input
            label="Date de naissance"
            className="w-full mb-0"
            disabled={isFCLinked}
            nativeInputProps={{
              ...register("birthdate"),
              type: "date",
            }}
            state={errors.birthdate ? "error" : "default"}
            stateRelatedMessage={errors.birthdate?.message}
            data-testid="birthdate-input"
          />
          <Select
            className="w-full mb-0"
            label="Pays de naissance"
            disabled={isFCLinked}
            nativeSelectProps={register("country")}
            state={errors.country ? "error" : "default"}
            stateRelatedMessage={errors.country?.message}
            data-testid="country-select"
          >
            {countries?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
          <Select
            className="w-full mb-0"
            label="Département de naissance"
            disabled={disabledDepartment}
            nativeSelectProps={register("birthDepartment")}
            state={errors.birthDepartment ? "error" : "default"}
            stateRelatedMessage={errors.birthDepartment?.message}
            data-testid="birth-department-select"
          >
            <option value="" disabled hidden>
              Votre département
            </option>
            {departments?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label} ({d.code})
              </option>
            ))}
          </Select>

          <Input
            label="Ville de naissance"
            className="w-full mb-0"
            nativeInputProps={register("birthCity")}
            state={errors.birthCity ? "error" : "default"}
            stateRelatedMessage={errors.birthCity?.message}
            data-testid="birth-city-input"
          />
        </div>
        <div className="flex gap-8">
          <Input
            label="Nationalité"
            className="w-full md:w-1/4 md:pr-6"
            nativeInputProps={register("nationality")}
            state={errors.nationality ? "error" : "default"}
            stateRelatedMessage={errors.nationality?.message}
            data-testid="nationality-input"
          />
        </div>
        <h2 className="mb-0 md:mt-4 text-xl font-bold">
          Informations de contact
        </h2>
        <div className="flex gap-8">
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
              className="w-full flex-1"
              nativeInputProps={register("street")}
              state={errors.street ? "error" : "default"}
              stateRelatedMessage={errors.street?.message}
              data-testid="autocomplete-address-input"
            />
          )}
          <Input
            label="Complément d'adresse (Optionnel)"
            className="w-full flex-1"
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
          className="mb-0 w-fit"
          data-testid="manual-address-checkbox"
        />

        <div className="flex gap-8">
          <Input
            label="Code postal (France uniquement)"
            className="w-full flex-1"
            nativeInputProps={register("zip")}
            state={errors.zip ? "error" : "default"}
            stateRelatedMessage={errors.zip?.message}
            data-testid="zip-input"
          />
          <Input
            label="Ville"
            className="w-full flex-[2]"
            nativeInputProps={register("city")}
            state={errors.city ? "error" : "default"}
            stateRelatedMessage={errors.city?.message}
            data-testid="city-input"
          />
        </div>
        <div className="flex gap-8">
          <Input
            label="Numéro de téléphone"
            className="w-full"
            nativeInputProps={register("phone")}
            state={errors.phone ? "error" : "default"}
            stateRelatedMessage={errors.phone?.message}
            data-testid="phone-input"
          />
          <Input
            label="Adresse électronique"
            className="w-full"
            nativeInputProps={register("email")}
            state={errors.email ? "error" : "default"}
            stateRelatedMessage={errors.email?.message}
            data-testid="email-input"
          />
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

export default CandidateInformationForm;
