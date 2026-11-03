import { fr } from "@codegouvfr/react-dsfr";
import Accordion from "@codegouvfr/react-dsfr/Accordion";
import { useMemo } from "react";

import { EnhancedSectionCard } from "@/components/card/enhanced-section-card/EnhancedSectionCard";

import { Prerequisite } from "@/graphql/generated/types";

export const PrerequisitesSection = ({
  prerequisites,
  prerequisitesPartComplete,
  disabled,
  isEditable,
}: {
  prerequisites?: Prerequisite[] | null;
  prerequisitesPartComplete?: boolean | null;
  disabled: boolean;
  isEditable: boolean;
}) => {
  const prequisitesByStatus = useMemo(() => {
    return {
      acquired: prerequisites?.filter(
        (prerequisite) => prerequisite?.state === "ACQUIRED",
      ),
      inProgress: prerequisites?.filter(
        (prerequisite) => prerequisite?.state === "IN_PROGRESS",
      ),
    };
  }, [prerequisites]);
  const noPrerequisites = !prerequisites?.length;

  return (
    <EnhancedSectionCard
      title="Pré-requis obligatoires"
      titleIconClass="fr-icon-checkbox-circle-fill"
      status={prerequisitesPartComplete ? "COMPLETED" : "TO_COMPLETE"}
      buttonOnClickHref={`./prerequisites`}
      isEditable={isEditable}
      data-testid="prerequisites-section"
    >
      {prerequisitesPartComplete &&
        !disabled &&
        (noPrerequisites ? (
          <p className="sm:ml-10">
            Il n'y a pas de prérequis obligatoires pour cette certification
          </p>
        ) : (
          <div className={`mt-1 ${fr.cx("fr-accordions-group")}`}>
            {!!prequisitesByStatus?.acquired?.length && (
              <Accordion label="Acquis">
                <ul>
                  {prequisitesByStatus?.acquired?.map((prerequisite) => (
                    <li key={prerequisite?.id}>{prerequisite?.label}</li>
                  ))}
                </ul>
              </Accordion>
            )}
            {!!prequisitesByStatus?.inProgress?.length && (
              <Accordion label="En cours">
                <ul>
                  {prequisitesByStatus?.inProgress?.map((prerequisite) => (
                    <li key={prerequisite?.id}>{prerequisite?.label}</li>
                  ))}
                </ul>
              </Accordion>
            )}
          </div>
        ))}
    </EnhancedSectionCard>
  );
};
