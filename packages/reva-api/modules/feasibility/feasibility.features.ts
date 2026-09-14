import {
  CandidacyStatusStep,
  CertificationAuthority,
  Feasibility,
  FeasibilityStatus,
  Prisma,
} from "@prisma/client";
import { v4 } from "uuid";

import { getBackofficeUrl } from "@/modules/shared/email/backoffice.url.helpers";
import {
  DOSSIER_FAISABILITE_INTROUVABLE,
  DOSSIER_INTROUVABLE,
  FAISABILITE_DEJA_ETE_MARQUEE_DOSSIER,
  FAISABILITE_DEJA_ETE_PRONONCEE_DOSSIER,
  FICHIER_NON_TROUVE,
} from "@/modules/shared/errors/messages";
import { allowFileTypeByDocumentType } from "@/modules/shared/file/allowFileTypes";
import { processPaginationInfo } from "@/modules/shared/list/pagination";
import { getWhereClauseFromSearchFilter } from "@/modules/shared/search/search";
import {
  NOT_AUTHORIZED,
  NOT_AUTHORIZED_DOSSIER_ACCESS,
} from "@/modules/shared/security/messages";
import { prismaClient } from "@/prisma/client";

import { Account } from "../account/account.types";
import { getAccountByKeycloakId } from "../account/features/getAccountByKeycloakId";
import { canManageCandidacy } from "../candidacy/features/canManageCandidacy";
import { updateCandidacyCertificationAuthority } from "../candidacy/features/updateCandidacyCertificationAuthority";
import { updateCandidacyFinanceModule } from "../candidacy/features/updateCandidacyFinanceModule";
import { updateCandidacyStatus } from "../candidacy/features/updateCandidacyStatus";
import { candidacySearchWord } from "../candidacy/utils/candidacy.helper";
import { logCandidacyAuditEvent } from "../candidacy-log/features/logCandidacyAuditEvent";
import { assignCandidacyToCertificationAuthorityLocalAccounts } from "../certification-authority/features/assignCandidacyToCertificationAuthorityLocalAccounts";
import { getCertificationAuthorityLocalAccountByAccountId } from "../certification-authority/features/getCertificationAuthorityLocalAccountByAccountId";
import { getHumanAccountByCertificationAuthorityId } from "../certification-authority/features/getHumanAccountByCertificationAuthorityId";
import { refreshCertificationAuthorityOfCandidacy } from "../certification-authority/features/refreshCertificationAuthorityOfCandidacy";
import { UploadedFile } from "../shared/file/file.interface";
import {
  S3File,
  getDownloadLink,
  uploadFileToS3,
  uploadFilesToS3,
} from "../shared/file/file.service";
import {
  FILE_PREVIEW_ROUTE_PATH_ADMIN_FRONTEND,
  OOS_DOMAIN,
} from "../shared/file/preview";

import { sendFeasibilityDecisionTakenToAAPEmail } from "./emails/sendFeasibilityDecisionTakenToAAPEmail";
import { sendFeasibilityIncompleteMailToAAP } from "./emails/sendFeasibilityIncompleteMailToAAP";
import { sendFeasibilityIncompleteToCandidateAutonomeEmail } from "./emails/sendFeasibilityIncompleteToCandidateAutonomeEmail";
import { sendFeasibilityRejectedToCandidateAccompagneEmail } from "./emails/sendFeasibilityRejectedToCandidateAccompagneEmail";
import { sendFeasibilityRejectedToCandidateAutonomeEmail } from "./emails/sendFeasibilityRejectedToCandidateAutonomeEmail";
import { sendNewFeasibilitySubmittedEmail } from "./emails/sendNewFeasibilitySubmittedEmail";
import { FeasibilityCategoryFilter } from "./feasibility.types";
import { canManageFeasibility } from "./features/canManageFeasibility";
import { deleteFeasibilityIDFile } from "./features/deleteFeasibilityIDFile";
import { getFeasibilityListQueryWhereClauseForUserWithManageFeasibilityRole } from "./features/getFeasibilityListQueryWhereClauseForUserWithManageFeasibilityRole";
import { getWarningOnFeasibilitySubmissionForCandidacyId } from "./features/getWarningOnFeasibealitySubmissionForCandidacyId";
import { throwErrorOnFeasibilitySubmissionWarning } from "./features/throwErrorOnFeasibilitySubmissionWarning";
import { validateFeasibility } from "./features/validateFeasibility";
import {
  FeasibilityStatusFilter,
  excludeArchivedAndDroppedOutCandidacyAndIrrelevantStatuses,
  excludeRejectedArchivedDraftAndDroppedOutCandidacyAndIrrelevantStatuses,
  getWhereClauseFromStatusFilter,
} from "./utils/feasibility.helper";

export const getCertificationAuthorities = async ({
  candidacyId,
}: {
  candidacyId: string;
}) => {
  const candidacy = await prismaClient.candidacy.findUnique({
    where: { id: candidacyId },
    include: { candidate: { select: { departmentId: true } } },
  });

  const certificationId = candidacy?.certificationId;
  const departmentId = candidacy?.candidate?.departmentId;

  return certificationId && departmentId
    ? prismaClient.certificationAuthority.findMany({
        where: {
          certificationAuthorityOnDepartment: { some: { departmentId } },
          certificationAuthorityOnCertification: {
            some: { certificationId },
          },
        },
      })
    : [];
};

