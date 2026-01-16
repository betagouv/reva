import Tile from "@codegouvfr/react-dsfr/Tile";

import { ExperiencesUseCandidateForDashboard } from "../dashboard.hooks";

import { IncompleteBadge } from "./IncompleteBadge";

export const ExperiencesTile = ({
  experiences,
  readOnly,
}: {
  experiences: ExperiencesUseCandidateForDashboard;
  readOnly: boolean;
}) => {
  const hasExperiences = experiences.length > 0;
  const canModifyExperiences = hasExperiences && !readOnly;

  return (
    <Tile
      data-testid="experiences-tile"
      start={!hasExperiences ? <IncompleteBadge /> : undefined}
      desc={canModifyExperiences ? "Modifier" : undefined}
      title="Expériences"
      small
      linkProps={{
        href: "./experiences",
      }}
      imageUrl="/candidat/images/pictograms/culture.svg"
    />
  );
};
