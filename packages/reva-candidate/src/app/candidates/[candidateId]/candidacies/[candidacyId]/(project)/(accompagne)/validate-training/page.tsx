"use client";

import { Alert } from "@codegouvfr/react-dsfr/Alert";
import Breadcrumb from "@codegouvfr/react-dsfr/Breadcrumb";
import Button from "@codegouvfr/react-dsfr/Button";
import { Checkbox } from "@codegouvfr/react-dsfr/Checkbox";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useReducer } from "react";

import { Panel } from "@/components/layout/Panel";
import { FormOptionalFieldsDisclaimer } from "@/components/legacy/atoms/FormOptionalFieldsDisclaimer/FormOptionalFieldsDisclaimer";
import { graphqlErrorToast } from "@/components/toast/toast";

import { useValidateTraining } from "./validate-training.hooks";

type Condition =
  | "conditionOne"
  | "conditionTwo"
  | "conditionThree"
  | "conditionFour"
  | "conditionFive";

type PageAction =
  | {
      type: "changeCondition";
      payload: {
        condition: Condition;
        checked: boolean;
      };
    }
  | {
      type: "updateCandidacyFundedByFranceVae";
      payload: boolean;
    };

interface PageState {
  conditionOneChecked: boolean;
  conditionTwoChecked: boolean;
  conditionThreeChecked: boolean;
  conditionFourChecked: boolean;
  conditionFiveChecked: boolean;
  allConditionsChecked: boolean;
  candidacyFundedByFranceVae: boolean;
}

type TrainingOptions = { title: string; condition: Condition };

const pageReducer = (state: PageState, action: PageAction) => {
  const newState = { ...state };
  const updateConditionChecked = () => {
    newState.allConditionsChecked = newState.candidacyFundedByFranceVae
      ? newState.conditionOneChecked &&
        newState.conditionTwoChecked &&
        newState.conditionThreeChecked &&
        newState.conditionFourChecked &&
        newState.conditionFiveChecked
      : newState.conditionOneChecked &&
        newState.conditionTwoChecked &&
        newState.conditionFourChecked &&
        newState.conditionFiveChecked;
  };
  switch (action.type) {
    case "changeCondition":
      {
        switch (action.payload.condition) {
          case "conditionOne":
            newState.conditionOneChecked = action.payload.checked;
            break;
          case "conditionTwo":
            newState.conditionTwoChecked = action.payload.checked;
            break;
          case "conditionThree":
            newState.conditionThreeChecked = action.payload.checked;
            break;
          case "conditionFour":
            newState.conditionFourChecked = action.payload.checked;
            break;
          case "conditionFive":
            newState.conditionFiveChecked = action.payload.checked;
            break;
        }
        updateConditionChecked();
      }
      break;
    case "updateCandidacyFundedByFranceVae":
      newState.candidacyFundedByFranceVae = action.payload;
      updateConditionChecked();
      break;
  }
  return newState;
};

