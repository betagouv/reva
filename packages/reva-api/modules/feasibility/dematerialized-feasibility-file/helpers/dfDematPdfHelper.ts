import {
  DFFEligibilityCandidateSituation,
  DFFEligibilityRequirement,
} from "@prisma/client";

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
  const yStart = doc.y;
  doc.image(iconPath, doc.x + pxToPt(40), doc.y + pxToPt(40), {
    fit: [pxToPt(40), pxToPt(40)],
  });

  doc
    .fontSize(14)
    .font("assets/fonts/Marianne/Marianne-Bold.otf")
    .text(title, doc.x + pxToPt(90), doc.y + pxToPt(32));

  doc.moveDown(0.5);

  content(doc);

  doc.moveDown(1);
  const yEnd = doc.y;

  doc
    .rect(pxToPt(100), yStart, pxToPt(1280), yEnd - yStart)
    .strokeColor("#DDDDDD")
    .lineWidth(0.5)
    .stroke();
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
    .text(subTitle, doc.x + pxToPt(-50));
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
