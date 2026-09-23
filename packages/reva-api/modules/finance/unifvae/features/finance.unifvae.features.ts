import { Decimal } from "@prisma/client/runtime/library";
import { isAfter, isBefore, sub } from "date-fns";

import { getCurrentAccompagnement } from "@/modules/accompagnement/features/accompagnement.helpers";
import { logCandidacyAuditEvent } from "@/modules/candidacy-log/features/logCandidacyAuditEvent";
import {
  DATE_LIMITE_DEMANDE_PAIEMENT_DEPASSEE_CANDIDATURE,
  DEMANDE_FINANCEMENT_NON_TROUVEE,
  DEMANDE_PAIEMENT_NON_TROUVEE,
} from "@/modules/shared/errors/messages";
import { UploadedFile } from "@/modules/shared/file/file.interface";
import { prismaClient } from "@/prisma/client";

import { applyBusinessValidationRules } from "../validation";
export const getFundingRequestUnifvaeFromCandidacyId = async (
  candidacyId: string,
) =>
  prismaClient.fundingRequestUnifvae.findFirst({
    where: { candidacyId },
    include: {
      basicSkills: { include: { basicSkill: true } },
      mandatoryTrainings: { include: { training: true } },
    },
  });

export const getPaymentRequestUnifvaeFromCandidacyId = (candidacyId: string) =>
  prismaClient.paymentRequestUnifvae.findFirst({
    where: { candidacyId },
  });

