import { v4 as uuidV4 } from "uuid";

import { allowFileTypeByDocumentType } from "@/modules/shared/file/allowFileTypes";
import { deleteFile, uploadFileToS3 } from "@/modules/shared/file/file.service";
import { prismaClient } from "@/prisma/client";

export const storeJustificationFile = async ({
  candidacyId,
  uploadedFile,
}: {
  candidacyId: string;
  uploadedFile: { filename: string; mimetype: string; _buf: Buffer };
}) => {
  const id = uuidV4();
  const path = `candidacies/${candidacyId}/amenagement_specifique/${id}`;

  try {
    await uploadFileToS3({
      filePath: path,
      mimeType: uploadedFile.mimetype,
      data: uploadedFile._buf,
      allowedFileTypes:
        allowFileTypeByDocumentType.amenagementSpecifiqueJustificationFile,
    });
    await prismaClient.file.create({
      data: {
        id,
        name: uploadedFile.filename,
        mimeType: uploadedFile.mimetype,
        path: path,
      },
    });
  } catch (error) {
    await deleteFile(path);
    throw error;
  }

  return {
    id,
    path,
    name: uploadedFile.filename,
    mimeType: uploadedFile.mimetype,
  };
};
