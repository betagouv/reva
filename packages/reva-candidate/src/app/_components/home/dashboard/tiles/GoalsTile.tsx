import Tile from "@codegouvfr/react-dsfr/Tile";

import { IncompleteBadge } from "./IncompleteBadge";

export const GoalsTile = ({
  hasCompletedGoals,
  readOnly,
}: {
  readOnly: boolean;
  hasCompletedGoals: boolean;
}) => (
  <Tile
    data-testid="goals-tile"
    start={!hasCompletedGoals ? <IncompleteBadge /> : undefined}
    desc={hasCompletedGoals && !readOnly ? "Modifier" : undefined}
    title="Objectifs"
    small
    linkProps={{
      href: "./set-goals",
    }}
    imageUrl="/candidat/images/pictograms/conclusion.svg"
  />
);