export const createFeasibility = async ({
  candidacyId,
  certificationAuthorityId,
  feasibilityFile,
  IDFile,
  documentaryProofFile,
  certificateOfAttendanceFile,
  userKeycloakId,
  userEmail,
  userRoles,
}: {
  candidacyId: string;
  certificationAuthorityId: string;
  feasibilityFile: UploadedFile;
  IDFile: UploadedFile;
  documentaryProofFile?: UploadedFile;
  certificateOfAttendanceFile?: UploadedFile;
  userKeycloakId?: string;
  userEmail: string;
  userRoles: KeyCloakUserRole[];
}) => {
  const allowedStatuesAccompagne: CandidacyStatusStep[] = [
    "PARCOURS_CONFIRME",
    "DOSSIER_FAISABILITE_INCOMPLET",
  ];
  const allowedStatuesAutonome: CandidacyStatusStep[] = [
    "PROJET",
    "DOSSIER_FAISABILITE_INCOMPLET",
  ];

  const candidacy = await prismaClient.candidacy.findUnique({
    where: { id: candidacyId },
    include: {
      candidate: { select: { departmentId: true } },
    },
  });

  // Get the feasibility submission warning
  const feasibilitySubmissionWarning =
    await getWarningOnFeasibilitySubmissionForCandidacyId(candidacyId);

  // Throw error if the feasibility submission warning is not NONE to avoid further processing
  throwErrorOnFeasibilitySubmissionWarning(feasibilitySubmissionWarning);

  const lastStatus = candidacy?.status;

  if (!lastStatus) {
    throw new Error("La candidature n'a aucun statut actif");
  }

  if (
    candidacy.typeAccompagnement === "ACCOMPAGNE" &&
    !allowedStatuesAccompagne.includes(lastStatus)
  ) {
    throw new Error(
      `Le statut de la candidature doit être en "PARCOURS_CONFIRME" ou "DOSSIER_FAISABILITE_INCOMPLET" pour envoyer un dossier de faisabilité.`,
    );
  }

  if (
    candidacy.typeAccompagnement === "AUTONOME" &&
    !allowedStatuesAutonome.includes(lastStatus)
  ) {
    throw new Error(
      `Le statut de la candidature doit être en "PROJET" ou "DOSSIER_FAISABILITE_INCOMPLET" pour envoyer un dossier de faisabilité.`,
    );
  }

  const existingFeasibilityUploadedPdf =
    await prismaClient.feasibility.findFirst({
      where: {
        candidacyId,
        isActive: true,
        feasibilityFormat: "UPLOADED_PDF",
      },
    });

  const isFeasibilityEditableDecision = ["INCOMPLETE", "DRAFT"];

  if (
    existingFeasibilityUploadedPdf &&
    !isFeasibilityEditableDecision.includes(
      existingFeasibilityUploadedPdf.decision,
    )
  ) {
    throw new Error(
      "Un dossier de faisabilité actif existe déjà pour cette candidature",
    );
  }

  const files: S3File[] = [];

  const feasibilityFileInstance: S3File = {
    filePath: `candidacies/${candidacyId}/feasibility/${v4()}`,
    data: feasibilityFile._buf,
    mimeType: feasibilityFile.mimetype,
    allowedFileTypes: allowFileTypeByDocumentType.feasibilityFile,
  };
  files.push(feasibilityFileInstance);

  const IDFileInstance: S3File = {
    filePath: `candidacies/${candidacyId}/feasibility/${v4()}`,
    data: IDFile._buf,
    mimeType: IDFile.mimetype,
    allowedFileTypes: allowFileTypeByDocumentType.IDFile,
  };
  files.push(IDFileInstance);

  let documentaryProofFileInstance: S3File | undefined;
  if (documentaryProofFile) {
    documentaryProofFileInstance = {
      filePath: `candidacies/${candidacyId}/feasibility/${v4()}`,
      data: documentaryProofFile._buf,
      mimeType: documentaryProofFile.mimetype,
      allowedFileTypes: allowFileTypeByDocumentType.documentaryProofFile,
    };
    files.push(documentaryProofFileInstance);
  }

  let certificateOfAttendanceFileInstance: S3File | undefined;
  if (certificateOfAttendanceFile) {
    certificateOfAttendanceFileInstance = {
      filePath: `candidacies/${candidacyId}/feasibility/${v4()}`,
      data: certificateOfAttendanceFile._buf,
      mimeType: certificateOfAttendanceFile.mimetype,
      allowedFileTypes: allowFileTypeByDocumentType.certificateOfAttendanceFile,
    };
    files.push(certificateOfAttendanceFileInstance);
  }

  await uploadFilesToS3(files);

  const feasibilityUploadedPdfData = {
    feasibilityFile: {
      create: {
        mimeType: feasibilityFile.mimetype,
        name: feasibilityFile.filename,
        path: feasibilityFileInstance.filePath,
      },
    },
    IDFile: {
      create: {
        mimeType: IDFile.mimetype,
        name: IDFile.filename,
        path: IDFileInstance.filePath,
      },
    },
    documentaryProofFile: documentaryProofFile
      ? {
          create: {
            mimeType: documentaryProofFile.mimetype,
            name: documentaryProofFile.filename,
            path: documentaryProofFileInstance?.filePath,
          },
        }
      : undefined,
    certificateOfAttendanceFile: certificateOfAttendanceFile
      ? {
          create: {
            mimeType: certificateOfAttendanceFile.mimetype,
            name: certificateOfAttendanceFile.filename,
            path: certificateOfAttendanceFileInstance?.filePath,
          },
        }
      : undefined,
  } as Prisma.FeasibilityUploadedPdfCreateInput;

  const feasibilityData = {
    decision: "PENDING",
    isActive: true,
    candidacy: { connect: { id: candidacyId } },
    certificationAuthority: { connect: { id: certificationAuthorityId } },
    feasibilityFileSentAt: new Date(),
    feasibilityFormat: "UPLOADED_PDF",
  } as Prisma.FeasibilityCreateInput;

  let feasibility: Feasibility & {
    certificationAuthority: CertificationAuthority | null;
  };

  await prismaClient.feasibility.updateMany({
    where: { candidacyId },
    data: { isActive: false },
  });

  if (existingFeasibilityUploadedPdf?.decision === "DRAFT") {
    feasibility = await prismaClient.feasibility.update({
      where: { id: existingFeasibilityUploadedPdf.id },
      data: {
        ...feasibilityData,
        feasibilityUploadedPdf: {
          upsert: {
            create: feasibilityUploadedPdfData,
            update: feasibilityUploadedPdfData,
          },
        },
      },
      include: {
        certificationAuthority: true,
      },
    });
  } else {
    feasibility = await prismaClient.feasibility.create({
      data: {
        ...feasibilityData,
        feasibilityUploadedPdf: { create: feasibilityUploadedPdfData },
      },
      include: {
        certificationAuthority: true,
      },
    });
  }

  // Update certification authority local accounts only if certificationAuthorityId has been changed
  if (
    existingFeasibilityUploadedPdf?.certificationAuthorityId &&
    existingFeasibilityUploadedPdf.certificationAuthorityId !=
      certificationAuthorityId
  ) {
    // Remove candidacy from any certification authority local account
    await prismaClient.certificationAuthorityLocalAccountOnCandidacy.deleteMany(
      {
        where: { candidacyId },
      },
    );

    await assignCandidacyToCertificationAuthorityLocalAccounts({
      candidacyId,
    });
  }

  // Assign certification authority local accounts only on new feasibility or if !existingFeasibility.certificationAuthorityId
  if (
    !existingFeasibilityUploadedPdf ||
    !existingFeasibilityUploadedPdf.certificationAuthorityId
  ) {
    await assignCandidacyToCertificationAuthorityLocalAccounts({
      candidacyId,
    });
  }

  //update the certification authority of the candidacy
  await updateCandidacyCertificationAuthority({
    candidacyId,
    certificationAuthorityId,
  });

  await updateCandidacyStatus({
    candidacyId,
    status: "DOSSIER_FAISABILITE_ENVOYE",
  });

  // If the candidacy is autonomous, we update the finance module to "hors_plateforme"
  // It handles the case where the candidacy was created as 'accompagne' with a unifvae finance module and it switched to autonomous
  if (candidacy.typeAccompagnement === "AUTONOME") {
    await updateCandidacyFinanceModule({
      candidacyId,
      financeModule: "hors_plateforme",
      userInfo: {
        userKeycloakId,
        userEmail,
        userRoles,
      },
    });
  }

  // sending a mail notification to candidacy certification authority and related certification authority local accounts

  const certificationAuthority = feasibility.certificationAuthority;
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
      certificationAuthorityId,
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
    sendNewFeasibilitySubmittedEmail({
      emails,
      feasibilityUrl: getBackofficeUrl({
        path: `/candidacies/${candidacy.id}/feasibility`,
      }),
    });
  }

  await logCandidacyAuditEvent({
    candidacyId,
    userKeycloakId,
    userEmail,
    userRoles,
    eventType: "FEASIBILITY_SENT",
    details: {
      certificationAuthorityId: certificationAuthority?.id,
      certificationAuthorityLabel: certificationAuthority?.label,
    },
  });

  return feasibility;
};

