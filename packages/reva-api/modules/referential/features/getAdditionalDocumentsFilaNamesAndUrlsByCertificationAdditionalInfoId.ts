import { getFileNameAndUrl } from "@/modules/shared/file/getFileNameAndUrl";
import { prismaClient } from "@/prisma/client";

export const getAdditionalDocumentsFilaNamesAndUrlsByCertificationAdditionalInfoId =
  async ({
    certificationAdditionalInfoId,
  }: {
    certificationAdditionalInfoId: string;
  }) => {
    const additionalDocuments =
      await prismaClient.certificationAdditionalInfoAdditionalDocument.findMany(
        {
          where: { certificationAdditionalInfoId },
        },
      );

    const files = await Promise.all(
      additionalDocuments.map((additionalDocument) =>
        getFileNameAndUrl({
          fileId: additionalDocument.fileId,
        }),
      ),
    );

    const nonNullFiles = files.filter((file) => file !== null);

    return nonNullFiles;
  };
