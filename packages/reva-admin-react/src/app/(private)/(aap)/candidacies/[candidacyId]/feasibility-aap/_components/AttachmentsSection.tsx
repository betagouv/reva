import { useParams } from "next/navigation";

import { EnhancedSectionCard } from "@/components/card/enhanced-section-card/EnhancedSectionCard";
import { FancyPreview } from "@/components/fancy-preview/FancyPreview";

import { DffAttachment } from "@/graphql/generated/types";

export const AttachmentsSection = ({
  attachmentsPartComplete,
  isEditable,
  attachments,
}: {
  attachmentsPartComplete?: boolean;
  isEditable: boolean;
  attachments?: DffAttachment[];
}) => {
  const { candidacyId } = useParams();
  return (
    <EnhancedSectionCard
      title="Pièces jointes"
      titleIconClass="fr-icon-attachment-fill"
      status={attachmentsPartComplete ? "COMPLETED" : "TO_COMPLETE"}
      isEditable={isEditable}
      buttonOnClickHref={`/candidacies/${candidacyId}/feasibility-aap/attachments`}
      data-testid="attachments-section"
    >
      {!!attachments?.length &&
        attachments.map(({ id, file }) => {
          return (
            file.previewUrl && (
              <FancyPreview
                key={id}
                name={file.name}
                src={file.previewUrl}
                defaultDisplay={false}
                title={file.name}
              />
            )
          );
        })}
    </EnhancedSectionCard>
  );
};