export const getActiveFeasibilityByCandidacyid = async ({
  candidacyId,
}: {
  candidacyId: string;
}) => {
  //Prisma graphql optimization. We start with the candidacy since we can use a unique index
  //It allows prisma to automatically batch the queries in the case of a n+1 graphql query (all the active feasibilities of many candidacies)
  const candidacy = await prismaClient.candidacy.findUnique({
    where: { id: candidacyId },
    include: {
      Feasibility: {
        where: { isActive: true },
        include: {
          certificationAuthority: true,
          feasibilityUploadedPdf: true,
          dematerializedFeasibilityFile: true,
        },
      },
    },
  });

  const activeFeasibility = candidacy?.Feasibility[0];

  return activeFeasibility;
};

export const getFileNameAndUrl = async ({
  candidacyId,
  fileId,
}: {
  candidacyId: string;
  fileId: string;
}) => {
  if (!fileId) {
    return null;
  }

  const file = await prismaClient.file.findFirst({
    where: { id: fileId },
  });

  if (!file) {
    throw new Error(FICHIER_NON_TROUVE);
  }

  const downloadUrl = await getDownloadLink({
    filePath: file.path,
    filename: file.name,
  });

  return {
    createdAt: file.createdAt,
    name: file.name || "",
    mimeType: file.mimeType,
    url: `${process.env.BASE_URL}/api/candidacy/${candidacyId}/feasibility/file/${fileId}`,
    previewUrl: downloadUrl?.replace(
      OOS_DOMAIN,
      FILE_PREVIEW_ROUTE_PATH_ADMIN_FRONTEND,
    ),
  };
};

