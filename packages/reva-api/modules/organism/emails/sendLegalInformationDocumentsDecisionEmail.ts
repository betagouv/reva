import { getBackofficeUrl } from "@/modules/shared/email/backoffice.url.helpers";
import { sendEmailUsingTemplate } from "@/modules/shared/email/sendEmailUsingTemplate";

import { NonConformityMotive } from "../organism.types";

export const sendLegalInformationDocumentsApprovalEmail = async ({
  email,
  managerName,
}: {
  email: string;
  managerName: string;
}) => {
  return sendEmailUsingTemplate({
    to: { email },
    templateId: 531,
    params: {
      managerName,
    },
  });
};

export const sendLegalInformationDocumentsUpdateNeededEmail = async ({
  email,
  managerName,
  aapComment,
}: {
  email: string;
  managerName: string;
  aapComment: string;
}) => {
  return sendEmailUsingTemplate({
    to: { email },
    templateId: 532,
    params: {
      managerName,
      aapComment,
      backofficeUrl: getBackofficeUrl({ path: "/" }),
    },
  });
};

// Demande de mise à jour totale déclenchée par un administrateur.
export const sendLegalInformationTotalUpdateRequestEmail = async ({
  email,
  structureName,
}: {
  email: string;
  structureName: string;
}) => {
  return sendEmailUsingTemplate({
    to: { email },
    templateId: 735,
    params: {
      structureName,
      dashboardLink: getBackofficeUrl({ path: "/" }),
    },
  });
};

// Demande de précisions motivée sur un dossier déposé.
export const sendLegalInformationNonConformityEmail = async ({
  email,
  nonConformityMotives,
  comment,
}: {
  email: string;
  nonConformityMotives: NonConformityMotive[];
  comment: string;
}) => {
  return sendEmailUsingTemplate({
    to: { email },
    templateId: 734,
    params: {
      reasons: nonConformityMotives.map(({ message }) => message),
      comment,
    },
  });
};
