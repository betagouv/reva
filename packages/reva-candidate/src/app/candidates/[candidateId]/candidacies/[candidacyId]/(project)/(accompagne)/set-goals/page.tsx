"use client";

import Breadcrumb from "@codegouvfr/react-dsfr/Breadcrumb";
import { Checkbox } from "@codegouvfr/react-dsfr/Checkbox";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { Panel } from "@/components/layout/Panel";
import { FormOptionalFieldsDisclaimer } from "@/components/legacy/atoms/FormOptionalFieldsDisclaimer/FormOptionalFieldsDisclaimer";
import { graphqlErrorToast } from "@/components/toast/toast";

import { useSetGoals } from "./set-goals.hooks";

export default function SetGoals() {
  const router = useRouter();

  const { getGoals, updateGoals, canEditCandidacy, candidacy } = useSetGoals();

  const formShouldBeDisabled = !canEditCandidacy;
  const goals = getGoals.data?.getReferential.goals || [];

  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>(
    candidacy?.goals.map((goal) => goal.id) || [],
  );

  console.log("formShouldBeDisabled", formShouldBeDisabled);

  useEffect(() => {
    setSelectedGoalIds(candidacy?.goals.map((goal) => goal.id) || []);
  }, [candidacy?.goals]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggle = (goalId: string) => {
    const filteredGoals = selectedGoalIds.filter((id) => id != goalId);

    if (filteredGoals.length == selectedGoalIds.length) {
      setSelectedGoalIds([...selectedGoalIds, goalId]);
    } else {
      setSelectedGoalIds(filteredGoals);
    }
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!candidacy?.id) {
      return;
    }

    try {
      setIsSubmitting(true);
      await updateGoals.mutateAsync({
        candidacyId: candidacy.id,
        goals: selectedGoalIds.map((goalId) => ({ goalId })),
      });
      router.push("../");
    } catch (error) {
      graphqlErrorToast(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Panel>
      <Breadcrumb
        currentPageLabel="Mes objectifs"
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
      <h1 className="mt-4 mb-0">Mes objectifs</h1>
      <FormOptionalFieldsDisclaimer className="mb-12" />
      <form onSubmit={onSubmit} className="flex flex-col">
        <Checkbox
          className="w-full"
          small
          legend="Choisir les objectifs qui motivent le passage de la VAE"
          hintText="Plusieurs choix possibles"
          disabled={formShouldBeDisabled}
          options={goals.map((goal) => ({
            label: goal.label,
            nativeInputProps: {
              checked: selectedGoalIds.indexOf(goal.id) != -1,
              onChange: () => {
                toggle(goal.id);
              },
            },
          }))}
        />
        <FormButtons
          className="mt-6"
          hideResetButton
          formState={{
            canSubmit: !formShouldBeDisabled,
            isSubmitting,
          }}
          backUrl="../"
        />
      </form>
    </Panel>
  );
}
