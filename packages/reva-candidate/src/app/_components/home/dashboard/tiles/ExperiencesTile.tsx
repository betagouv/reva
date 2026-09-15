import Tile from "@codegouvfr/react-dsfr/Tile";

import { ExperiencesUseCandidateForDashboard } from "../dashboard.hooks";

import { IncompleteBadge } from "./IncompleteBadge";

export const ExperiencesTile = ({
  experiences,
  readOnly,
  href,
}: {
  experiences: ExperiencesUseCandidateForDashboard;
  readOnly: boolean;
  href?: string;
}) => {
  const hasExperiences = experiences.length > 0;

  const getDesc = () => {
    if (!hasExperiences) return undefined;
    return readOnly ? "Consulter" : "Modifier";
  };

  return (
    <Tile
      data-testid="experiences-tile"
      start={!hasExperiences ? <IncompleteBadge /> : undefined}
      desc={getDesc()}
      title="Expériences"
      small
      imageSvg
      linkProps={{
        href: href || "./experiences",
      }}
      imageUrl="/candidat/images/pictograms/culture.svg"
      className="h-[200px]"
    />
  );
};
