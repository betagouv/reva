import { Checkbox } from "@codegouvfr/react-dsfr/Checkbox";
import { Input } from "@codegouvfr/react-dsfr/Input";
import { RadioButtons } from "@codegouvfr/react-dsfr/RadioButtons";
import { Select } from "@codegouvfr/react-dsfr/Select";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { AutocompleteAddress } from "@/components/autocomplete-address/AutocompleteAddress";
import { useFeatureflipping } from "@/components/feature-flipping/featureFlipping";
import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { graphqlErrorToast, successToast } from "@/components/toast/toast";
import { GenderEnum } from "@/constants/genders.constant";

import {
  Candidate,
  CandidateUpdateInformationInput,
} from "@/graphql/generated/graphql";

import {
  FormCandidateInformationData,
  candidateInformationSchema,
} from "./candidateInformationSchema";
import {
  Candidacy,
  Countries,
  Departments,
  useUpdateCandidateInformation,
} from "./useCandidateInformation";

const CandidateInformationForm = ({
  candidacyId,
  candidacy,
  countries,
  departments,
}: {
  candidacyId: string;
  candidacy?: Candidacy;
  countries?: Countries;
  departments?: Departments;
}) => {
  const backUrl = `/candidacies/${candidacyId}/summary`;
  const router = useRouter();

  const { isFeatureActive } = useFeatureflipping();
  const isMiddleNamesEnabled = isFeatureActive("MIDDLE_NAMES");
  const isBirthPlaceEnabled = isFeatureActive("BIRTH_PLACE");

  const { updateCandidateInformationMutate } =
    useUpdateCandidateInformation(candidacyId);

  const candidate = candidacy?.candidate;
  const isFCLinked = candidate?.franceConnectLinked;

  const [manualAddressSelected, setManualAddress] = useState(false);
  const franceId = countries?.find((c) => c.isoCode === "FRA")?.id;

  const genders = [
    { label: "Madame", value: "woman" },
    { label: "Monsieur", value: "man" },
    { label: "Ne se prononce pas", value: "undisclosed" },
  ];

  const {
    register,
    watch,
    setValue,
    getValues,
    reset,
    formState: { errors, isDirty, isSubmitting },
    clearErrors,
    handleSubmit,
  } = useForm<FormCandidateInformationData>({
    resolver: standardSchemaResolver(
      candidateInformationSchema({ isBirthPlaceEnabled }),
    ),
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
      addressComplement: candidate?.addressComplement ?? "",
    },
  });

  const country = watch("country");
  const [disabledDepartment, setDisabledDepartment] = useState(
    country !== "France",
  );

  const resetFormData = useCallback(
    (candidate: Candidate, candidacy: Candidacy) => {
      if (!candidacy || !candidate) return;
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
        street: candidate?.street ?? "",
        city: candidate?.city ?? "",
        zip: candidate?.zip ?? "",
        addressComplement: candidate?.addressComplement ?? "",
      });
    },
    [reset, franceId],
  );
  useEffect(() => {
    resetFormData(candidate as Candidate, candidacy as Candidacy);
  }, [candidate, candidacy, resetFormData]);

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
    setValue("country", candidacy?.candidate?.country?.id ?? franceId);
  }, [franceId, countries, candidacy, setValue]);

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

    const candidateInformation: CandidateUpdateInformationInput = {
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
      birthdate: data.birthdate,
      birthDepartmentId: data.birthDepartment,
      street: data.street,
      zip: data.zip,
      city: data.city,
      addressComplement: data.addressComplement,
      //form does not update phone and email anymore, so we keep the old values
      phone: candidate?.phone ?? "",
      email: candidate?.email ?? "",
    };

    try {
      await updateCandidateInformationMutate({
        candidateInformation,
      });
      successToast("Les informations ont bien été mises à jour");

      router.push(backUrl);
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

  const findDepartmentById = useCallback(
    (id: string) => {
      return departments?.find((d) => d.id === id);
    },
    [departments],
  );

  const handleOnBirthPlaceSelection = (
    {
      city,
    }: {
      city: string;
    },
    department?: { id: string; code: string; label: string },
  ) => {
    setValue("birthCity", city, { shouldDirty: true });
    setValue("birthDepartment", department?.id ?? "", { shouldDirty: true });
  };

  const [birthPlaceIsForeign, setBirthPlaceIsForeign] = useState(false);

  useEffect(() => {
    setBirthPlaceIsForeign(candidate?.country?.id !== franceId);
  }, [candidate?.country?.id, franceId]);

  const handleToggleBirthPlaceIsForeign = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const isForeign = e.target.checked;
    setBirthPlaceIsForeign(isForeign);
    if (isForeign) {
      setValue("country", "", { shouldDirty: true });
      setValue("birthCity", "", { shouldDirty: true });
      setValue("birthDepartment", "", { shouldDirty: true });
    } else {
      setValue("country", franceId, {
        shouldDirty: true,
      });
      setValue("birthCity", candidate?.birthCity ?? "", { shouldDirty: true });
      setValue("birthDepartment", candidate?.birthDepartment?.id ?? "", {
        shouldDirty: true,
      });
    }
  };

  const defaultBirthPlaceDisplayText = useMemo(() => {
    let text = "";

    if (getValues("birthCity")) {
      text = getValues("birthCity");
    }

    const birthDepartmentCode = findDepartmentById(
      getValues("birthDepartment"),
    )?.code;

    if (birthDepartmentCode) {
      text = `${text ? `${text} ` : ""}(${birthDepartmentCode})`;
    }
    return text;
  }, [getValues, findDepartmentById]);

  return (
    <>
      <form
        onSubmit={handleSubmit(onSubmit, (e) => console.log(e))}
        onReset={(e) => {
          e.preventDefault();
          resetFormData(candidate as Candidate, candidacy as Candidacy);
        }}
        className="flex flex-col gap-6"
      >
        <h6 className="mb-0 text-xl font-bold">Informations civiles</h6>
        <RadioButtons
          className="mb-0 w-full"
          legend="Civilité"
          orientation="horizontal"
          small
          options={genders.map((gender) => ({
            label: gender.label,
            nativeInputProps: {
              ...register("gender"),
              value: gender.value,
            },
          }))}
          state={errors.gender ? "error" : "default"}
          stateRelatedMessage={errors.gender?.message}
        />

        <div className="grid grid-cols-3 gap-6">
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
          <div className="flex gap-6">
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
          <div className="grid grid-cols-3 gap-6">
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
        <div className="grid grid-cols-3 gap-6">
          <Input
            label="Date de naissance"
            className="mb-0"
            disabled={isFCLinked}
            nativeInputProps={{
              ...register("birthdate"),
              type: "date",
            }}
            state={errors.birthdate ? "error" : "default"}
            stateRelatedMessage={errors.birthdate?.message}
            data-testid="birthdate-input"
          />

          {isBirthPlaceEnabled && (
            <>
              {birthPlaceIsForeign ? (
                <Select
                  className="w-full mb-0"
                  label="Pays de naissance"
                  disabled={isFCLinked}
                  nativeSelectProps={register("country")}
                  state={errors.country ? "error" : "default"}
                  stateRelatedMessage={errors.country?.message}
                  data-testid="country-select"
                >
                  {(countries || [])
                    .filter((c) => c.isoCode !== "FRA")
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                </Select>
              ) : (
                <AutocompleteAddress
                  label="Lieu de naissance"
                  onOptionSelection={handleOnBirthPlaceSelection}
                  className="w-full mb-0"
                  displayMode="municipality"
                  value={defaultBirthPlaceDisplayText}
                  state={errors.birthCity ? "error" : "default"}
                  stateRelatedMessage={errors.birthCity?.message}
                />
              )}

              <Checkbox
                className="mb-0 w-full mt-12"
                small
                options={[
                  {
                    label: "Né(e) à l’étranger",
                    nativeInputProps: {
                      checked: birthPlaceIsForeign,
                      onChange: handleToggleBirthPlaceIsForeign,
                      disabled: isFCLinked,
                    },
                  },
                ]}
              />
            </>
          )}
        </div>

        {!isBirthPlaceEnabled && (
          <div className="grid grid-cols-3 gap-6">
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
        )}

        <div className="grid grid-cols-3 gap-6">
          <Input
            label="Nationalité"
            className="w-full mb-0"
            nativeInputProps={register("nationality")}
            state={errors.nationality ? "error" : "default"}
            stateRelatedMessage={errors.nationality?.message}
            data-testid="nationality-input"
          />
        </div>
        <h6 className="mb-0 md:mt-4 text-xl font-bold">
          Informations de contact
        </h6>
        <div className="grid grid-cols-3 gap-6 items-end">
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
              value={`${getValues("street")} ${getValues("zip")} ${getValues("city")}`}
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
          <div className="grid grid-cols-3 gap-6 items-end">
            <div className="flex flex-row gap-6 col-span-2">
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
        <FormButtons backUrl={backUrl} formState={{ isDirty, isSubmitting }} />
      </form>
    </>
  );
};

export default CandidateInformationForm;