export const createOrUpdatePaymentRequestUnifvae = async ({
  candidacyId,
  paymentRequest,
  userKeycloakId,
  userEmail,
  userRoles,
}: {
  candidacyId: string;
  paymentRequest: PaymentRequestUnifvaeInput;
  userKeycloakId?: string;
  userEmail?: string;
  userRoles: KeyCloakUserRole[];
}) => {
  const candidacy = await prismaClient.candidacy.findUnique({
    where: { id: candidacyId },
    include: {
      candidacyStatuses: true,
      candidacyDropOut: true,
      Feasibility: true,
      certification: true,
      fundingRequestUnifvae: true,
      FundingRequest: true,
    },
  });

  if (!candidacy) {
    throw new Error(
      "Impossible de créer la demande de paiement. La candidature n'a pas été trouvée",
    );
  }

  const isFundingRequestSent =
    (candidacy.financeModule === "unireva" &&
      candidacy.FundingRequest !== null) ||
    (candidacy.financeModule === "unifvae" &&
      candidacy.fundingRequestUnifvae !== null);

  if (
    candidacy.isCertificationPartial == undefined ||
    candidacy.isCertificationPartial == null
  ) {
    throw new Error('"isCertificationPartial" has not been set');
  }

  if (!candidacy.certification) {
    throw new Error(
      "Impossible de créer la demande de paiement. La candidature n'a pas de certification associée",
    );
  }

  const activeCandidacyStatus = candidacy.status;

  const isCandidacyDroppedOut = !!candidacy.candidacyDropOut;

  // If the candidate has not dropped out ...
  if (!isCandidacyDroppedOut) {
    const endAccompagnementConfirmed =
      candidacy.endAccompagnementStatus === "CONFIRMED_BY_CANDIDATE" ||
      candidacy.endAccompagnementStatus === "CONFIRMED_BY_ADMIN";
    const feasibilityRejected =
      candidacy?.Feasibility?.find((f) => f.isActive)?.decision === "REJECTED";
    // Either the feasibility has been rejected and thus the funding request has been sent ...
    if (feasibilityRejected) {
      if (!isFundingRequestSent) {
        throw new Error(
          "Impossible de créer la demande de paiement. La demande de financement n'a pas été envoyée",
        );
      }
    }
    // ... Or the feasibility file is not rejected and the active candidacy status must be "DOSSIER_DE_VALIDATION_ENVOYE" or the end accompagnement has been confirmed
    else if (
      activeCandidacyStatus !== "DOSSIER_DE_VALIDATION_ENVOYE" &&
      !endAccompagnementConfirmed
    ) {
      throw new Error(
        "Impossible de créer la demande de paiement. Le dossier de validation n'a pas été envoyé ou la fin de l'accompagnement n'a pas été confirmée",
      );
    }
  }
  // If the candidate has dropped out ...
  else {
    // If the candidate has dropped out we ensure that the funding request has been sent
    if (!isFundingRequestSent) {
      throw new Error(
        "Impossible de créer la demande de paiement. La demande de financement n'a pas été envoyée",
      );
    }

    const endAccompagnementConfirmed =
      candidacy.endAccompagnementStatus === "CONFIRMED_BY_CANDIDATE" ||
      candidacy.endAccompagnementStatus === "CONFIRMED_BY_ADMIN";

    // If the candidate has dropped out for less than 4 months and no proof of dropout has been received by the france vae admin
    // and the candidate has not confirmed his dropout, and the end of accompagnement has not been confirmed we prevent the payment request creation
    if (
      candidacy.candidacyDropOut &&
      !candidacy.candidacyDropOut.proofReceivedByAdmin &&
      !candidacy.candidacyDropOut.dropOutConfirmedByCandidate &&
      isAfter(
        candidacy.candidacyDropOut.createdAt,
        sub(new Date(), { months: 4 }),
      ) &&
      !endAccompagnementConfirmed
    ) {
      throw new Error(
        "La demande de paiement n’est pas encore disponible. Vous y aurez accès 6 mois après la mise en abandon du candidat.",
      );
    }
  }

  //maximum total cost allowed for unifvae payment request depends on the funding request creation date
  //and the type of certification

  let fundingRequestSentAt = null;
  if (candidacy.financeModule === "unifvae") {
    fundingRequestSentAt = candidacy.fundingRequestUnifvae?.createdAt;
  } else if (candidacy.financeModule === "unireva") {
    fundingRequestSentAt = candidacy.FundingRequest?.createdAt;
  }

  let fundingRequestSentBefore20231219,
    fundingRequestSentBefore20240602 = false;

  if (fundingRequestSentAt) {
    fundingRequestSentBefore20231219 = isBefore(
      fundingRequestSentAt,
      new Date(2023, 11, 19),
    );
    fundingRequestSentBefore20240602 = isBefore(
      fundingRequestSentAt,
      new Date(2024, 5, 2),
    );
  }

  const DEAS_DEAP_AND_DEAES_RNCP_CODES = [
    "4495",
    "35830",
    "4496",
    "35832",
    "25467",
    "36004",
  ];

  const certificationIsDeasOrDeapOrDeaes =
    DEAS_DEAP_AND_DEAES_RNCP_CODES.includes(candidacy.certification.rncpId);

  //max total cost allowed is 4700 euros for funding request sent before 19/12/2023 or funding request sent before 02/06/2024 and certification is DEAS, DEAP or DEAES
  const allowPaymentRequestOf4700Euros =
    fundingRequestSentBefore20231219 ||
    (fundingRequestSentBefore20240602 && certificationIsDeasOrDeapOrDeaes);

  const maximumTotalCostAllowed = allowPaymentRequestOf4700Euros
    ? new Decimal(4700)
    : new Decimal(3200);

  const validationErrors = await applyBusinessValidationRules({
    maximumTotalCostAllowed,
    candidacyId,
    isCertificationPartial: candidacy.isCertificationPartial,
    individualHourCount: paymentRequest.individualEffectiveHourCount,
    collectiveHourCount: paymentRequest.collectiveEffectiveHourCount,
    basicSkillsHourCount: paymentRequest.basicSkillsEffectiveHourCount,
    mandatoryTrainingsHourCount:
      paymentRequest.mandatoryTrainingsEffectiveHourCount,
    certificateSkillsHourCount:
      paymentRequest.certificateSkillsEffectiveHourCount,
    otherTrainingHourCount: paymentRequest.otherTrainingEffectiveHourCount,
    individualCost: paymentRequest.individualEffectiveCost,
    collectiveCost: paymentRequest.collectiveEffectiveCost,
    basicSkillsCost: paymentRequest.basicSkillsEffectiveCost,
    mandatoryTrainingsCost: paymentRequest.mandatoryTrainingsEffectiveCost,
    certificateSkillsCost: paymentRequest.certificateSkillsEffectiveCost,
    otherTrainingCost: paymentRequest.otherTrainingEffectiveCost,
  });

  if (validationErrors.length) {
    const businessErrors = validationErrors.map(({ fieldName, message }) =>
      fieldName === "GLOBAL" ? message : `input.${fieldName}: ${message}`,
    );
    throw new Error(businessErrors[0]);
  }

  const currentAccompagnement = await getCurrentAccompagnement({ candidacyId });

  const result = await prismaClient.paymentRequestUnifvae.upsert({
    where: { candidacyId },
    create: {
      candidacyId,
      accompagnementId: currentAccompagnement?.id,
      ...paymentRequest,
      invoiceNumber: paymentRequest.invoiceNumber || "",
    },
    update: {
      ...paymentRequest,
      ...(currentAccompagnement?.id
        ? { accompagnementId: currentAccompagnement.id }
        : {}),
    },
  });

  await logCandidacyAuditEvent({
    candidacyId,
    userKeycloakId,
    userEmail,
    userRoles,
    eventType: "PAYMENT_REQUEST_CREATED_OR_UPDATED",
  });

  return result;
};

