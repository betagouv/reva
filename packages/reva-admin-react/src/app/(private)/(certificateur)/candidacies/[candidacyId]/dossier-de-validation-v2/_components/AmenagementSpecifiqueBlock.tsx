import { useEffect, useRef, useState } from "react";

import { FancyPreview } from "@/components/fancy-preview/FancyPreview";

interface Props {
  description: string;
  justificatif?: {
    name: string;
    url: string;
    previewUrl?: string | null;
  } | null;
}

export const AmenagementSpecifiqueBlock = ({
  description,
  justificatif,
}: Props) => {
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);

  // calcule si le texte de l'aménagement spécifique est trop long
  useEffect(() => {
    const descriptionElement = descriptionRef.current;
    if (!descriptionElement || isDescriptionExpanded) {
      return;
    }

    const resizeObserver = new ResizeObserver(() =>
      setIsOverflowing(
        descriptionElement.scrollHeight > descriptionElement.clientHeight,
      ),
    );
    resizeObserver.observe(descriptionElement);

    return () => resizeObserver.disconnect();
  }, [description, isDescriptionExpanded]);

  return (
    <div
      className="flex flex-col gap-4 p-4 bg-white border border-dsfr-light-decisions-border-border-default-grey shadow-[0_2px_6px_rgba(0,0,18,0.16)]"
      data-testid="amenagement-specifique-block"
    >
      <p className="font-bold mb-0">
        Demande d’aménagement pour le passage devant le jury :
      </p>
      <div className="flex flex-col items-start">
        <p
          ref={descriptionRef}
          className={`mb-0 whitespace-pre-line ${isDescriptionExpanded ? "" : "line-clamp-4"}`}
        >
          {description}
        </p>
        {isOverflowing && (
          <button
            type="button"
            className="fr-link"
            aria-expanded={isDescriptionExpanded}
            onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
          >
            {isDescriptionExpanded ? "En voir moins" : "En voir plus"}
          </button>
        )}
      </div>
      {justificatif?.previewUrl && (
        <div>
          <FancyPreview
            key={justificatif.url}
            defaultDisplay={false}
            name={justificatif.name}
            src={justificatif.previewUrl}
            title="Justificatif"
          />
        </div>
      )}
    </div>
  );
};
