import {
  CompetenceBlocsPartCompletionEnum,
  DFFDecision,
  DFFEligibilityRequirement,
} from "@prisma/client";
import PDFDocument from "pdfkit";

import { isAapAvailableForCertificationId } from "@/modules/referential/features/isAapAvailableForCertificationId";
import { prismaClient } from "@/prisma/client";

import {
  addSubTitle,
  getEligibilityLabelAndType,
  pxToPt,
  addSection,
  addFrame,
  addTag,
  addInfoText,
  addCallout,
  addTitledBlock,
  addDisabledCheckbox,
} from "../helpers/df-demat-pdf-helper/dfDematPdfHelper";

const ASSETS_PATH =
  "modules/feasibility/dematerialized-feasibility-file/assets/images/df-demat-pdf";

export const generateFeasibilityFileByCandidacyIdV2 = async (
  candidacyId: string,
): Promise<Buffer | undefined> => {
  const candidacy = await prismaClient.candidacy.findUnique({
    where: { id: candidacyId },
    include: {
      certification: { include: { competenceBlocs: true } },
      Feasibility: {
        where: {
          isActive: true,
        },
        include: {
          dematerializedFeasibilityFile: {
            include: { dffCertificationCompetenceBlocs: true },
          },
        },
      },
    },
  });

  if (!candidacy) {
    throw new Error("Candidature non trouvée");
  }

  const { certification } = candidacy;

  if (!certification) {
    throw new Error("Certification non trouvée");
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

  const aapAvailableForCertification = await isAapAvailableForCertificationId({
    certificationId: certification.id,
  });

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

    addDocumentHeader(doc);

    const eligibilityLabelAndType = getEligibilityLabelAndType({
      eligibilityRequirement:
        dematerializedFeasibilityFile.eligibilityRequirement,
      eligibilitySituation:
        dematerializedFeasibilityFile.eligibilityCandidateSituation,
    });

    const dffBlocCompetenceBlocsIds =
      dematerializedFeasibilityFile.dffCertificationCompetenceBlocs.map(
        (bloc) => bloc.certificationCompetenceBlocId,
      );

    const certificationCompetenceBlocsWithSelectionStatus =
      certification.competenceBlocs.map((bloc) => ({
        code: bloc.code ?? "",
        label: bloc.label ?? "",
        selected: dffBlocCompetenceBlocsIds.includes(bloc.id ?? false),
      }));

    addContexteDemandeSection({
      doc,
      eligibilityLabelAndType,
      certification,
      aapAvailableForCertification,
      option: dematerializedFeasibilityFile.option,
      firstForeignLanguage: dematerializedFeasibilityFile.firstForeignLanguage,
      secondForeignLanguage:
        dematerializedFeasibilityFile.secondForeignLanguage,
      isCertificationPartial: !!candidacy.isCertificationPartial,
      certificationCompetenceBlocsWithSelectionStatus,
    });

    doc.end();
  });
};

