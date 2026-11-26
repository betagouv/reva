"use client";

import Tag from "@codegouvfr/react-dsfr/Tag";
import Tile from "@codegouvfr/react-dsfr/Tile";
import { useParams } from "next/navigation";

export const DateAndSubmissionTiles = ({
  readyForJuryEstimatedAt,
}: {
  readyForJuryEstimatedAt?: string | null;
}) => {
  const { candidacyId } = useParams<{ candidacyId: string }>();
  const basePath = `/candidacies/${candidacyId}/dossier-de-validation-aap-v2`;

  return (
    <div className="flex flex-col sm:flex-row gap-4 lg:h-80 max-h-full">
      <Tile
        start={
          readyForJuryEstimatedAt ? (
            <Tag>{readyForJuryEstimatedAt}</Tag>
          ) : undefined
        }
        title={
          readyForJuryEstimatedAt
            ? "Date prévisionnelle"
            : "Renseigner une date prévisionnelle"
        }
        desc={
          readyForJuryEstimatedAt
            ? undefined
            : "Cette date est une estimation et permet au certificateur d'anticiper l'organisation du passage devant le jury."
        }
        detail={readyForJuryEstimatedAt ? "Modifier" : undefined}
        imageUrl="/admin2/images/pictograms/calendar.svg"
        className="basis-1/2"
        linkProps={{ href: `${basePath}/date-previsionnelle` }}
        classes={{
          img: "mb-0",
          detail: "mt-0",
        }}
      />
      <Tile
        title="Déposer un dossier de validation"
        desc="Un aménagement spécifique pour le passage devant le jury peut être demandé en même temps que le dépôt du dossier."
        imageUrl="/admin2/images/pictograms/document-download.svg"
        className="basis-1/2"
        linkProps={{ href: `${basePath}/depot-dv` }}
        classes={{
          img: "mb-0",
        }}
      />
    </div>
  );
};