export const addUploadedFileAndConfirmPayment = async ({
  candidacyId,
  invoiceFile,
  certificateOfAttendanceFile,
  contractorInvoiceFiles,
  userKeycloakId,
  userEmail,
  userRoles,
}: {
  candidacyId: string;
  invoiceFile: UploadedFile;
  certificateOfAttendanceFile: UploadedFile;
  contractorInvoiceFiles?: UploadedFile[];
  userKeycloakId?: string;
  userEmail: string;
  userRoles: KeyCloakUserRole[];
}) => {
  await addUploadedFileToPaymentRequestUnifvae({
    candidacyId,
    invoiceFile,
    certificateOfAttendanceFile,
    contractorInvoiceFiles,
  });
  await confirmPaymentRequestUnifvae({
    candidacyId,
    userKeycloakId,
    userEmail,
    userRoles,
  });
};

export const confirmPaymentRequestUnifvae = async ({
  candidacyId,
  userKeycloakId,
  userEmail,
  userRoles,
}: {
  candidacyId: string;
  userKeycloakId?: string;
  userEmail: string;
  userRoles: KeyCloakUserRole[];
}) => {
  const candidacy = await prismaClient.candidacy.findUnique({
    where: { id: candidacyId },
    include: {
      fundingRequestUnifvae: true,
      paymentRequestUnifvae: true,
      organism: true,
    },
  });

  if (!candidacy) {
    throw new Error(
      "Impossible de confirmer la demande de paiement. La candidature n'a pas été trouvée",
    );
  }

  if (candidacy.paymentRequestDeadlinePassed) {
    throw new Error(DATE_LIMITE_DEMANDE_PAIEMENT_DEPASSEE_CANDIDATURE);
  }

  const fundingRequest = candidacy?.fundingRequestUnifvae;

  if (!fundingRequest) {
    throw new Error(
      "Impossible de confirmer la demande de paiement. La demande de financement n'a pas été trouvée",
    );
  }

  const paymentRequest = candidacy?.paymentRequestUnifvae;

  if (!paymentRequest) {
    throw new Error(
      "Impossible de confirmer la demande de paiement. La demande de paiment n'a pas été trouvée",
    );
  }

  const formationComplementaireHeures =
    paymentRequest.basicSkillsEffectiveHourCount
      .plus(paymentRequest.mandatoryTrainingsEffectiveHourCount)
      .plus(paymentRequest.certificateSkillsEffectiveHourCount)
      .plus(paymentRequest.otherTrainingEffectiveHourCount);

  const formationComplementaireCoutTotal =
    paymentRequest.basicSkillsEffectiveHourCount
      .mul(paymentRequest.basicSkillsEffectiveCost)
      .plus(
        paymentRequest.mandatoryTrainingsEffectiveHourCount.mul(
          paymentRequest.mandatoryTrainingsEffectiveCost,
        ),
      )
      .plus(
        paymentRequest.certificateSkillsEffectiveHourCount.mul(
          paymentRequest.certificateSkillsEffectiveCost,
        ),
      )
      .plus(
        paymentRequest.otherTrainingEffectiveHourCount.mul(
          paymentRequest.otherTrainingEffectiveCost,
        ),
      );

  const formationComplementaireCoutHoraireMoyen =
    formationComplementaireHeures.isZero()
      ? new Decimal(0)
      : formationComplementaireCoutTotal.dividedBy(
          formationComplementaireHeures,
        );

  await prismaClient.paymentRequestBatchUnifvae.create({
    data: {
      paymentRequestUnifvaeId: paymentRequest.id,
      content: {
        SiretAP: candidacy?.organism?.siret,
        NumAction: fundingRequest.numAction,
        NumFacture: paymentRequest.invoiceNumber,
        NbHeureReaAccVAEInd:
          paymentRequest.individualEffectiveHourCount.toFixed(2),
        CoutHeureReaAccVAEInd:
          paymentRequest.individualEffectiveCost.toFixed(2),
        NbHeureReaAccVAEColl:
          paymentRequest.collectiveEffectiveHourCount.toFixed(2),
        CoutHeureReaAccVAEColl:
          paymentRequest.collectiveEffectiveCost.toFixed(2),
        NbHeureReaDemActeFormatifCompl:
          formationComplementaireHeures.toFixed(2),
        CoutHeureReaDemActeFormatifCompl:
          formationComplementaireCoutHoraireMoyen.toFixed(2, Decimal.ROUND_UP),
      },
    },
  });

  await prismaClient.paymentRequestUnifvae.update({
    where: { id: paymentRequest.id },
    data: { confirmedAt: new Date() },
  });

  await logCandidacyAuditEvent({
    candidacyId,
    userKeycloakId,
    userEmail,
    userRoles,
    eventType: "PAYMENT_REQUEST_CONFIRMED",
  });
  return paymentRequest;
};

