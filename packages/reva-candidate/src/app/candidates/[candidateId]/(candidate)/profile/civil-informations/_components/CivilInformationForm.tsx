import Checkbox from "@codegouvfr/react-dsfr/Checkbox";
import Input from "@codegouvfr/react-dsfr/Input";
import { RadioButtons } from "@codegouvfr/react-dsfr/RadioButtons";
import Select from "@codegouvfr/react-dsfr/Select";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { AutocompleteAddress } from "@/components/autocomplete-address/AutocompleteAddress";
import { useFeatureFlipping } from "@/components/feature-flipping/featureFlipping";
import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { graphqlErrorToast, successToast } from "@/components/toast/toast";
import { GenderEnum } from "@/constants/genders.constant";

import { CandidateUpdateInformationBySelfInput } from "@/graphql/generated/graphql";

import {
  FormCivilInformationData,
  civilInformationSchema,
} from "./civilInformationSchema";
import {
  CandidateUseProfile,
  Countries,
  Departments,
  useUpdateCivilInformation,
} from "./useCivilInformation";

export const CivilInformationForm = ({
  candidate,
  countries,
  departments,
  hideBackButton,
  backButtonLabel,
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
  hideResetButton?: boolean;
  submitButtonLabel?: string;
  submitPath?: string;
  forceIsDirty?: boolean;
}) => {
  const { isFeatureActive } = useFeatureFlipping();
  const isMiddleNamesEnabled = isFeatureActive("MIDDLE_NAMES");
  const isBirthPlaceEnabled = isFeatureActive("BIRTH_PLACE");

  const { updateCivilInformationMutate } = useUpdateCivilInformation({
    candidateId: candidate?.id,
  });
  const isFCLinked = candidate?.franceConnectLinked;
  const router = useRouter();

  const franceId = countries?.find((c) => c.isoCode === "FRA")?.id;

  const genders = [
    { label: "Madame", value: "woman" },
    { label: "Monsieur", value: "man" },
    { label: "Ne se prononce pas", value: "undisclosed" },
  ];

  const {
    register,
    control,
    setValue,
    getValues,
    reset,
    formState: { errors, isDirty, isSubmitting },
    clearErrors,
    handleSubmit,
  } = useForm<FormCivilInformationData>({
    resolver: standardSchemaResolver(
      civilInformationSchema({ isBirthPlaceEnabled }),
    ),
    defaultValues: {
      firstname: candidate?.firstname,
      lastname: candidate?.lastname,
      givenName: candidate?.givenName ?? "",
      firstname2: candidate?.firstname2 ?? "",
      firstname3: candidate?.firstname3 ?? "",
      middleNames: candidate?.middleNames ?? "",
      gender: (candidate?.gender as GenderEnum) ?? undefined,
      birthCity: candidate?.birthCity ?? "",
      birthdate: candidate?.birthdate ?? "",
      birthDepartment: candidate?.birthDepartment?.id ?? "",
      country: candidate?.country?.id ?? franceId,
      nationality: candidate?.nationality ?? "",
      countryIsFrance: candidate?.country?.id === franceId,
    },
  });

  const country = useWatch({ control, name: "country" });
  const countryIsFrance = country === franceId;

  const resetFormData = useCallback(
    (candidate: CandidateUseProfile) => {
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
        gender: (candidate.gender as GenderEnum) ?? undefined,
        nationality: candidate.nationality ?? "",
      });
    },
    [reset, franceId],
  );
  useEffect(() => {
    resetFormData(candidate);
  }, [candidate, resetFormData]);

  useEffect(() => {
    if (!countryIsFrance) {
      setValue("birthDepartment", "");
      setValue("countryIsFrance", false);
      clearErrors("birthDepartment");
    } else {
      setValue("countryIsFrance", true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryIsFrance, setValue]);

  useEffect(() => {
    setValue("country", candidate?.country?.id ?? franceId);
  }, [franceId, countries, candidate, setValue]);

  const onSubmit = async (data: FormCivilInformationData) => {
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
      street: candidate?.street ?? "",
      zip: candidate?.zip ?? "",
      city: candidate?.city ?? "",
      phone: candidate?.phone ?? "",
      email: candidate?.email ?? "",
      addressComplement: candidate?.addressComplement ?? "",
    };

    try {
      await updateCivilInformationMutate({
        candidateInformation,
      });
      successToast("Les informations ont bien été mises à jour");
      router.push(submitPath || "../");
    } catch (e) {
      graphqlErrorToast(e);
    }
  };

  const findDepartmentById = useCallback(
    (id: string) => {
      return departments?.find((d) => d.id === id);
    },
    [departments],
  );

  const handleOnAddressSelection = (
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
      setValue("countryIsFrance", false, { shouldDirty: true });
      setValue("country", "", { shouldDirty: true });
      setValue("birthCity", "", { shouldDirty: true });
      setValue("birthDepartment", "", { shouldDirty: true });
    } else {
      setValue("countryIsFrance", true, { shouldDirty: true });
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
          resetFormData(candidate);
        }}
        className="flex flex-col gap-6"
        data-testid="civil-information-form"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 md:gap-6">
          <div className="col-span-3 flex flex-col gap-6">
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                      onOptionSelection={handleOnAddressSelection}
                      className="w-full mb-0"
                      displayMode="birthPlace"
                      defaultSearchText={defaultBirthPlaceDisplayText}
                      state={errors.birthCity ? "error" : "default"}
                      stateRelatedMessage={errors.birthCity?.message}
                    />
                  )}

                  <Checkbox
                    className="mb-0 w-full mt-2 md:mt-12"
                    small
                    options={[
                      {
                        label: "Je suis né(e) à l’étranger",
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  disabled={!countryIsFrance}
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Input
                label="Nationalité"
                className="w-full mb-0"
                nativeInputProps={register("nationality")}
                state={errors.nationality ? "error" : "default"}
                stateRelatedMessage={errors.nationality?.message}
                data-testid="nationality-input"
              />
            </div>
          </div>

          <div className="col-span-1 w-full md:w-auto mt-6 md:mt-0">
            <div className="flex flex-col px-4 pt-6 bg-dsfr-light-decisions-background-background-alt-blue-france">
              <h6>Ressources :</h6>

              {isFCLinked ? (
                <div>
                  <p className="font-bold mb-2">
                    Comment modifier mon état civil ?
                  </p>
                  <p>
                    Les informations d’état civil récupérées via FranceConnect
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
              ) : (
                <div>
                  <p className="font-bold mb-2">
                    Comment renseigner mon état civil ?
                  </p>
                  <p>
                    Toutes les informations doivent être renseignées comme elles
                    apparaissent sur votre carte d’identité ou passeport.
                  </p>
                </div>
              )}

              {!isBirthPlaceEnabled && (
                <div>
                  <p className="font-bold mb-2">Né(e) à l’étranger ? </p>
                  <p>
                    Indiquez le pays et la ville de votre{" "}
                    <strong>lieu de naissance</strong>.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <FormButtons
          backUrl={hideBackButton ? undefined : "../"}
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
