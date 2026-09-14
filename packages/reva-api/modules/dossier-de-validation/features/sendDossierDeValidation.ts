import { CandidacyStatusStep, FeasibilityStatus } from "@prisma/client";
import { v4 as uuidV4 } from "uuid";

import { updateCandidacyStatus } from "@/modules/candidacy/features/updateCandidacyStatus";
import { logCandidacyAuditEvent } from "@/modules/candidacy-log/features/logCandidacyAuditEvent";
import { getHumanAccountByCertificationAuthorityId } from "@/modules/certification-authority/features/getHumanAccountByCertificationAuthorityId";
import {
  CANDIDATURE_ETE_ABANDONNEE,
  CANDIDATURE_ETE_SUPPRIMEE,
  CANDIDATURE_NON_TROUVEE,
  DOSSIER_FAISABILITE_PAS_RECEVABLE,
} from "@/modules/shared/errors/messages";
import { allowFileTypeByDocumentType } from "@/modules/shared/file/allowFileTypes";
import { UploadedFile } from "@/modules/shared/file/file.interface";
import { uploadFileToS3 } from "@/modules/shared/file/file.service";
import { prismaClient } from "@/prisma/client";

import { sendDVSentByCandidateToAapEmail } from "../emails/sendDVSentByCandidateToAapEmail";
import { sendDVSentToCandidateEmail } from "../emails/sendDVSentToCandidateEmail";
import { sendNewDVToCertificationAuthoritiesEmail } from "../emails/sendNewDVToCertificationAuthoritiesEmail";