export default function ValidateTraining() {
  const router = useRouter();

  const { confirmTrainingForm, candidacy } = useValidateTraining();

  const [pageState, pageDispatch] = useReducer(pageReducer, {
    conditionOneChecked: false,
    conditionTwoChecked: false,
    conditionThreeChecked: false,
    conditionFourChecked: false,
    conditionFiveChecked: false,
    allConditionsChecked: false,
    candidacyFundedByFranceVae: candidacy?.financeModule !== "hors_plateforme",
  });

  useEffect(() => {
    pageDispatch({
      type: "updateCandidacyFundedByFranceVae",
      payload: candidacy?.financeModule !== "hors_plateforme",
    });
  }, [candidacy]);

  if (!candidacy) {
    return null;
  }

  const isCurrentlySubmitted = candidacy.status === "PARCOURS_ENVOYE";

  const isTrainingConfirmed =
    candidacy.candidacyStatuses.findIndex(
      (status) => status.status == "PARCOURS_CONFIRME",
    ) != -1 && !isCurrentlySubmitted;

  const isCandidacyDropOut = !!candidacy.candidacyDropOut;

  const {
    additionalHourCount,
    basicSkills,
    certificateSkills,
    collectiveHourCount,
    individualHourCount,
    mandatoryTrainings,
    otherTraining,
  } = candidacy;

  const onSubmit = async () => {
    try {
      const response = await confirmTrainingForm.mutateAsync();
      if (response) {
        router.push("../");
      }
    } catch (error) {
      graphqlErrorToast(error);
    }
  };

  const checkboxOption = ({ title, condition }: TrainingOptions) => ({
    label: title,
    nativeInputProps: {
      checked: pageState[`${condition}Checked`],
      onChange: (e: ChangeEvent<HTMLInputElement>) => {
        pageDispatch({
          type: "changeCondition",
          payload: {
            condition,
            checked: e.target.checked,
          },
        });
      },
    },
  });

  const trainingOptions: TrainingOptions[] = [
    {
      title:
        "Je comprends qu’il s’agit d’étapes et de prestations nécessaires pour obtenir mon diplôme.",
      condition: "conditionOne",
    },
    {
      title:
        "Je m’engage à suivre ce parcours ou à informer mon accompagnateur de tout abandon dans les 48h.",
      condition: "conditionTwo",
    },
    ...(candidacy.financeModule !== "hors_plateforme"
      ? [
          {
            title:
              "J’ai bien compris que mon accord allait déclencher une demande de prise en charge financière de mon parcours.",
            condition: "conditionThree" as Condition,
          },
        ]
      : []),
    {
      title:
        "J’accepte que les résultats de mon étude personnalisée et les résultats de ma session de jury soient transmis à mon accompagnateur et moi-même.",
      condition: "conditionFour",
    },
    {
      title:
        "Je certifie que je ne suis pas de formation initiale liée à ce diplôme avant et pendant mon parcours VAE.",
      condition: "conditionFive",
    },
  ];

  return (
    <Panel>
      <Breadcrumb
        currentPageLabel={
          isTrainingConfirmed ? "Votre parcours" : "Validation du parcours"
        }
        className="mb-0"
        segments={[
          {
            label: "Ma candidature",
            linkProps: {
              href: "../",
            },
          },
        ]}
      />

      <h1 className="mt-6 mb-4 text-5xl">
        {isTrainingConfirmed ? "Votre parcours" : "Validation du parcours"}
      </h1>
      <FormOptionalFieldsDisclaimer />

      <p className="mb-10">
        Ce parcours a été pensé suite à votre rendez-vous pédagogique. Prenez le
        temps de le consulter et validez-le pour pouvoir commencer votre
        parcours VAE.
      </p>
      <ul
        className="text-dsfrGray-700 list-disc list-inside"
        data-testid="general-informations"
      >
        {candidacy.isCertificationPartial ? (
          <li>Certification visée partiellement</li>
        ) : null}
        <li>Accompagnement individuel: {individualHourCount || 0}h</li>
        <li>Accompagnement collectif: {collectiveHourCount || 0}h</li>
        <li>Formation: {additionalHourCount || 0}h</li>
      </ul>
      {mandatoryTrainings?.length ? (
        <TrainingSection
          title="Formations obligatoires"
          data-testid="mandatory-training-section"
        >
          <ul className="list-disc list-inside">
            {mandatoryTrainings.map((mt) => (
              <li key={mt.id} className="text-dsfrGray-800">
                {mt.label}
              </li>
            ))}
          </ul>
        </TrainingSection>
      ) : null}
      {basicSkills?.length ? (
        <TrainingSection
          title="Savoirs de base"
          data-testid="basic-skills-section"
        >
          <ul className="list-disc list-inside">
            {basicSkills.map((mt) => (
              <li key={mt.id} className="text-dsfrGray-800">
                {mt.label}
              </li>
            ))}
          </ul>
        </TrainingSection>
      ) : null}
      {certificateSkills && (
        <TrainingSection
          title="Bloc de compétences métiers"
          data-testid="certificate-skills-section"
        >
          <p>{certificateSkills}</p>
        </TrainingSection>
      )}
      {otherTraining && (
        <TrainingSection title="Autre" data-testid="other-training-section">
          <p>{otherTraining}</p>
        </TrainingSection>
      )}
      {candidacy.financeModule === "hors_plateforme" && (
        <TrainingSection
          title="Modalités de financement"
          className="flex flex-col gap-4 mb-12"
        >
          <p>
            Ces éléments sont renseignés à titre indicatifs, en l'absence
            d'information un montant approximatif a été renseigné.
          </p>
          <div className="grid grid-cols-[1fr_100px] gap-2">
            {candidacy.candidacyOnCandidacyFinancingMethods.map((fm) => (
              <>
                <div>
                  {fm.candidacyFinancingMethod.label}{" "}
                  {fm.additionalInformation
                    ? ` (${fm.additionalInformation})`
                    : ""}
                </div>
                <div className="font-medium ml-auto">
                  {fm.amount.toFixed(2)} €
                </div>
                <hr className="col-span-full mt-2 pb-2" />
              </>
            ))}
            <div>Montant total du devis que vous avez validé :</div>
            <div className="font-medium ml-auto">
              {candidacy.candidacyOnCandidacyFinancingMethods
                .reduce((acc, fm) => acc + fm.amount, 0)
                .toFixed(2)}{" "}
              €
            </div>
          </div>
        </TrainingSection>
      )}
      {!isTrainingConfirmed && !isCandidacyDropOut && (
        <TrainingValidationForm
          allConditionsChecked={pageState.allConditionsChecked}
          trainingOptions={trainingOptions}
          checkboxOption={checkboxOption}
          onSubmit={onSubmit}
        />
      )}
      {isTrainingConfirmed && (
        <Button priority="secondary" linkProps={{ href: "../" }}>
          Retour
        </Button>
      )}
    </Panel>
  );
}

