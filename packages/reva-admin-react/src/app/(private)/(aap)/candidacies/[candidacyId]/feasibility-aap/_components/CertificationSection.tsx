import { useParams } from "next/navigation";

import { EnhancedSectionCard } from "@/components/card/enhanced-section-card/EnhancedSectionCard";

import {
  Certification,
  DematerializedFeasibilityFile,
} from "@/graphql/generated/types";

export const CertificationSection = ({
  isFeasibilityEditable,
  dematerializedFeasibilityFile,
  certification,
  isCertificationPartial,
}: {
  isFeasibilityEditable: boolean;
  dematerializedFeasibilityFile: DematerializedFeasibilityFile;
  certification: Certification;
  isCertificationPartial: boolean;
}) => {
  const { candidacyId } = useParams();
  return (
    <EnhancedSectionCard
      title="Certification visée"
      titleIconClass="fr-icon-award-fill"
      isEditable={isFeasibilityEditable}
      status={
        dematerializedFeasibilityFile?.certificationPartComplete
          ? "COMPLETED"
          : "TO_COMPLETE"
      }
      buttonOnClickHref={`/candidacies/${candidacyId}/feasibility-aap/certification`}
      data-testid="certification-section"
    >
      <p className="text-xl font-bold mb-2">{certification?.label}</p>
      <p className="text-xs mb-2 text-dsfr-light-text-mention-grey">
        RNCP {certification?.codeRncp}
      </p>
      {dematerializedFeasibilityFile?.option && (
        <p>
          Option ou parcours :{" "}
          <span className="block font-medium">
            {dematerializedFeasibilityFile?.option}
          </span>
        </p>
      )}
      <div className="flex flew-col gap-12">
        {dematerializedFeasibilityFile?.firstForeignLanguage && (
          <p>
            Langue vivante 1 :{" "}
            <span className="block font-medium">
              {dematerializedFeasibilityFile?.firstForeignLanguage}
            </span>
          </p>
        )}
        {dematerializedFeasibilityFile?.secondForeignLanguage && (
          <p>
            Langue vivante 2 :{" "}
            <span className="block font-medium">
              {dematerializedFeasibilityFile?.secondForeignLanguage}
            </span>
          </p>
        )}
      </div>
      {dematerializedFeasibilityFile?.certificationPartComplete && (
        <p className="mb-0">
          {isCertificationPartial
            ? "Un ou plusieurs bloc(s) de compétences visé(s)"
            : "La certification dans sa totalité"}
        </p>
      )}
    </EnhancedSectionCard>
  );
};
