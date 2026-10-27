import { v4 as uuidV4 } from "uuid";

import { allowFileTypeByDocumentType } from "@/modules/shared/file/allowFileTypes";
import { deleteFile, uploadFileToS3 } from "@/modules/shared/file/file.service";
import { prismaClient } from "@/prisma/client";

export const AMENAGEMENT_SPECIFIQUE_DESCRIPTION_OBLIGATOIRE =
  "La description de la demande d'aménagement est obligatoire.";

export const AMENAGEMENT_SPECIFIQUE_JUSTIFICATIF_OBLIGATOIRE =
  "Un justificatif est obligatoire pour enregistrer la demande d'aménagement spécifique.";

export const AMENAGEMENT_SPECIFIQUE_DOSSIER_DEJA_ENVOYE =
  "Le dossier de validation a déjà été envoyé. La demande d'aménagement spécifique n'est plus modifiable.";

export const AMENAGEMENT_SPECIFIQUE_FICHIER_TROP_VOLUMINEUX =
  "Le fichier que vous tentez d'envoyer est trop volumineux. Veuillez soumettre un fichier d'une taille inférieure à 10 Mo.";

export const AMENAGEMENT_SPECIFIQUE_FORMAT_NON_SUPPORTE =
  "Le format de fichier n'est pas supporté. Essayez avec un .jpg, .png ou .pdf.";

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