export const getActiveFeasibilityCountByCategory = async ({
  keycloakId,
  hasRole,
  searchFilter,
  certificationAuthorityId,
  certificationAuthorityLocalAccountId,
  cohorteVaeCollectiveId,
}: {
  keycloakId: string;
  hasRole: (role: string) => boolean;
  searchFilter?: string;
  certificationAuthorityId?: string;
  certificationAuthorityLocalAccountId?: string;
  cohorteVaeCollectiveId?: string;
}) => {
  type FeasibilityCountByCategoryType = Record<FeasibilityStatusFilter, number>;

  let feasibilityCountByCategory: FeasibilityCountByCategoryType = {
    ALL: 0,
    PENDING: 0,
    COMPLETE: 0,
    ADMISSIBLE: 0,
    REJECTED: 0,
    INCOMPLETE: 0,
    ARCHIVED: 0,
    DROPPED_OUT: 0,
    DRAFT: 0,
    VAE_COLLECTIVE: 0,
  };

  if (!hasRole("admin") && !hasRole("manage_feasibility")) {
    throw new Error(NOT_AUTHORIZED);
  }

  const account = await getAccountByKeycloakId({ keycloakId });

  const isCertificationAuthorityLocalAccount =
    !hasRole("admin") &&
    !hasRole("manage_certification_authority_local_account");

  let certificationAuthorityLocalAccount =
    isCertificationAuthorityLocalAccount && account
      ? await getCertificationAuthorityLocalAccountByAccountId({
          accountId: account.id,
        })
      : null;

  let certificationAuthorityAccount: Account | null;

  if (hasRole("admin")) {
    if (certificationAuthorityId) {
      certificationAuthorityAccount = await prismaClient.account.findFirst({
        where: { certificationAuthorityId },
      });
    } else if (certificationAuthorityLocalAccountId) {
      certificationAuthorityLocalAccount =
        await prismaClient.certificationAuthorityLocalAccount.findUnique({
          where: { id: certificationAuthorityLocalAccountId },
          include: {
            certificationAuthorityLocalAccountOnDepartment: true,
            certificationAuthorityLocalAccountOnCertification: true,
          },
        });
    }
  } else if (
    hasRole("manage_certification_authority_local_account") &&
    certificationAuthorityLocalAccountId
  ) {
    if (!account?.certificationAuthorityId) {
      throw new Error(NOT_AUTHORIZED);
    }

    certificationAuthorityLocalAccount =
      await prismaClient.certificationAuthorityLocalAccount.findUnique({
        where: {
          id: certificationAuthorityLocalAccountId,
          certificationAuthorityId: account.certificationAuthorityId,
        },
        include: {
          certificationAuthorityLocalAccountOnDepartment: true,
          certificationAuthorityLocalAccountOnCertification: true,
        },
      });
  }

  const feasibilityCountByCategoryArray = await Promise.all(
    (Object.keys(feasibilityCountByCategory) as FeasibilityStatusFilter[]).map(
      async (statusFilter) => {
        let whereClause: Prisma.FeasibilityWhereInput = {};

        if (!hasRole("admin") && hasRole("manage_feasibility")) {
          if (
            hasRole("manage_certification_authority_local_account") &&
            certificationAuthorityLocalAccountId
          ) {
            whereClause = {
              ...whereClause,
              ...getFeasibilityListQueryWhereClauseForUserWithManageFeasibilityRole(
                {
                  account: null,
                  isCertificationAuthorityLocalAccount: true,
                  certificationAuthorityLocalAccount,
                },
              ),
            };
          } else {
            whereClause = {
              ...whereClause,
              ...getFeasibilityListQueryWhereClauseForUserWithManageFeasibilityRole(
                {
                  account,
                  isCertificationAuthorityLocalAccount,
                  certificationAuthorityLocalAccount,
                },
              ),
            };
          }
        } else if (
          hasRole("admin") &&
          (certificationAuthorityAccount || certificationAuthorityLocalAccount)
        ) {
          if (certificationAuthorityAccount) {
            whereClause = {
              ...whereClause,
              ...getFeasibilityListQueryWhereClauseForUserWithManageFeasibilityRole(
                {
                  account: certificationAuthorityAccount,
                  isCertificationAuthorityLocalAccount: false,
                  certificationAuthorityLocalAccount: null,
                },
              ),
            };
          } else if (certificationAuthorityLocalAccount) {
            whereClause = {
              ...whereClause,
              ...getFeasibilityListQueryWhereClauseForUserWithManageFeasibilityRole(
                {
                  account: null,
                  isCertificationAuthorityLocalAccount: true,
                  certificationAuthorityLocalAccount,
                },
              ),
            };
          }
        }

        let candidacyClause: Prisma.CandidacyWhereInput =
          whereClause?.candidacy || {};

        candidacyClause = {
          ...candidacyClause,
          ...getWhereClauseFromStatusFilter({
            statusFilter,
            cohorteVaeCollectiveId,
          }).candidacy,
          ...getWhereClauseFromSearchFilter(candidacySearchWord, searchFilter),
        };

        whereClause = {
          ...whereClause,
          ...getWhereClauseFromStatusFilter({
            statusFilter,
            cohorteVaeCollectiveId,
          }),
          candidacy: candidacyClause,
        };

        try {
          const value = await prismaClient.feasibility.count({
            where: whereClause,
          });

          return { [statusFilter]: value };
        } catch (error) {
          console.error(error);
        }

        return { [statusFilter]: 0 };
      },
    ),
  );

  for (const feasibilityCountByCategoryItem of feasibilityCountByCategoryArray) {
    feasibilityCountByCategory = {
      ...feasibilityCountByCategory,
      ...feasibilityCountByCategoryItem,
    };
  }

  return feasibilityCountByCategory;
};

