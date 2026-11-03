import { FromSchema } from "json-schema-to-ts";

import { FeasibilityHistory } from "../../../../graphql/generated/types.js";
import { GetGqlResponseType } from "../../../../utils/types.js";
import { dossierDeFaisabiliteDecisionsResponseSchema } from "../../responseSchemas.js";
import {
  dossierDeFaisabiliteDecisionSchema,
  decisionDossierDeFaisabiliteSchema,
  fichierSchema,
} from "../../schemas.js";

import { getFeasibilityHistoryByCandidacyId } from "./getFeasibilityHistoryByCandidacyId.js";

type MappedFeasibilityDecisionsResponse = FromSchema<
  typeof dossierDeFaisabiliteDecisionsResponseSchema,
  {
    references: [
      typeof dossierDeFaisabiliteDecisionSchema,
      typeof decisionDossierDeFaisabiliteSchema,
      typeof fichierSchema,
    ];
  }
>;

type MappedFeasibilityDecision = FromSchema<
  typeof dossierDeFaisabiliteDecisionSchema,
  {
    references: [
      typeof decisionDossierDeFaisabiliteSchema,
      typeof fichierSchema,
    ];
  }
>;

const statusMapFromGqlToInterop: Record<
  string,
  (typeof decisionDossierDeFaisabiliteSchema)["enum"][number]
> = {
  REJECTED: "IRRECEVABLE",
  ADMISSIBLE: "RECEVABLE",
  INCOMPLETE: "INCOMPLET",
  COMPLETE: "COMPLET",
  PENDING: "EN_ATTENTE",
};

const buildPreviewUrl = (path: string) => {
  if (process.env.ENVIRONEMENT === "local") {
    return "http://localhost:8080" + path;
  }
  return process.env.BASE_URL + path;
};

const mapFeasibilityDecision = (
  history: Omit<FeasibilityHistory, "id">,
): MappedFeasibilityDecision => {
  return {
    decision: statusMapFromGqlToInterop[history.decision],
    commentaire: history.decisionComment || undefined,
    dateEnvoi: history.decisionSentAt
      ? new Date(history.decisionSentAt).toISOString()
      : null,
    document: history.decisionFile?.previewUrl
      ? {
          nom: history.decisionFile.name,
          url: buildPreviewUrl(history.decisionFile.previewUrl),
          typeMime: history.decisionFile.mimeType,
        }
      : undefined,
  };
};

export const mapGetFeasibilityHistoryByCandidacyId = (
  candidacy: GetGqlResponseType<typeof getFeasibilityHistoryByCandidacyId>,
): MappedFeasibilityDecisionsResponse => {
  let data: MappedFeasibilityDecision[] = [];

  if (candidacy.feasibility?.feasibilityFormat === "UPLOADED_PDF") {
    data.push(
      mapFeasibilityDecision({
        decision: candidacy.feasibility.decision,
        decisionComment: candidacy.feasibility.decisionComment,
        decisionSentAt: candidacy.feasibility.decisionSentAt,
        decisionFile: candidacy.feasibility.decisionFile,
      }),
    );
  }

  if (candidacy.feasibility?.history) {
    data = [
      ...data,
      ...candidacy.feasibility.history.map(mapFeasibilityDecision),
    ];
  }

  return { data };
};