export const sendDossierDeValidation = async ({
  candidacyId,
  dossierDeValidationFile,
  dossierDeValidationOtherFiles,
  userKeycloakId,
  userEmail,
  userRoles,
}: {
  candidacyId: string;
  dossierDeValidationFile: UploadedFile;
  dossierDeValidationOtherFiles: UploadedFile[];
  userKeycloakId?: string;
  userEmail: string;
  userRoles: KeyCloakUserRole[];
}) => {
  const candidacy = await prismaClient.candidacy.findFirst({
    where: { id: candidacyId },
    include: {
      candidacyDropOut: true,
      candidate: {
        select: {
          email: true,
          departmentId: true,
          lastname: true,
          firstname: true,
        },
      },
      Feasibility: { where: { isActive: true } },
      organism: {
        select: {
          label: true,
          emailContact: true,
          contactAdministrativeEmail: true,
        },
      },
    },
  });

  if (!candidacy) {
    throw new Error(CANDIDATURE_NON_TROUVEE);
  }

  if (candidacy.candidacyDropOut) {
    throw new Error(CANDIDATURE_ETE_ABANDONNEE);
  }

  if (candidacy.status === "ARCHIVE") {
    throw new Error(CANDIDATURE_ETE_SUPPRIMEE);
  }

  if (candidacy.Feasibility?.[0]?.decision !== FeasibilityStatus.ADMISSIBLE) {
    throw new Error(DOSSIER_FAISABILITE_PAS_RECEVABLE);
  }

  const validStatuses: CandidacyStatusStep[] = [
    "DOSSIER_FAISABILITE_RECEVABLE",
    "DOSSIER_FAISABILITE_NON_RECEVABLE",
    "DOSSIER_DE_VALIDATION_SIGNALE",
    "DOSSIER_DE_VALIDATION_ENVOYE",
  ];

  if (!validStatuses.includes(candidacy.status)) {
    throw new Error(
      `Le statut de la candidature doit être ${validStatuses.join(" ou ")}`,
    );
  }

  const activeDossierDeValidation =
    await prismaClient.dossierDeValidation.findFirst({
      where: { candidacyId: candidacy.id, isActive: true },
    });

  const activeJury = await prismaClient.jury.findFirst({
    where: { candidacyId: candidacy.id, isActive: true },
  });

  const failedJuryResults = [
    "PARTIAL_SUCCESS_OF_FULL_CERTIFICATION",
    "PARTIAL_SUCCESS_OF_PARTIAL_CERTIFICATION",
    "PARTIAL_SUCCESS_PENDING_CONFIRMATION",
    "FAILURE",
    "CANDIDATE_EXCUSED",
    "CANDIDATE_ABSENT",
  ];

  const hasFailedJuryResult =
    activeJury?.result && failedJuryResults.includes(activeJury.result);

  if (
    (activeDossierDeValidation?.decision == "PENDING" ||
      activeDossierDeValidation?.decision == "COMPLETE") &&
    !activeJury
  ) {
    throw new Error(
      "Un dossier de validation est en cours de validation par le certificateur.",
    );
  }

  if (
    (activeDossierDeValidation?.decision == "PENDING" ||
      activeDossierDeValidation?.decision == "COMPLETE") &&
    activeJury &&
    !hasFailedJuryResult
  ) {
    throw new Error(
      "Seul un candidat ayant échoué totalement ou partiellement au jury peut renvoyer un dossier de validation.",
    );
  }

  const getFilePath = ({ fileId }: { fileId: string }) =>
    `candidacies/${candidacyId}/dossier_de_validation/${fileId}`;

  const dossierDeValidationFileId = uuidV4();
  const dossierDeValidationFilePath = getFilePath({
    fileId: dossierDeValidationFileId,
  });
  await uploadFileToS3({
    filePath: dossierDeValidationFilePath,
    mimeType: dossierDeValidationFile.mimetype,
    data: dossierDeValidationFile._buf,
    allowedFileTypes: allowFileTypeByDocumentType.dossierDeValidationFile,
  });

  const dossierDeValidationOtherFilesWithIds: {
    file: UploadedFile;
    id: string;
  }[] = dossierDeValidationOtherFiles.map((f) => ({ id: uuidV4(), file: f }));

  for (const d of dossierDeValidationOtherFilesWithIds) {
    const filePath = getFilePath({ fileId: d.id });
    await uploadFileToS3({
      filePath,
      mimeType: d.file.mimetype,
      data: d.file._buf,
      allowedFileTypes:
        allowFileTypeByDocumentType.dossierDeValidationOtherFiles,
    });
  }

  await prismaClient.file.createMany({
    data: dossierDeValidationOtherFilesWithIds.map((d) => ({
      id: d.id,
      mimeType: d.file.mimetype,
      name: d.file.filename,
      path: getFilePath({ fileId: d.id }),
    })),
  });

  await prismaClient.dossierDeValidation.updateMany({
    where: { candidacyId },
    data: { isActive: false },
  });

  const dossierDeValidation = await prismaClient.dossierDeValidation.create({
    data: {
      dossierDeValidationSentAt: new Date(),
      candidacy: { connect: { id: candidacyId } },
      dossierDeValidationFile: {
        create: {
          name: dossierDeValidationFile.filename,
          mimeType: dossierDeValidationFile.mimetype,
          id: dossierDeValidationFileId,
          path: `${dossierDeValidationFilePath}`,
        },
      },
      dossierDeValidationOtherFiles: {
        createMany: {
          data: dossierDeValidationOtherFilesWithIds.map((fileWithId) => ({
            fileId: fileWithId.id,
          })),
        },
      },
      certificationAuthority: {
        connect: {
          id: candidacy.Feasibility[0].certificationAuthorityId || "",
        },
      },
    },
    include: {
      certificationAuthority: true,
    },
  });

  await updateCandidacyStatus({
    candidacyId,
    status: "DOSSIER_DE_VALIDATION_ENVOYE",
  });

  // The candidate send a new DV and will be able to pass the jury again
  if (hasFailedJuryResult) {
    await prismaClient.jury.updateMany({
      where: { candidacyId },
      data: { isActive: false },
    });
  }

  // sending a mail notification to candidacy certification authority and related certification authority local accounts

  const certificationAuthority = dossierDeValidation.certificationAuthority;
  const certificationAuthorityLocalAccounts =
    await prismaClient.certificationAuthorityLocalAccount.findMany({
      where: {
        certificationAuthorityLocalAccountOnCandidacy: {
          some: { candidacyId },
        },
      },
      include: {
        certificationAuthorityLocalAccountOnAccount: {
          where: { account: { isApiUser: false } },
          include: { account: true },
        },
      },
    });

  const emails = [];
  if (certificationAuthority?.contactEmail) {
    emails.push(certificationAuthority?.contactEmail);
  } else {
    const account = await getHumanAccountByCertificationAuthorityId({
      certificationAuthorityId: certificationAuthority?.id || "",
    });
    if (account) {
      emails.push(account.email);
    }
  }

  for (const cala of certificationAuthorityLocalAccounts) {
    for (const {
      account,
    } of cala.certificationAuthorityLocalAccountOnAccount) {
      emails.push(account.email);
    }
  }

  if (emails.length) {
    sendNewDVToCertificationAuthoritiesEmail({
      emails,
      candidacyId,
    });
  }

  const isDVSentByCandidate = userRoles.includes("candidate");

  if (candidacy.candidate?.email) {
    sendDVSentToCandidateEmail({ email: candidacy.candidate.email });
    if (isDVSentByCandidate) {
      sendDVSentByCandidateToAapEmail({
        email:
          candidacy.organism?.emailContact ||
          candidacy.organism?.contactAdministrativeEmail ||
          "",
        candidacyId,
        aapName: candidacy.organism?.label || "",
        candidateName: `${candidacy.candidate.firstname} ${candidacy.candidate.lastname}`,
      });
    }
  }

  await logCandidacyAuditEvent({
    candidacyId,
    userKeycloakId,
    userEmail,
    userRoles,
    eventType: "DOSSIER_DE_VALIDATION_SENT",
  });

  return dossierDeValidation;
};