export const getActiveFeasibilities = async ({
  keycloakId,
  hasRole,
  limit = 10,
  offset = 0,
  categoryFilter,
  searchFilter,
  certificationAuthorityId,
  certificationAuthorityLocalAccountId,
  cohorteVaeCollectiveId,
}: {
  keycloakId: string;
  hasRole: (role: string) => boolean;
  limit?: number;
  offset?: number;
  categoryFilter?: FeasibilityCategoryFilter;
  searchFilter?: string;
  certificationAuthorityId?: string;
  certificationAuthorityLocalAccountId?: string;
  cohorteVaeCollectiveId?: string;
}): Promise<PaginatedListResult<Feasibility>> => {
  let queryWhereClause: Prisma.FeasibilityWhereInput = { isActive: true };

  switch (categoryFilter) {
    case undefined:
    case "ALL":
      queryWhereClause = {
        ...queryWhereClause,
        ...excludeRejectedArchivedDraftAndDroppedOutCandidacyAndIrrelevantStatuses,
      };
      break;
    case "ARCHIVED":
      queryWhereClause = {
        ...queryWhereClause,
        candidacy: { status: "ARCHIVE" },
      };
      break;
    case "DROPPED_OUT":
      queryWhereClause = {
        ...queryWhereClause,
        candidacy: { candidacyDropOut: { isNot: null } },
      };
      break;

    case "VAE_COLLECTIVE":
      queryWhereClause = {
        ...queryWhereClause,
        candidacy: cohorteVaeCollectiveId
          ? { cohorteVaeCollectiveId }
          : { cohorteVaeCollectiveId: { not: null } },
      };
      break;

    default:
      queryWhereClause = {
        ...queryWhereClause,
        ...excludeArchivedAndDroppedOutCandidacyAndIrrelevantStatuses,
        decision: categoryFilter as FeasibilityStatus,
      };
      break;
  }

  //only list feasibilties linked to the account certification authority
  if (hasRole("manage_feasibility")) {
    const account = await prismaClient.account.findFirstOrThrow({
      where: { keycloakId },
    });

    if (
      hasRole("manage_certification_authority_local_account") &&
      certificationAuthorityLocalAccountId
    ) {
      if (!account.certificationAuthorityId) {
        throw new Error(NOT_AUTHORIZED);
      }

      const certificationAuthorityLocalAccount =
        await prismaClient.certificationAuthorityLocalAccount.findUnique({
          where: {
            id: certificationAuthorityLocalAccountId,
            certificationAuthorityId: account.certificationAuthorityId,
          },
        });

      const candidacyWhereClause = {
        ...queryWhereClause?.candidacy,
        ...getFeasibilityListQueryWhereClauseForUserWithManageFeasibilityRole({
          account: null,
          isCertificationAuthorityLocalAccount: true,
          certificationAuthorityLocalAccount,
        }).candidacy,
      };

      queryWhereClause = {
        ...queryWhereClause,
        ...getFeasibilityListQueryWhereClauseForUserWithManageFeasibilityRole({
          account: null,
          isCertificationAuthorityLocalAccount: true,
          certificationAuthorityLocalAccount,
        }),
        candidacy: candidacyWhereClause,
      };
    } else {
      const isCertificationAuthorityLocalAccount = !hasRole(
        "manage_certification_authority_local_account",
      );

      const certificationAuthorityLocalAccount =
        isCertificationAuthorityLocalAccount
          ? await getCertificationAuthorityLocalAccountByAccountId({
              accountId: account.id,
            })
          : null;

      const candidacyWhereClause = {
        ...queryWhereClause?.candidacy,
        ...getFeasibilityListQueryWhereClauseForUserWithManageFeasibilityRole({
          account,
          isCertificationAuthorityLocalAccount,
          certificationAuthorityLocalAccount,
        }).candidacy,
      };

      queryWhereClause = {
        ...queryWhereClause,
        ...getFeasibilityListQueryWhereClauseForUserWithManageFeasibilityRole({
          account,
          isCertificationAuthorityLocalAccount,
          certificationAuthorityLocalAccount,
        }),
        candidacy: candidacyWhereClause,
      };
    }
  } else if (
    hasRole("admin") &&
    (certificationAuthorityId || certificationAuthorityLocalAccountId)
  ) {
    if (certificationAuthorityId) {
      const account = await prismaClient.account.findFirst({
        where: { certificationAuthorityId },
      });

      if (account) {
        const candidacyWhereClause = {
          ...queryWhereClause?.candidacy,
          ...getFeasibilityListQueryWhereClauseForUserWithManageFeasibilityRole(
            {
              account,
              isCertificationAuthorityLocalAccount: false,
              certificationAuthorityLocalAccount: null,
            },
          ).candidacy,
        };

        queryWhereClause = {
          ...queryWhereClause,
          ...getFeasibilityListQueryWhereClauseForUserWithManageFeasibilityRole(
            {
              account,
              isCertificationAuthorityLocalAccount: false,
              certificationAuthorityLocalAccount: null,
            },
          ),
          candidacy: candidacyWhereClause,
        };
      }
    } else if (certificationAuthorityLocalAccountId) {
      const certificationAuthorityLocalAccount =
        await prismaClient.certificationAuthorityLocalAccount.findUnique({
          where: { id: certificationAuthorityLocalAccountId },
        });

      const candidacyWhereClause = {
        ...queryWhereClause?.candidacy,
        ...getFeasibilityListQueryWhereClauseForUserWithManageFeasibilityRole({
          account: null,
          isCertificationAuthorityLocalAccount: true,
          certificationAuthorityLocalAccount,
        }).candidacy,
      };

      queryWhereClause = {
        ...queryWhereClause,
        ...getFeasibilityListQueryWhereClauseForUserWithManageFeasibilityRole({
          account: null,
          isCertificationAuthorityLocalAccount: true,
          certificationAuthorityLocalAccount,
        }),
        candidacy: candidacyWhereClause,
      };
    }
  } else if (!hasRole("admin")) {
    //admin has access to everything
    throw new Error(NOT_AUTHORIZED);
  }

  if (searchFilter && searchFilter.length > 0) {
    const candidacyClause: Prisma.CandidacyWhereInput =
      queryWhereClause?.candidacy || ({} as const);
    queryWhereClause = {
      ...queryWhereClause,
      candidacy: {
        ...candidacyClause,
        ...getWhereClauseFromSearchFilter(candidacySearchWord, searchFilter),
      },
    };
  }

  const rows = await prismaClient.feasibility.findMany({
    where: queryWhereClause,
    skip: offset,
    take: limit,
    orderBy: [{ feasibilityFileSentAt: "desc" }],
  });

  const totalRows = await prismaClient.feasibility.count({
    where: queryWhereClause,
  });

  const page = {
    rows,
    info: processPaginationInfo({
      limit: limit,
      offset: offset,
      totalRows,
    }),
  };

  return page;
};

