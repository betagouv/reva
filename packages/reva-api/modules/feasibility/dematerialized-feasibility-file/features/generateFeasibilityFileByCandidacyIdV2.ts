import {
  CompetenceBlocsPartCompletionEnum,
  DFFDecision,
  DFFEligibilityRequirement,
} from "@prisma/client";
import PDFDocument from "pdfkit";

import { prismaClient } from "@/prisma/client";

export const generateFeasibilityFileByCandidacyIdV2 = async (
  candidacyId: string,
): Promise<Buffer | undefined> => {
  const candidacy = await prismaClient.candidacy.findUnique({
    where: { id: candidacyId },
    include: {
      Feasibility: {
        where: {
          isActive: true,
        },
        include: {
          dematerializedFeasibilityFile: true,
        },
      },
    },
  });

  if (!candidacy) {
    throw new Error("Candidature non trouvée");
  }

  const feasibility = candidacy.Feasibility[0];
  if (!feasibility) {
    throw new Error("Dossier de faisabilité non trouvé");
  }

  const { dematerializedFeasibilityFile } = feasibility;
  if (!dematerializedFeasibilityFile) {
    throw new Error("Dossier de faisabilité dématérialisé non trouvé");
  }

  const isDFFReady = checkIsDFFReady({
    attachmentsPartComplete:
      dematerializedFeasibilityFile.attachmentsPartComplete,
    certificationPartComplete:
      dematerializedFeasibilityFile.certificationPartComplete,
    competenceBlocsPartCompletion:
      dematerializedFeasibilityFile.competenceBlocsPartCompletion,
    prerequisitesPartComplete:
      dematerializedFeasibilityFile.prerequisitesPartComplete,
    aapDecision: dematerializedFeasibilityFile.aapDecision,
    eligibilityRequirement:
      dematerializedFeasibilityFile.eligibilityRequirement,
  });
  if (!isDFFReady) {
    throw new Error(
      "Dossier de faisabilité incomplet pour la génération du pdf",
    );
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "portrait",
      autoFirstPage: true,
      bufferPages: false,
      compress: true,
      margins: {
        top: "20px",
        bottom: "80px",
        left: "40px",
        right: "40px",
      },
    });

    const buffers: Buffer[] = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      const data = Buffer.concat(buffers);

      if (data) {
        resolve(data);
      } else {
        reject(undefined);
      }
    });

    addDocumentHeader(doc);

    // Finalize PDF file
    doc.end();
  });
};

const addDocumentHeader = (doc: PDFKit.PDFDocument) => {
  doc.image("assets/images/republique-francaise.png", doc.x, doc.y, {
    fit: [104.25, 90.75],
  });

  doc.image("assets/images/france-vae.png", doc.x + 400, doc.y + 6, {
    fit: [155.25, 69.9],
  });

  doc.moveDown(10);
};

type CheckIsDFFReadyArgs = {
  attachmentsPartComplete: boolean;
  certificationPartComplete: boolean;
  competenceBlocsPartCompletion: CompetenceBlocsPartCompletionEnum;
  prerequisitesPartComplete: boolean;
  aapDecision: DFFDecision | null;
  eligibilityRequirement: DFFEligibilityRequirement | null;
};

const checkIsDFFReady = ({
  attachmentsPartComplete,
  certificationPartComplete,
  competenceBlocsPartCompletion,
  prerequisitesPartComplete,
  eligibilityRequirement,
}: CheckIsDFFReadyArgs) => {
  let isDFFReady =
    attachmentsPartComplete &&
    certificationPartComplete &&
    prerequisitesPartComplete &&
    !!eligibilityRequirement;

  const isEligibilityTotal =
    eligibilityRequirement === "FULL_ELIGIBILITY_REQUIREMENT";

  if (isEligibilityTotal) {
    isDFFReady = isDFFReady && competenceBlocsPartCompletion === "COMPLETED";
  }

  return isDFFReady;
};
