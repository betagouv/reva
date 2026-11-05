import Input from "@codegouvfr/react-dsfr/Input";
import { useMemo } from "react";
import { useFormContext } from "react-hook-form";

import { Candidacy } from "@/graphql/generated/types";

export const ParcoursPersonnaliseBlock = ({
  candidacy,
  isReadOnly,
  isForfaitOnly,
}: {
  candidacy: Candidacy;
  isReadOnly: boolean;
  isForfaitOnly: boolean;
}) => {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext();

  const forfaitCost = useMemo(() => {
    return candidacy?.feasibility?.decision === "REJECTED" ? 200 : 300;
  }, [candidacy]);
  const individualHourCount = watch("individualHourCount") || 0;
  const individualCost = watch("individualCost") || 0;
  const collectiveHourCount = watch("collectiveHourCount") || 0;
  const collectiveCost = watch("collectiveCost") || 0;
  const accompagnementCost =
    individualHourCount * individualCost + collectiveHourCount * collectiveCost;
  const accompagnementHourCount = individualHourCount + collectiveHourCount;
  const mandatoryTrainingsHourCount = watch("mandatoryTrainingsHourCount") || 0;
  const mandatoryTrainingsCost = watch("mandatoryTrainingsCost") || 0;
  const basicSkillsHourCount = watch("basicSkillsHourCount") || 0;
  const basicSkillsCost = watch("basicSkillsCost") || 0;
  const certificateSkillsHourCount = watch("certificateSkillsHourCount") || 0;
  const certificateSkillsCost = watch("certificateSkillsCost") || 0;
  const otherTrainingHourCount = watch("otherTrainingHourCount") || 0;
  const otherTrainingCost = watch("otherTrainingCost") || 0;
  const complementsFormatifsHourCount =
    mandatoryTrainingsHourCount +
    basicSkillsHourCount +
    certificateSkillsHourCount +
    otherTrainingHourCount;
  const complementsFormatifsCost =
    mandatoryTrainingsCost * mandatoryTrainingsHourCount +
    basicSkillsCost * basicSkillsHourCount +
    certificateSkillsCost * certificateSkillsHourCount +
    otherTrainingCost * otherTrainingHourCount;

  const totalHourCount =
    accompagnementHourCount + complementsFormatifsHourCount;
  const totalCost = forfaitCost + accompagnementCost + complementsFormatifsCost;

  return (
    <div className="w-full">
      <legend>
        <h2 className="text-xl">3. Parcours personnalisé</h2>
      </legend>

      <div className="grid grid-cols-[1fr_250px] gap-y-2">
        <span />
        <span>Forfait</span>
        <span className="font-medium">Forfait d’étude de faisabilité</span>
        <span className="font-medium">200€ net</span>
        {candidacy.feasibility?.decision !== "REJECTED" && (
          <>
            <span className="font-medium">Forfait entretien post-jury</span>
            <span className="font-medium">100€ net</span>
          </>
        )}
        <p className="flex text-dsfr-orange-500 mt-4 col-span-2 text-sm">
          <span className="fr-icon-warning-fill fr-icon--sm mr-1" aria-hidden />
          Le forfait de faisabilité ne pourra être demandé que si l’étude a été
          réalisée dans sa totalité.
        </p>
      </div>

      {!isForfaitOnly && (
        <>
          <h3 className="text-lg">Accompagnement (optionnel)</h3>
          <fieldset className="flex flex-col w-full border-[1px] border-default-grey rounded-lg py-5">
            <div className="flex flex-col md:flex-row gap-4 justify-between px-5">
              <h4 className="text-base flex-1 font-normal">Individuel</h4>
              <Input
                className="flex-1"
                label="Nombre d'heures"
                hintText="Exemple: saisir 2.5 pour 2H30"
                nativeInputProps={{
                  ...register("individualHourCount", { valueAsNumber: true }),
                  type: "number",
                  min: 0,
                  step: 0.1,
                }}
                stateRelatedMessage={
                  errors.individualHourCount?.message as string
                }
                state={errors.individualHourCount ? "error" : "default"}
                disabled={isReadOnly}
              />
              <Input
                className="flex-1"
                label="Coût horaire"
                hintText="Un décimal supérieur ou égal à 0"
                nativeInputProps={{
                  ...register("individualCost", { valueAsNumber: true }),
                  type: "number",
                  min: 0,
                  step: 0.01,
                }}
                stateRelatedMessage={errors.individualCost?.message as string}
                state={errors.individualCost ? "error" : "default"}
                disabled={isReadOnly}
              />
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-between border-[1px] border-l-0 border-r-0 border-default-grey px-5 pt-6">
              <h4 className="text-base flex-1 font-normal">Collectif</h4>
              <Input
                className="flex-1"
                label="Nombre d'heures"
                hintText="Exemple: saisir 2.5 pour 2H30"
                nativeInputProps={{
                  ...register("collectiveHourCount", { valueAsNumber: true }),
                  type: "number",
                  min: 0,
                  step: 0.1,
                }}
                stateRelatedMessage={
                  errors.collectiveHourCount?.message as string
                }
                state={errors.collectiveHourCount ? "error" : "default"}
                disabled={isReadOnly}
              />
              <Input
                className="flex-1"
                label="Coût horaire"
                hintText="Un décimal supérieur ou égal à 0"
                nativeInputProps={{
                  ...register("collectiveCost", { valueAsNumber: true }),
                  type: "number",
                  min: 0,
                  step: 0.01,
                }}
                stateRelatedMessage={errors.collectiveCost?.message as string}
                state={errors.collectiveCost ? "error" : "default"}
                disabled={isReadOnly}
              />
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-between px-5 pt-6">
              <p className="flex-1 m-0">Sous-total des accompagnements</p>
              <p className="flex-1 m-0">{accompagnementHourCount} h</p>
              <p className="flex-1 m-0">{accompagnementCost.toFixed(2)} €</p>
            </div>
          </fieldset>

          <h3 className="text-lg my-6">Compléments formatifs</h3>
          <fieldset className="flex flex-col w-full border-[1px] border-b-0 border-default-grey rounded-tr-lg rounded-tl-lg pt-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between px-5">
              <div className="flex-1">
                <h4 className="text-base font-normal pb-1">
                  Formation obligatoire
                </h4>
                <div className="overflow-y-auto max-h-[200px]">
                  {candidacy?.mandatoryTrainings?.map((training) => (
                    <p
                      key={training.id}
                      className="my-1 fr-tag fr-tag--sm mr-1"
                    >
                      {training.label}
                    </p>
                  ))}
                </div>
              </div>
              <Input
                className="flex-1"
                label="Nombre d'heures"
                hintText="Exemple: saisir 2.5 pour 2H30"
                nativeInputProps={{
                  ...register("mandatoryTrainingsHourCount", {
                    valueAsNumber: true,
                  }),
                  type: "number",
                  min: 0,
                  step: 0.1,
                }}
                stateRelatedMessage={
                  errors.mandatoryTrainingsHourCount?.message as string
                }
                state={errors.mandatoryTrainingsHourCount ? "error" : "default"}
                disabled={isReadOnly}
              />
              <Input
                className="flex-1"
                label="Coût horaire"
                hintText="Un décimal supérieur ou égal à 0"
                nativeInputProps={{
                  ...register("mandatoryTrainingsCost", {
                    valueAsNumber: true,
                  }),
                  type: "number",
                  min: 0,
                  step: 0.01,
                }}
                stateRelatedMessage={
                  errors.mandatoryTrainingsCost?.message as string
                }
                state={errors.mandatoryTrainingsCost ? "error" : "default"}
                disabled={isReadOnly}
              />
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-between border-[1px] border-l-0 border-r-0 border-default-grey px-5 pt-4">
              <div className="flex-1">
                <h4 className="text-base font-normal pb-1">Savoir de base</h4>
                <div className="overflow-y-auto max-h-[200px]">
                  {candidacy?.basicSkills?.map((skill) => (
                    <p key={skill.id} className="my-1 fr-tag fr-tag--sm mr-1">
                      {skill.label}
                    </p>
                  ))}
                </div>
              </div>
              <Input
                className="flex-1"
                label="Nombre d'heures"
                hintText="Exemple: saisir 2.5 pour 2H30"
                nativeInputProps={{
                  ...register("basicSkillsHourCount", { valueAsNumber: true }),
                  type: "number",
                  min: 0,
                  step: 0.1,
                }}
                stateRelatedMessage={
                  errors.basicSkillsHourCount?.message as string
                }
                state={errors.basicSkillsHourCount ? "error" : "default"}
                disabled={isReadOnly}
              />
              <Input
                className="flex-1"
                label="Coût horaire"
                hintText="Un décimal supérieur ou égal à 0"
                nativeInputProps={{
                  ...register("basicSkillsCost", { valueAsNumber: true }),
                  type: "number",
                  min: 0,
                  step: 0.01,
                }}
                stateRelatedMessage={errors.basicSkillsCost?.message as string}
                state={errors.basicSkillsCost ? "error" : "default"}
                disabled={isReadOnly}
              />
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-between border-b-[1px] border-default-grey px-5 pt-2">
              <div className="flex-1">
                <h4 className="text-base font-normal pb-1">
                  Bloc de compétences
                </h4>
                <p className="m-0 text-sm text-gray-500">
                  {candidacy?.certificateSkills}
                </p>
              </div>
              <Input
                className="flex-1"
                label="Nombre d'heures"
                hintText="Exemple: saisir 2.5 pour 2H30"
                nativeInputProps={{
                  ...register("certificateSkillsHourCount", {
                    valueAsNumber: true,
                  }),
                  type: "number",
                  min: 0,
                  step: 0.1,
                }}
                stateRelatedMessage={
                  errors.certificateSkillsHourCount?.message as string
                }
                state={errors.certificateSkillsHourCount ? "error" : "default"}
                disabled={isReadOnly}
              />
              <Input
                className="flex-1"
                label="Coût horaire"
                hintText="Un décimal supérieur ou égal à 0"
                nativeInputProps={{
                  ...register("certificateSkillsCost", { valueAsNumber: true }),
                  type: "number",
                  min: 0,
                  step: 0.01,
                }}
                stateRelatedMessage={
                  errors.certificateSkillsCost?.message as string
                }
                state={errors.certificateSkillsCost ? "error" : "default"}
                disabled={isReadOnly}
              />
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-between px-5 pt-2">
              <div className="flex-1">
                <h4 className="text-base font-normal pb-1">Autres</h4>
                <p className="m-0 text-sm text-gray-500">
                  {candidacy?.otherTraining}
                </p>
              </div>
              <Input
                className="flex-1"
                label="Nombre d'heures"
                hintText="Exemple: saisir 2.5 pour 2H30"
                nativeInputProps={{
                  ...register("otherTrainingHourCount", {
                    valueAsNumber: true,
                  }),
                  type: "number",
                  min: 0,
                  step: 0.1,
                }}
                stateRelatedMessage={
                  errors.otherTrainingHourCount?.message as string
                }
                state={errors.otherTrainingHourCount ? "error" : "default"}
                disabled={isReadOnly}
              />
              <Input
                className="flex-1"
                label="Coût horaire"
                hintText="Un décimal supérieur ou égal à 0"
                nativeInputProps={{
                  ...register("otherTrainingCost", { valueAsNumber: true }),
                  type: "number",
                  min: 0,
                  step: 0.01,
                }}
                stateRelatedMessage={
                  errors.otherTrainingCost?.message as string
                }
                state={errors.otherTrainingCost ? "error" : "default"}
                disabled={isReadOnly}
              />
            </div>
          </fieldset>

          <div className="flex flex-col md:flex-row gap-4 justify-between border-[1px] border-default-grey rounded-br-lg rounded-bl-lg px-5 pt-6">
            <p className="flex-1">Sous-total des compléments formatifs</p>
            <p className="flex-1">{complementsFormatifsHourCount} h</p>
            <p className="flex-1">{complementsFormatifsCost.toFixed(2)} €</p>
          </div>

          <div className="flex flex-col md:flex-row gap-4 justify-between pt-6 px-5">
            <p className="flex-1 m-0 text-lg font-bold">Total</p>
            <p className="flex-1 m-0">{totalHourCount} h</p>
            <p className="flex-1 m-0">{totalCost.toFixed(2)} €</p>
          </div>
        </>
      )}
    </div>
  );
};