export const getFeasibilityById = async ({
  feasibilityId,
  hasRole,
  keycloakId,
}: {
  feasibilityId: string;
  hasRole: (role: string) => boolean;
  keycloakId: string;
}) => {
  const feasibility = await prismaClient.feasibility.findUnique({
    where: { id: feasibilityId },
    include: {
      certificationAuthority: true,
    },
  });

  if (!feasibility) {
    throw new Error(DOSSIER_INTROUVABLE);
  }

  const authorized = await canManageFeasibility({
    hasRole,
    feasibility,
    keycloakId,
  });

  if (hasRole("admin") || authorized) {
    return { ...feasibility };
  } else {
    throw new Error(NOT_AUTHORIZED_DOSSIER_ACCESS);
  }
};

const rejectFeasibility = async ({
  feasibilityId,
  comment,
  hasRole,
  keycloakId,
  userEmail,
  userRoles,
  infoFile,
}: {
  feasibilityId: string;
  comment?: string;
  hasRole: (role: string) => boolean;
  keycloakId: string;
  userEmail: string;
  userRoles: KeyCloakUserRole[];
  infoFile?: UploadedFile;
}) => {
  const feasibility = await prismaClient.feasibility.findUnique({
    where: { id: feasibilityId },
  });

  if (!feasibility) {
    throw new Error(DOSSIER_FAISABILITE_INTROUVABLE);
  }

  const authorized = await canManageFeasibility({
    hasRole,
    feasibility,
    keycloakId,
  });

  if (hasRole("admin") || authorized) {
    if (
      feasibility.decision == FeasibilityStatus.ADMISSIBLE ||
      feasibility.decision == FeasibilityStatus.REJECTED
    ) {
      throw new Error(FAISABILITE_DEJA_ETE_PRONONCEE_DOSSIER);
    }

    let infoFileInstance: S3File | undefined;
    if (infoFile) {
      infoFileInstance = {
        filePath: `candidacies/${feasibility.candidacyId}/feasibility/${v4()}`,
        data: infoFile._buf,
        mimeType: infoFile.mimetype,
        allowedFileTypes: allowFileTypeByDocumentType.feasibilityDecisionFile,
      };

      await uploadFileToS3(infoFileInstance);
    }

    const updatedFeasibility = await prismaClient.feasibility.update({
      where: { id: feasibilityId },
      data: {
        decision: "REJECTED",
        decisionComment: comment,
        decisionSentAt: new Date(),
        decisionFile:
          infoFile && infoFileInstance
            ? {
                create: {
                  mimeType: infoFile.mimetype,
                  name: infoFile.filename,
                  path: infoFileInstance.filePath,
                },
              }
            : undefined,
      },
      include: {
        candidacy: {
          include: {
            candidate: {
              select: { email: true },
            },
            organism: { select: { contactAdministrativeEmail: true } },
            certification: { select: { label: true } },
          },
        },
        certificationAuthority: true,
      },
    });

    await updateCandidacyStatus({
      candidacyId: feasibility.candidacyId,
      status: "DOSSIER_FAISABILITE_NON_RECEVABLE",
    });

    const isAutonome =
      updatedFeasibility.candidacy.typeAccompagnement === "AUTONOME";
    const certificationName =
      updatedFeasibility.candidacy.certification?.label ||
      "certification inconnue";
    const certificationAuthorityLabel =
      updatedFeasibility.certificationAuthority?.label ||
      "certificateur inconnu";
    if (isAutonome) {
      sendFeasibilityRejectedToCandidateAutonomeEmail({
        email: updatedFeasibility.candidacy.candidate?.email as string,
        comment,
        certificationAuthorityLabel,
        certificationName,
        infoFile,
      });
    } else {
      sendFeasibilityRejectedToCandidateAccompagneEmail({
        email: updatedFeasibility.candidacy.candidate?.email as string,
        comment,
        certificationAuthorityLabel,
        certificationName,
        infoFile,
      });

      if (updatedFeasibility.candidacy.organism?.contactAdministrativeEmail) {
        sendFeasibilityDecisionTakenToAAPEmail({
          email:
            updatedFeasibility.candidacy.organism?.contactAdministrativeEmail,
          feasibilityUrl: getBackofficeUrl({
            path: `/candidacies/${updatedFeasibility.candidacy.id}/feasibility-aap/pdf`,
          }),
        });
      }
    }

    // Delete ID File from feasibility
    await deleteFeasibilityIDFile(feasibilityId);
    await logCandidacyAuditEvent({
      candidacyId: feasibility.candidacyId,
      userKeycloakId: keycloakId,
      userEmail,
      userRoles,
      eventType: "FEASIBILITY_REJECTED",
    });

    return updatedFeasibility;
  } else {
    throw new Error(NOT_AUTHORIZED);
  }
};

