import {
  DFFEligibilityCandidateSituation,
  DFFEligibilityRequirement,
} from "@prisma/client";

export const addFrame = ({
  doc,
  content,
  startInPt,
  widthInPt,
}: {
  doc: PDFKit.PDFDocument;
  startInPt: number;
  widthInPt: number;
  content: (doc: PDFKit.PDFDocument) => void;
}) => {
  const yStart = doc.y;
  content(doc);
  doc.moveDown(1);
  const yEnd = doc.y;
  doc
    .rect(startInPt, yStart, widthInPt, yEnd - yStart)
    .strokeColor("#DDDDDD")
    .lineWidth(0.5)
    .stroke();
  doc.text("", startInPt, doc.y); //reset x position to start of frame after frame end
};

export const addTag = ({
  doc,
  text,
  startInPt,
}: {
  doc: PDFKit.PDFDocument;
  text: string;
  startInPt: number;
}) => {
  doc.fontSize(7).font("assets/fonts/Marianne/Marianne-Light.otf");
  doc
    .roundedRect(
      startInPt,
      doc.y,
      doc.widthOfString(text) + pxToPt(30),
      pxToPt(35),
      pxToPt(40),
    )
    .lineWidth(0.5)
    .strokeColor("#DDDDDD")
    .stroke();
  doc.text("  " + text, startInPt + pxToPt(5), doc.y + pxToPt(5));
};

export const addInfoText = ({
  title,
  value,
  x,
  y,
  maxWidthInPt,
  doc,
}: {
  title: string;
  value: string;
  x?: number;
  y?: number;
  maxWidthInPt?: number;
  doc: PDFKit.PDFDocument;
}) => {
  doc
    .font("assets/fonts/Marianne/Marianne-Light.otf")
    .fontSize(8)
    .table({
      defaultStyle: { border: false, padding: false },
      position: { x: x ?? doc.x, y: y ?? doc.y },
      maxWidth: maxWidthInPt ?? undefined,
      data: [
        [
          {
            text: title,
          },
        ],
        [
          {
            text: value,
            font: {
              src: "assets/fonts/Marianne/Marianne-Medium.otf",
            },
          },
        ],
      ],
    });
};

export const addCallout = ({
  doc,
  title,
  description,
  x,
  y,
  widthInPt,
}: {
  doc: PDFKit.PDFDocument;
  title: string;
  description: string;
  x?: number;
  y?: number;
  widthInPt?: number;
}) => {
  doc
    .font("assets/fonts/Marianne/Marianne-Regular.otf")
    .fontSize(9)
    .table({
      position: { x: x ?? doc.x, y: y ?? doc.y },
      maxWidth: widthInPt ?? undefined,
      defaultStyle: {
        border: [false, false, false, true],
        borderColor: "#6a6af4",
        backgroundColor: "#eeeeee",
      },
      data: [
        [
          {
            text: title,
            padding: {
              top: "16px",
              bottom: "2px",
              left: "24px",
              right: "24px",
            },
          },
        ],
        [
          {
            text: description,
            font: {
              src: "assets/fonts/Marianne/Marianne-Light.otf",
            },
            padding: { top: 0, bottom: "16px", left: "24px", right: "24px" },
          },
        ],
      ],
    });
};

export const addSection = ({
  title,
  iconPath,
  content,
  doc,
}: {
  title: string;
  iconPath: string;
  content: (doc: PDFKit.PDFDocument) => void;
  doc: PDFKit.PDFDocument;
}) => {
  addFrame({
    doc,
    startInPt: pxToPt(100),
    widthInPt: pxToPt(1280),
    content: (doc) => {
      doc.image(iconPath, doc.x + pxToPt(40), doc.y + pxToPt(40), {
        fit: [pxToPt(40), pxToPt(40)],
      });

      doc
        .fontSize(14)
        .font("assets/fonts/Marianne/Marianne-Bold.otf")
        .text(title, doc.x + pxToPt(90), doc.y + pxToPt(32));

      doc.moveDown(0.5);

      content(doc);
    },
  });
};

export const pxToPt = (pixels: number) => pixels / 2.48;

export const addSubTitle = ({
  subTitle,
  doc,
}: {
  subTitle: string;
  doc: PDFKit.PDFDocument;
}) => {
  doc
    .fontSize(12)
    .font("assets/fonts/Marianne/Marianne-Bold.otf")
    .text(subTitle, pxToPt(140));
  doc.moveDown(0.5);
};

export const getEligibilityLabelAndType = ({
  eligibilityRequirement,
  eligibilitySituation,
}: {
  eligibilityRequirement?: DFFEligibilityRequirement | null;
  eligibilitySituation?: DFFEligibilityCandidateSituation | null;
}): { label: string; type: "info" | "warning" } => {
  if (eligibilitySituation) {
    switch (eligibilitySituation) {
      case DFFEligibilityCandidateSituation.PREMIERE_DEMANDE_RECEVABILITE:
        return {
          label: "PREMIÈRE DEMANDE DE RECEVABILITÉ",
          type: "info",
        };
      case DFFEligibilityCandidateSituation.DETENTEUR_RECEVABILITE:
        return {
          label: "DÉTENTEUR DE RECEVABILITÉ",
          type: "info",
        };
      case DFFEligibilityCandidateSituation.DETENTEUR_RECEVABILITE_AVEC_CHGT_CODE_RNCP_ET_REV_REFERENTIEL:
        return {
          label:
            "DÉTENTEUR DE RECEVABILITÉ AVEC CHANGEMENT DE CODE RNCP ET RÉVISION DU RÉFÉRENTIEL",
          type: "info",
        };
      case DFFEligibilityCandidateSituation.DETENTEUR_RECEVABILITE_AVEC_REV_SANS_CHGT_REFERENTIEL:
        return {
          label:
            "DÉTENTEUR DE RECEVABILITÉ AVEC RÉVISION SANS CHANGEMENT DE RÉFÉRENTIEL",
          type: "info",
        };
    }
  }

  switch (eligibilityRequirement) {
    case DFFEligibilityRequirement.FULL_ELIGIBILITY_REQUIREMENT:
      return {
        label: "ACCÈS AU DOSSIER DE FAISABILITÉ INTÉGRAL",
        type: "info",
      };
    case DFFEligibilityRequirement.PARTIAL_ELIGIBILITY_REQUIREMENT:
      return {
        label: "ACCÈS AU DOSSIER DE FAISABILITÉ ADAPTÉ",
        type: "warning",
      };
  }

  return {
    label: "Inconnu",
    type: "warning",
  };
};

export const addTitledBlock = ({
  title,
  content,
  startInPt,
  doc,
}: {
  title: string;
  content: (doc: PDFKit.PDFDocument) => void;
  startInPt: number;
  widthInPt: number;
  doc: PDFKit.PDFDocument;
}) => {
  doc
    .fontSize(8)
    .font("assets/fonts/Marianne/Marianne-Medium.otf")
    .text(title, startInPt, doc.y);
  doc.moveDown(0.5);
  doc
    .text("", startInPt + pxToPt(16), doc.y)
    .font("assets/fonts/Marianne/Marianne-Regular.otf");
  content(doc);
  doc.text("", startInPt, doc.y); //reset x position to start of block after block end
};
