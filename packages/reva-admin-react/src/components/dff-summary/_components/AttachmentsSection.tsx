import { FancyPreview } from "@/components/fancy-preview/FancyPreview";

import { DffAttachment, File } from "@/graphql/generated/types";

export default function AttachmentsSection({
  attachments,
  swornStatementFile,
}: {
  attachments: DffAttachment[];
  swornStatementFile?: File | null;
}) {
  return (
    <div>
      <div className="flex">
        <h3 className="">Pièces jointes</h3>
      </div>
      <div className="ml-10">
        {attachments.map((attachment) => (
          <FancyPreview
            key={attachment.id}
            name={attachment.file.name}
            src={attachment.file.previewUrl ?? ""}
            defaultDisplay={false}
            title={attachment.file.name ?? ""}
          />
        ))}
        {swornStatementFile && (
          <FancyPreview
            name={swornStatementFile.name}
            src={swornStatementFile.previewUrl ?? ""}
            defaultDisplay={false}
            title={swornStatementFile.name ?? ""}
          />
        )}
      </div>
    </div>
  );
}