const markFeasibilityAsIncomplete = async ({
  feasibilityId,
  comment,
  hasRole,
  keycloakId,
  userEmail,
  userRoles,
}: {
  feasibilityId: string;
  comment?: string;
  hasRole: (role: string) => boolean;
  keycloakId: string;
  userEmail: string;
  userRoles: KeyCloakUserRole[];
}) => {
  const feasibility = await prismaClient.feasibility.findUnique({
    where: { id: feasibilityId },
  });

  if (!feasibility) {
    throw new Error(DOSSIER_FAISABILITE_INTROUVABLE);
  }

  const authorized = await canManageFeasibility({
    hasRole,
    feasibility,
    keycloakId,
  });

  if (feasibility && (hasRole("admin") || authorized)) {
    if (
      feasibility.decision == FeasibilityStatus.ADMISSIBLE ||
      feasibility.decision == FeasibilityStatus.REJECTED
    ) {
      throw new Error(FAISABILITE_DEJA_ETE_PRONONCEE_DOSSIER);
    }

    if (
      feasibility.decision == FeasibilityStatus.COMPLETE ||
      feasibility.decision == FeasibilityStatus.INCOMPLETE
    ) {
      throw new Error(FAISABILITE_DEJA_ETE_MARQUEE_DOSSIER);
    }

    const updatedFeasibility = await prismaClient.feasibility.update({
      where: { id: feasibilityId },
      data: {
        decision: "INCOMPLETE",
        decisionComment: comment,
        decisionSentAt: new Date(),
      },
      include: {
        candidacy: {
          include: {
            candidate: {
              select: { email: true },
            },
            organism: { select: { contactAdministrativeEmail: true } },
            certification: { select: { label: true } },
          },
        },
        certificationAuthority: { select: { label: true } },
      },
    });

    await updateCandidacyStatus({
      candidacyId: feasibility?.candidacyId || "",
      status: "DOSSIER_FAISABILITE_INCOMPLET",
    });

    await refreshCertificationAuthorityOfCandidacy({
      candidacyId: feasibility.candidacyId,
    });

    const isAutonome =
      updatedFeasibility.candidacy.typeAccompagnement === "AUTONOME";

    if (isAutonome) {
      const certificationName =
        updatedFeasibility.candidacy.certification?.label ||
        "certification inconnue";
      const certificationAuthorityLabel =
        updatedFeasibility.certificationAuthority?.label ||
        "certificateur inconnu";

      sendFeasibilityIncompleteToCandidateAutonomeEmail({
        email: updatedFeasibility.candidacy.candidate?.email as string,
        comment,
        certificationAuthorityLabel,
        certificationName,
      });
    } else {
      if (updatedFeasibility.candidacy.organism?.contactAdministrativeEmail) {
        sendFeasibilityIncompleteMailToAAP({
          email:
            updatedFeasibility.candidacy.organism?.contactAdministrativeEmail,
          feasibilityUrl: getBackofficeUrl({
            path: `/candidacies/${updatedFeasibility.candidacy.id}/feasibility-aap/pdf`,
          }),
          comment,
        });
      }
    }

    // Delete ID File from feasibility
    await deleteFeasibilityIDFile(feasibilityId);

    await logCandidacyAuditEvent({
      candidacyId: feasibility?.candidacyId,
      userKeycloakId: keycloakId,
      userEmail,
      userRoles,
      eventType: "FEASIBILITY_MARKED_AS_INCOMPLETE",
    });

    return updatedFeasibility;
  } else {
    throw new Error(NOT_AUTHORIZED);
  }
};

