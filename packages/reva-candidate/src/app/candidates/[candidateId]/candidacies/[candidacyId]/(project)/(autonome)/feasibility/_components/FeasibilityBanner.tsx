import { Feasibility, FeasibilityHistory } from "@/graphql/generated/types";

import FeasibilityDecisionDisplay from "./FeasibilityDecisionDisplay";

export function FeasibilityBanner({
  feasibility,
}: {
  feasibility: Feasibility;
}) {
  if (!feasibility) {
    return null;
  }
  const feasibilityHistory: FeasibilityHistory[] = feasibility?.history || [];

  if (feasibility.decision) {
    return (
      <FeasibilityDecisionDisplay
        decision={feasibility.decision}
        feasibilityHistory={feasibilityHistory}
        decisionComment={feasibility.decisionComment}
        decisionSentAt={feasibility.decisionSentAt}
        decisionFile={feasibility.decisionFile}
        feasibilityFileSentAt={feasibility.feasibilityFileSentAt}
      />
    );
  }

  return null;
}
