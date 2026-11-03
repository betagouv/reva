import { DossierDeValidationDecision } from "@/graphql/generated/graphql";

type FileType = { url: string; previewUrl?: string | null; name: string };

export type DossierDeValidationType = {
  id: string;
  sentAt: number;
  file: FileType;
  otherFiles: FileType[];
  decision: DossierDeValidationDecision;
  decisionSentAt?: number | null;
  decisionComment?: string | null;
};