const markFeasibilityAsComplete = async ({
  feasibilityId,
  hasRole,
  keycloakId,
  userEmail,
  userRoles,
}: {
  feasibilityId: string;
  hasRole: (role: string) => boolean;
  keycloakId: string;
  userEmail: string;
  userRoles: KeyCloakUserRole[];
}) => {
  const feasibility = await prismaClient.feasibility.findUnique({
    where: { id: feasibilityId },
  });

  if (!feasibility) {
    throw new Error(DOSSIER_FAISABILITE_INTROUVABLE);
  }

  const authorized = await canManageFeasibility({
    hasRole,
    feasibility,
    keycloakId,
  });

  if (feasibility && (hasRole("admin") || authorized)) {
    if (
      feasibility.decision == FeasibilityStatus.ADMISSIBLE ||
      feasibility.decision == FeasibilityStatus.REJECTED
    ) {
      throw new Error(FAISABILITE_DEJA_ETE_PRONONCEE_DOSSIER);
    }

    if (
      feasibility.decision == FeasibilityStatus.COMPLETE ||
      feasibility.decision == FeasibilityStatus.INCOMPLETE
    ) {
      throw new Error(FAISABILITE_DEJA_ETE_MARQUEE_DOSSIER);
    }

    return prismaClient.$transaction(async (tx) => {
      const updatedFeasibility = await tx.feasibility.update({
        where: { id: feasibilityId },
        data: {
          decision: "COMPLETE",
          decisionSentAt: new Date(),
        },
      });

      await updateCandidacyStatus({
        tx,
        candidacyId: feasibility?.candidacyId || "",
        status: "DOSSIER_FAISABILITE_COMPLET",
      });

      await logCandidacyAuditEvent({
        tx,
        candidacyId: feasibility?.candidacyId,
        userKeycloakId: keycloakId,
        userEmail,
        userRoles,
        eventType: "FEASIBILITY_MARKED_AS_COMPLETE",
      });

      return updatedFeasibility;
    });
  } else {
    throw new Error(NOT_AUTHORIZED);
  }
};

export const canDownloadFeasibilityFiles = async ({
  hasRole,
  feasibility,
  candidacyId,
  keycloakId,
}: {
  hasRole(role: string): boolean;
  feasibility: Feasibility | null;
  candidacyId: string;
  keycloakId: string;
}) => {
  return (
    (await canUserManageCandidacy({
      hasRole,
      candidacyId,
      keycloakId,
    })) ||
    (await canManageFeasibility({ hasRole, feasibility, keycloakId })) ||
    (await isCandidacyOwner(keycloakId, candidacyId))
  );
};

const isCandidacyOwner = async (
  keycloakId: string,
  candidacyId: string,
): Promise<boolean> => {
  const candidate = await prismaClient.candidate.findFirst({
    where: { keycloakId },
  });
  if (!candidate) {
    return false;
  }

  const candidacy = await prismaClient.candidacy.findUnique({
    where: { id: candidacyId },
  });
  if (candidacy?.candidateId != candidate.id) {
    return false;
  }

  return true;
};

export const canUserManageCandidacy = async ({
  hasRole,
  candidacyId,
  keycloakId,
}: {
  hasRole(role: string): boolean;
  candidacyId: string;
  keycloakId: string;
}) =>
  await canManageCandidacy({
    hasRole,
    candidacyId,
    keycloakId,
  });

export const getCertificationAuthorityById = async (id: string) => {
  return await prismaClient.certificationAuthority.findUnique({
    where: {
      id,
    },
  });
};

export const handleFeasibilityDecision = async (args: {
  feasibilityId: string;
  decision: string;
  comment?: string;
  hasRole: (role: string) => boolean;
  keycloakId: string;
  userEmail: string;
  userRoles: KeyCloakUserRole[];
  infoFile?: UploadedFile;
}) => {
  const { decision, ...otherParameters } = args;
  switch (decision) {
    case "ADMISSIBLE":
      return validateFeasibility(otherParameters);
    case "REJECTED":
      return rejectFeasibility(otherParameters);
    case "COMPLETE":
      return markFeasibilityAsComplete(otherParameters);
    case "INCOMPLETE":
      return markFeasibilityAsIncomplete(otherParameters);

    default:
      throw new Error(
        `La décision ${decision} est invalide pour le dossier de faisabilité`,
      );
  }
};