const TrainingSection = ({
  title,
  children,
  className,
  "data-testid": dataTest,
}: {
  title: string;
  children?: React.ReactNode;
  className?: string;

  "data-testid"?: string;
}) => (
  <section
    className={`text-dsfrGray-800 mt-4 ${className || ""}`}
    data-testid={dataTest}
  >
    <h2 className="text-dsfrGray-800 text-3xl font-bold mb-3">{title} :</h2>
    {children}
  </section>
);

const TrainingValidationForm = ({
  allConditionsChecked,
  trainingOptions,
  checkboxOption,
  onSubmit,
}: {
  allConditionsChecked: boolean;
  trainingOptions: TrainingOptions[];
  checkboxOption: ({ title, condition }: TrainingOptions) => {
    label: string;
    nativeInputProps: {
      checked: boolean;
      onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    };
  };
  onSubmit: () => void;
}) => (
  <div className="flex flex-col gap-12">
    <Checkbox
      data-testid="accept-conditions-checkbox-group"
      className="mb-0"
      legend="Conditions générales"
      options={trainingOptions.map((option) => checkboxOption(option))}
    />
    <Alert
      title="Une fois votre parcours validé, vous ne pourrez plus le changer ! "
      description="Pensez à lire avec attention le parcours proposé par votre accompagnateur. Si cette proposition ne vous satisfait pas, contactez votre accompagnateur avant de valider "
      severity="info"
    />
    <div className="flex justify-between">
      <Button priority="secondary" linkProps={{ href: "../" }}>
        Retour
      </Button>
      <Button
        data-testid="submit-training-program-button"
        className="justify-center w-[100%]  md:w-fit"
        nativeButtonProps={{
          onClick: onSubmit,
        }}
        disabled={!allConditionsChecked}
      >
        Valider
      </Button>
    </div>
  </div>
);