const addDocumentHeader = (doc: PDFKit.PDFDocument) => {
  doc.image(`${ASSETS_PATH}/republique-francaise.png`, doc.x, doc.y, {
    fit: [104.25, 90.75],
  });

  doc.image(`${ASSETS_PATH}/france-vae.png`, doc.x + 400, doc.y + 6, {
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

const addContexteDemandeSection = ({
  doc,
  eligibilityLabelAndType,
  certification,
  aapAvailableForCertification,
  option,
  firstForeignLanguage,
  secondForeignLanguage,
  isCertificationPartial,
  certificationCompetenceBlocsWithSelectionStatus,
}: {
  doc: PDFKit.PDFDocument;
  eligibilityLabelAndType: { label: string; type: "info" | "warning" };
  certification: { label: string; rncpId: string };
  aapAvailableForCertification: boolean;
  option: string | null;
  firstForeignLanguage: string | null;
  secondForeignLanguage: string | null;
  isCertificationPartial: boolean;
  certificationCompetenceBlocsWithSelectionStatus: {
    code: string;
    label: string;
    selected: boolean;
  }[];
}) => {
  addSection({
    doc,
    title: "Contexte de la demande",
    iconPath: `${ASSETS_PATH}/data-visualization.png`,
    content: (doc) => {
      addNatureDemandeSubSection({ doc, eligibilityLabelAndType });
      addCertificationSubSection({
        doc,
        certification,
        aapAvailableForCertification,
        option,
        firstForeignLanguage,
        secondForeignLanguage,
        isCertificationPartial,
        certificationCompetenceBlocsWithSelectionStatus,
      });
    },
  });
};

const addNatureDemandeSubSection = ({
  doc,
  eligibilityLabelAndType,
}: {
  doc: PDFKit.PDFDocument;
  eligibilityLabelAndType: { label: string; type: "info" | "warning" };
}) => {
  addSubTitle({ subTitle: "Nature de la demande", doc });

  const { backgroundColor, textColor, iconPath } =
    eligibilityLabelAndType.type === "info"
      ? {
          backgroundColor: "#e8edff",
          textColor: "#0063cb",
          iconPath: `${ASSETS_PATH}/info-fill.png`,
        }
      : {
          backgroundColor: "#feebd0",
          textColor: "#695240",
          iconPath: `${ASSETS_PATH}/flashlight-fill.png`,
        };
  doc
    .font("assets/fonts/Marianne/Marianne-Bold.otf")
    .fontSize(8)
    .table({
      position: { x: doc.x + pxToPt(40), y: doc.y },
      columnStyles: [doc.widthOfString(eligibilityLabelAndType.label) + 25],
      data: [
        [
          {
            border: 0,
            backgroundColor,
            textColor,
            text: "        " + eligibilityLabelAndType.label,
          },
        ],
      ],
    });

  doc.image(iconPath, doc.x + 2, doc.y - 13, {
    fit: [12, 12],
  });
  doc.moveDown(1);
};

const addCertificationSubSection = ({
  doc,
  certification,
  aapAvailableForCertification,
  option,
  firstForeignLanguage,
  secondForeignLanguage,
  isCertificationPartial,
  certificationCompetenceBlocsWithSelectionStatus,
}: {
  doc: PDFKit.PDFDocument;
  certification: { label: string; rncpId: string };
  aapAvailableForCertification: boolean;
  option: string | null;
  firstForeignLanguage: string | null;
  secondForeignLanguage: string | null;
  isCertificationPartial: boolean;
  certificationCompetenceBlocsWithSelectionStatus: {
    code: string;
    label: string;
    selected: boolean;
  }[];
}) => {
  addSubTitle({
    subTitle: "Informations sur la certification professionnelle visée",
    doc,
  });

  addFrame({
    doc,
    startInPt: pxToPt(180),
    widthInPt: pxToPt(1160),
    content: (doc) => {
      doc.moveDown(0.75);
      addTag({
        doc,
        text: aapAvailableForCertification
          ? "VAE en autonomie ou accompagnée"
          : "VAE en autonomie",
        startInPt: doc.x + pxToPt(72),
      });
      doc.image(
        `${ASSETS_PATH}/verified-badge.png`,
        doc.x,
        doc.y + pxToPt(20),
        {
          fit: [pxToPt(16), pxToPt(16)],
        },
      );
      doc
        .font("assets/fonts/Marianne/Marianne-Light.otf")
        .fontSize(6)
        .text(`       RNCP ${certification.rncpId}`, doc.x, doc.y + pxToPt(16));

      doc
        .font("assets/fonts/Marianne/Marianne-Bold.otf")
        .fontSize(11)
        .text(certification.label, doc.x, doc.y + pxToPt(16), {
          width: pxToPt(1096),
        });

      doc.moveDown(2);
    },
  });

  doc.moveDown(0.5);

  addInfoText({
    title: "Option ou parcours :",
    value: option ?? "",
    doc,
    maxWidthInPt: pxToPt(1160),
  });

  doc.moveDown(0.5);

  const oldY = doc.y;

  const oldX = doc.x;

  addInfoText({
    title: "Langue vivante 1 :",
    value: firstForeignLanguage ?? "",
    doc,
  });

  addInfoText({
    title: "Langue vivante 2 :",
    value: secondForeignLanguage ?? "",
    x: doc.x + pxToPt(300),
    y: oldY,
    doc,
  });

  doc.moveDown(1);

  addCallout({
    title: "Le candidat vise",
    description: isCertificationPartial
      ? "Un ou plusieurs bloc(s) de compétences de la certification"
      : "La certification dans sa totalité",
    x: oldX,
    doc,
    widthInPt: pxToPt(1160),
  });

  doc.moveDown(1);

  addTitledBlock({
    doc,
    title: "Choix des blocs de compétences",
    content: (doc) =>
      certificationCompetenceBlocsWithSelectionStatus.forEach((bloc) => {
        addDisabledCheckbox({
          label: `${bloc.code} - ${bloc.label}`,
          checked: bloc.selected,
          doc,
        });
        doc.moveDown(0.5);
      }),
    startInPt: oldX,
    widthInPt: pxToPt(1160),
  });
};
