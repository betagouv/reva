import {
  CompetenceBlocsPartCompletionEnum,
  DFFDecision,
  DFFEligibilityRequirement,
} from "@prisma/client";
import PDFDocument from "pdfkit";

import { prismaClient } from "@/prisma/client";

import {
  addSubTitle,
  pxToPt,
  sectionBuilder,
} from "../helpers/dfDematPdfHelper";

const ASSETS_PATH =
  "modules/feasibility/dematerialized-feasibility-file/assets/images/df-demat-pdf/";

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
        top: pxToPt(20),
        bottom: "80px",
        left: pxToPt(100),
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

    const { addSection } = sectionBuilder(doc);

    addDocumentHeader(doc);

    addSection({
      title: "Contexte de la demande",
      iconPath: `${ASSETS_PATH}data-visualization.png`,
      content: (doc) => {
        addSubTitle({ subTitle: "Nature de la demande", doc });
      },
    });

    doc.end();
  });
};

const addDocumentHeader = (doc: PDFKit.PDFDocument) => {
  doc.image(`${ASSETS_PATH}republique-francaise.png`, doc.x, doc.y, {
    fit: [104.25, 90.75],
  });

  doc.image(`${ASSETS_PATH}france-vae.png`, doc.x + 400, doc.y + 6, {
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
