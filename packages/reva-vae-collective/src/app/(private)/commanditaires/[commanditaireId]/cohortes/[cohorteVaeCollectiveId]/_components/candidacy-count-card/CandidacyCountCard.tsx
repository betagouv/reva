import Tag from "@codegouvfr/react-dsfr/Tag";
import { Tile } from "@codegouvfr/react-dsfr/Tile";

export const CandidacyCountCard = ({
  candidacyCount,
  candidaturesHref,
}: {
  candidacyCount: number;
  candidaturesHref: string;
}) => {
  if (candidacyCount === 0) {
    return (
      <div className="mt-8" data-testid="candidacy-count-card">
        <Tile
          small
          imageSvg
          imageUrl="/vae-collective/cohorts/pictograms/presse-card.svg"
          orientation="horizontal"
          start={<Tag>Aucune candidature</Tag>}
          title="Candidatures en cours sur cette cohorte"
          titleAs="h3"
          classes={{ content: "p-0" }}
        />
      </div>
    );
  }

  return (
    <div className="mt-8" data-testid="candidacy-count-card">
      <Tile
        small
        enlargeLinkOrButton
        imageSvg
        imageUrl="/vae-collective/cohorts/pictograms/presse-card.svg"
        linkProps={{
          href: candidaturesHref,
        }}
        orientation="horizontal"
        start={<Tag>{`${candidacyCount} candidatures`}</Tag>}
        title="Candidatures en cours sur cette cohorte"
        titleAs="h3"
        detail={<span className="text-sm text-gray-500">Consulter</span>}
      />
    </div>
  );
};
