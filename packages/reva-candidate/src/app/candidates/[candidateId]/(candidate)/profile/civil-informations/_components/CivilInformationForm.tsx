import Input from "@codegouvfr/react-dsfr/Input";
import { RadioButtons } from "@codegouvfr/react-dsfr/RadioButtons";
import Select from "@codegouvfr/react-dsfr/Select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";

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
} from "./civilInformationSchema";
import {
  CandidateUseProfile,
  Countries,
  Departments,
  useUpdateCandidateInformation,
} from "./useCivilInformation";

export const CivilInformationForm = ({
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
  const { updateCandidateInformationMutate } = useUpdateCandidateInformation();
  const router = useRouter();

  const franceId = countries?.find((c) => c.label === "France")?.id;

  const genders = [
    { label: "Madame", value: "woman" },
    { label: "Monsieur", value: "man" },
    { label: "Ne se prononce pas", value: "undisclosed" },
  ];

  const {
    register,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty, isSubmitting },
    clearErrors,
    handleSubmit,
  } = useForm<FormCandidateInformationData>({
    resolver: zodResolver(candidateInformationSchema()),
    defaultValues: {
      firstname: candidate?.firstname,
      lastname: candidate?.lastname,
      givenName: candidate?.givenName ?? "",
      firstname2: candidate?.firstname2 ?? "",
      firstname3: candidate?.firstname3 ?? "",
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

  const country = watch("country");
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
        birthCity: candidate.birthCity ?? "",
        birthdate: candidate.birthdate ?? "",
        birthDepartment: candidate.birthDepartment?.id,
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
    const candidateInformation: CandidateUpdateInformationBySelfInput = {
      id: candidate?.id,
      firstname: data.firstname,
      firstname2: data.firstname2,
      firstname3: data.firstname3,
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
      await updateCandidateInformationMutate({
        candidateInformation,
      });
      successToast("Les informations ont bien été mises à jour");
      router.push("../");
    } catch (e) {
      graphqlErrorToast(e);
    }
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
        data-testid="civil-information-form"
      >
        <div className="grid grid-cols-4 gap-6">
          <div className="col-span-3 flex flex-col gap-4">
            <RadioButtons
              className="mb-0"
              legend="Civilité"
              orientation="horizontal"
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

            <div className="flex gap-8">
              <Input
                label="Nom de naissance"
                className="w-full mb-0"
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
            </div>
            <div className="flex gap-8">
              <Input
                label="Prénom principal"
                className="w-full mb-0"
                nativeInputProps={register("firstname")}
                state={errors.firstname ? "error" : "default"}
                stateRelatedMessage={errors.firstname?.message}
                data-testid="firstname-input"
              />
              <Input
                label="Prénom 2 (optionnel)"
                className="w-full mb-0"
                nativeInputProps={register("firstname2")}
                data-testid="firstname2-input"
              />
              <Input
                label="Prénom 3 (optionnel)"
                className="w-full mb-0"
                nativeInputProps={register("firstname3")}
                data-testid="firstname3-input"
              />
            </div>
            <div className="flex gap-8">
              <Input
                label="Date de naissance"
                className="mb-0"
                nativeInputProps={{
                  ...register("birthdate"),
                  type: "date",
                }}
                state={errors.birthdate ? "error" : "default"}
                stateRelatedMessage={errors.birthdate?.message}
                data-testid="birthdate-input"
              />
            </div>

            <div className="flex gap-8">
              <Select
                className="w-full mb-0"
                label="Pays de naissance"
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
          </div>

          <div className="col-span-1">
            <div className="flex flex-col px-4 pt-6 bg-dsfr-light-decisions-background-background-alt-blue-france">
              <h6>Ressources :</h6>
              <div>
                <p className="font-bold mb-2">
                  Comment renseigner mon état civil ?
                </p>
                <p>
                  Toutes les informations doivent être renseignées comme elles
                  apparaissent sur votre carte d’identité ou passeport.
                </p>
              </div>

              <div>
                <p className="font-bold mb-2">Né(e) à l’étranger ? </p>
                <p>Indiquez le pays et la ville de votre lieu de naissance.</p>
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
