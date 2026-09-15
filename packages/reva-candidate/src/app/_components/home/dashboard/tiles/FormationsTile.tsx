import Tile from "@codegouvfr/react-dsfr/Tile";

import { IncompleteBadge } from "./IncompleteBadge";

export const FormationsTile = ({
  hasCompletedFormations,
  readOnly,
  href,
}: {
  readOnly: boolean;
  hasCompletedFormations: boolean;
  href?: string;
}) => {
  const getDesc = () => {
    if (!hasCompletedFormations) return undefined;
    return readOnly ? "Consulter" : "Modifier";
  };

  return (
    <Tile
      data-testid="formations-tile"
      start={!hasCompletedFormations ? <IncompleteBadge /> : undefined}
      desc={getDesc()}
      title="Formations"
      small
      imageSvg
      linkProps={{
        href: href || "./set-formations",
      }}
      imageUrl="/candidat/images/pictograms/school.svg"
      className="h-[200px]"
    />
  );
};