const addUploadedFileToPaymentRequestUnifvae = async ({
  candidacyId,
  invoiceFile,
  certificateOfAttendanceFile,
  contractorInvoiceFiles,
}: {
  candidacyId: string;
  invoiceFile: UploadedFile;
  certificateOfAttendanceFile: UploadedFile;
  contractorInvoiceFiles?: UploadedFile[];
}) => {
  const paymentRequest = await prismaClient.paymentRequestUnifvae.findFirst({
    where: { candidacyId },
  });

  if (!paymentRequest) {
    throw new Error(DEMANDE_PAIEMENT_NON_TROUVEE);
  }

  const fundingRequest = await prismaClient.fundingRequestUnifvae.findFirst({
    where: { candidacyId },
  });

  if (!fundingRequest) {
    throw new Error(DEMANDE_FINANCEMENT_NON_TROUVEE);
  }

  await prismaClient.fileUploadSpooler.createMany({
    data: [
      {
        destinationFileName: `facture_${
          fundingRequest.numAction
        }.${getFilenameExtension(invoiceFile.filename)}`,
        destinationPath: "import",
        description: `Facture pour paymentRequestId ${paymentRequest.id} (${invoiceFile.filename} - ${invoiceFile.mimetype})`,
        fileContent: invoiceFile._buf,
      },
      {
        destinationFileName: `presence_${
          fundingRequest.numAction
        }.${getFilenameExtension(certificateOfAttendanceFile.filename)}`,
        destinationPath: "import",
        description: `Feuille de présence pour paymentRequestId ${paymentRequest.id} (${certificateOfAttendanceFile.filename} - ${certificateOfAttendanceFile.mimetype})`,
        fileContent: certificateOfAttendanceFile._buf,
      },
      ...(contractorInvoiceFiles
        ? contractorInvoiceFiles.map((ci, i) => ({
            destinationFileName: `presta${i + 1}_${
              fundingRequest.numAction
            }.${getFilenameExtension(ci.filename)}`,
            destinationPath: "import",
            description: `Facture préstataire ${i + 1} pour paymentRequestId ${paymentRequest.id} (${ci.filename} - ${ci.mimetype})`,
            fileContent: ci._buf,
          }))
        : []),
    ],
  });
};

function getFilenameExtension(filename: string) {
  return filename.split(".").pop();
}
