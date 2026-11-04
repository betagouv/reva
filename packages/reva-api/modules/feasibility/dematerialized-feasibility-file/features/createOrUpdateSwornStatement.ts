import { v4 as uuidV4 } from "uuid";

import { logCandidacyAuditEvent } from "@/modules/candidacy-log/features/logCandidacyAuditEvent";
import { allowFileTypeByDocumentType } from "@/modules/shared/file/allowFileTypes";
import {
  deleteFile,
  emptyUploadedFileStream,
  getUploadedFile,
  uploadFilesToS3,
} from "@/modules/shared/file/file.service";
import { prismaClient } from "@/prisma/client";

import { DematerializedFeasibilityFileCreateOrUpdateSwornStatementInput } from "../dematerialized-feasibility-file.types";

import { getDematerializedFeasibilityFileByCandidacyId } from "./getDematerializedFeasibilityFileByCandidacyId";

const MAX_UPLOAD_SIZE = 2 * 1024 * 1024; // 2MB

export const createOrUpdateSwornStatement = async ({
  input: { swornStatement },
  candidacyId,
  userKeycloakId,
  userEmail,
  userRoles,
}: {
  input: DematerializedFeasibilityFileCreateOrUpdateSwornStatementInput;
  candidacyId: string;
  userKeycloakId?: string;
  userEmail?: string;
  userRoles: KeyCloakUserRole[];
}) => {
  try {
    const dff = await getDematerializedFeasibilityFileByCandidacyId({
      candidacyId,
    });

    if (!dff) {
      throw new Error(
        `Aucun Dossier de faisabilité trouvé pour la candidature ${candidacyId}.`,
      );
    }

    const existingSwornStatementFileId = dff.swornStatementFileId;

    const swornStatementFile = await getUploadedFile(swornStatement);

    const fileId = uuidV4();
    const fileAndId: {
      id: string;
      data: Buffer;
      filePath: string;
      mimeType: string;
      name: string;
      allowedFileTypes: string[];
    } = {
      id: fileId,
      data: swornStatementFile._buf,
      filePath: getFilePath({ candidacyId, fileId }),
      mimeType: swornStatementFile.mimetype,
      name: swornStatementFile.filename,
      allowedFileTypes: allowFileTypeByDocumentType.swornStatementFile,
    };

    if (swornStatementFile._buf.length > MAX_UPLOAD_SIZE) {
      throw new Error(
        `Le fichier ${swornStatementFile.filename} est trop volumineux (${(swornStatementFile._buf.length / 1024 / 1024).toFixed(2)} Mo). La taille maximale autorisée est de ${MAX_UPLOAD_SIZE / 1024 / 1024} Mo.`,
      );
    }

    await uploadFilesToS3([fileAndId]);

    await prismaClient.dematerializedFeasibilityFile.update({
      where: {
        id: dff.id,
      },
      data: {
        attachmentsPartComplete: true,
        swornStatementFile: {
          create: {
            id: fileAndId.id,
            name: fileAndId.name,
            mimeType: fileAndId.mimeType,
            path: fileAndId.filePath,
          },
        },
      },
    });

    logCandidacyAuditEvent({
      candidacyId: candidacyId,
      eventType: "SWORN_STATEMENT_UPDATED",
      userKeycloakId,
      userEmail,
      userRoles,
    });

    if (existingSwornStatementFileId) {
      const existingSwornStatementFile = await prismaClient.file.findUnique({
        where: { id: existingSwornStatementFileId },
      });

      if (existingSwornStatementFile) {
        await deleteFile(existingSwornStatementFile.path);
        await prismaClient.file.delete({
          where: { id: existingSwornStatementFileId },
        });
      }
    }

    return getDematerializedFeasibilityFileByCandidacyId({
      candidacyId,
    });
  } finally {
    //every stream must be emptied otherwise the request will hang
    emptyUploadedFileStream(swornStatement);
  }
};

const getFilePath = ({
  candidacyId,
  fileId,
}: {
  candidacyId: string;
  fileId: string;
}) => `candidacies/${candidacyId}/dff_files/${fileId}`;
