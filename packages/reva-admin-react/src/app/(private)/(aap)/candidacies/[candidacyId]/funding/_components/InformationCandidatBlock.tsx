import Input from "@codegouvfr/react-dsfr/Input";
import Select from "@codegouvfr/react-dsfr/Select";
import { useFormContext } from "react-hook-form";

import { useFeatureflipping } from "@/components/feature-flipping/featureFlipping";

import { Candidacy } from "@/graphql/generated/types";

const genders = [
  { label: "Madame", value: "woman" },
  { label: "Monsieur", value: "man" },
  { label: "Ne se prononce pas", value: "undisclosed" },
];

export const InformationCandidatBlock = ({
  candidacy,
  isReadOnly,
}: {
  candidacy: Candidacy;
  isReadOnly: boolean;
}) => {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  const { isFeatureActive } = useFeatureflipping();

  const isMiddleNamesEnabled = isFeatureActive("MIDDLE_NAMES");

  return (
    <div className="w-full flex flex-col mt-6">
      <legend>
        <h2 className="text-xl">1. Informations du candidat</h2>
      </legend>
      <fieldset className="grid md:grid-cols-2 gap-x-4 w-full">
        <Input
          label="Nom"
          nativeInputProps={{ value: candidacy?.candidate?.lastname ?? "" }}
          disabled
        />
        <Input
          label="Prénom"
          nativeInputProps={{ value: candidacy?.candidate?.firstname ?? "" }}
          disabled
        />

        {isMiddleNamesEnabled ? (
          <>
            <Input
              label="Autres prénoms (optionnel)"
              nativeInputProps={register("candidateMiddleNames")}
              stateRelatedMessage={
                errors.candidateMiddleNames?.message as string
              }
              state={errors.candidateMiddleNames ? "error" : "default"}
              disabled={isReadOnly}
            />
          </>
        ) : (
          <>
            <Input
              label="2ème prénom (optionnel)"
              nativeInputProps={register("candidateSecondname")}
              stateRelatedMessage={
                errors.candidateSecondname?.message as string
              }
              state={errors.candidateSecondname ? "error" : "default"}
              disabled={isReadOnly}
            />
            <Input
              label="3ème prénom (optionnel)"
              nativeInputProps={register("candidateThirdname")}
              stateRelatedMessage={errors.candidateThirdname?.message as string}
              state={errors.candidateThirdname ? "error" : "default"}
              disabled={isReadOnly}
            />
          </>
        )}

        <Select
          className="w-full"
          label="Civilité"
          nativeSelectProps={register("candidateGender")}
          state={errors.candidateGender ? "error" : "default"}
          stateRelatedMessage={errors.candidateGender?.message as string}
          disabled={isReadOnly}
        >
          {genders.map(({ value, label }: { value: string; label: string }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </fieldset>
    </div>
  );
};
