import { v4 as uuidV4 } from "uuid";

import { CERTIFICATION_PAS_ETE_TROUVEE } from "@/modules/shared/errors/messages";
import {
  allowedFileTypesMap,
  allowFileTypeByDocumentType,
} from "@/modules/shared/file/allowFileTypes";
import {
  deleteFile,
  getUploadedFile,
  uploadFileToS3,
} from "@/modules/shared/file/file.service";
import { prismaClient } from "@/prisma/client";

import { UpdateCertificationAdditionalInfoInput } from "../referential.types";

import { getCertificationWithReducedRequirementsById } from "./getCertificationWithReducedRequirementsById";

const MAX_UPLOAD_SIZE = 15728640; // 15Mo

export const updateCertificationAdditionalInfo = async ({
  certificationId,
  additionalInfo,
}: UpdateCertificationAdditionalInfoInput) => {
  const [certification, existingInfo] = await Promise.all([
    getCertificationWithReducedRequirementsById({
      certificationId,
    }),
    prismaClient.certificationAdditionalInfo.findUnique({
      where: {
        certificationId,
      },
      include: {
        dossierDeValidationTemplate: true,
        additionalDocuments: { include: { file: true } },
      },
    }),
  ]);

  if (!certification) {
    throw new Error(CERTIFICATION_PAS_ETE_TROUVEE);
  }

  const { dossierDeValidationTemplate, additionalDocuments, ...otherInfo } =
    additionalInfo;

  const hasReducedRequirements =
    certification.certificationAuthorityStructure?.hasReducedRequirements ??
    false;
  const hasDossierDeValidationLink = Boolean(otherInfo.dossierDeValidationLink);
  const hasDossierDeValidationTemplate = Boolean(dossierDeValidationTemplate);

  if (hasDossierDeValidationLink && hasDossierDeValidationTemplate) {
    throw new Error(
      "La trame du dossier de validation est requise et doit être transmise soit par fichier PDF ou ODT, soit sous forme de lien.",
    );
  }

  if (
    !hasReducedRequirements &&
    !hasDossierDeValidationLink &&
    !hasDossierDeValidationTemplate
  ) {
    throw new Error(
      "La trame du dossier de validation est requise et doit être transmise soit par fichier PDF ou ODT, soit sous forme de lien.",
    );
  }

  // remove existing dossier de validation template if it exists
  if (existingInfo?.dossierDeValidationTemplate) {
    await deleteFile(existingInfo.dossierDeValidationTemplate.path);

    await prismaClient.file.delete({
      where: {
        id: existingInfo.dossierDeValidationTemplate.id,
      },
    });
  }

  let dossierDeValidationTemplateId: string | undefined;

  // upload dossier de validation template if it exists
  if (dossierDeValidationTemplate) {
    dossierDeValidationTemplateId = uuidV4();
    const filePath = `certifications/${certificationId}/dv_templates/${dossierDeValidationTemplateId}`;
    await uploadFile({
      fileId: dossierDeValidationTemplateId,
      filePath,
      graphqlUploadedFile: dossierDeValidationTemplate,
      allowedFileTypes: allowFileTypeByDocumentType.dossierDeValidationTemplate,
    });
  }

  // remove existing additional documents if they exist
  if (existingInfo?.additionalDocuments) {
    for (const additionalDocument of existingInfo.additionalDocuments) {
      await deleteFile(additionalDocument.file.path);
      await prismaClient.file.delete({
        where: { id: additionalDocument.file.id },
      });
    }
  }

  // upload additional documents if they exist
  const additionalDocumentsIds: string[] = [];
  const additionalDocumentAllowedFileTypes = [
    ...allowedFileTypesMap.pdf,
    ...allowedFileTypesMap.image,
  ];
  for (const additionalDocument of additionalDocuments) {
    const fileId = uuidV4();
    const filePath = `certifications/${certificationId}/additional_documents/${fileId}`;
    await uploadFile({
      fileId,
      filePath,
      graphqlUploadedFile: additionalDocument,
      allowedFileTypes: additionalDocumentAllowedFileTypes,
    });
    additionalDocumentsIds.push(fileId);
  }

  // remove existing additional info if it exists before recreating it
  if (existingInfo) {
    await prismaClient.certificationAdditionalInfo.delete({
      where: { id: existingInfo.id },
    });
  }

  //(re)create additional info
  return prismaClient.certificationAdditionalInfo.create({
    data: {
      certificationId,
      dossierDeValidationTemplateFileId: dossierDeValidationTemplateId,
      additionalDocuments: {
        createMany: {
          data: additionalDocumentsIds.map((id) => ({
            fileId: id,
          })),
        },
      },
      ...otherInfo,
    },
  });
};

const uploadFile = async ({
  fileId,
  filePath,
  graphqlUploadedFile,
  allowedFileTypes,
}: {
  fileId: string;
  filePath: string;
  graphqlUploadedFile: GraphqlUploadedFile;
  allowedFileTypes: string[];
}) => {
  const uploadedFile = await getUploadedFile(graphqlUploadedFile);

  if (uploadedFile._buf.length > MAX_UPLOAD_SIZE) {
    throw new Error(
      `Le fichier ${uploadedFile.filename} est trop volumineux (${(uploadedFile._buf.length / 1024 / 1024).toFixed(2)} Mo). La taille maximale autorisée est de ${MAX_UPLOAD_SIZE / 1024 / 1024} Mo.`,
    );
  }

  await uploadFileToS3({
    data: uploadedFile._buf,
    filePath,
    mimeType: uploadedFile.mimetype,
    allowedFileTypes,
  });

  await prismaClient.file.create({
    data: {
      id: fileId,
      path: filePath,
      mimeType: uploadedFile.mimetype,
      name: uploadedFile.filename,
    },
  });
};
