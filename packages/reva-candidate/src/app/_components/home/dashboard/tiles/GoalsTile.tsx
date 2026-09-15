import Tile from "@codegouvfr/react-dsfr/Tile";

import { IncompleteBadge } from "./IncompleteBadge";

export const GoalsTile = ({
  hasCompletedGoals,
  readOnly,
  href,
}: {
  readOnly: boolean;
  hasCompletedGoals: boolean;
  href?: string;
}) => {
  const getDesc = () => {
    if (!hasCompletedGoals) return undefined;
    return readOnly ? "Consulter" : "Modifier";
  };

  return (
    <Tile
      data-testid="goals-tile"
      start={!hasCompletedGoals ? <IncompleteBadge /> : undefined}
      desc={getDesc()}
      title="Objectifs"
      small
      imageSvg
      linkProps={{
        href: href || "./set-goals",
      }}
      imageUrl="/candidat/images/pictograms/conclusion.svg"
      className="h-[200px]"
    />
  );
};
