import { createReadStream, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { CertificationStatus } from "@prisma/client";
import { addDays, subDays } from "date-fns";

import * as FILE from "@/modules/shared/file/file.service";
import { prismaClient } from "@/prisma/client";
import { createCertificationAuthorityStructureHelper } from "@/test/helpers/entities/create-certification-authority-structure-helper";
import { createCertificationHelper } from "@/test/helpers/entities/create-certification-helper";

import { updateCertificationAdditionalInfo } from "./updateCertificationAdditionalInfo";

const MISSING_DOSSIER_ERROR =
  "La trame du dossier de validation est requise et doit être transmise soit par fichier PDF ou ODT, soit sous forme de lien.";

const createPendingCertification = async () =>
  createCertificationHelper({
    status: CertificationStatus.A_VALIDER_PAR_CERTIFICATEUR,
    availableAt: subDays(new Date(), 1),
    rncpExpiresAt: addDays(new Date(), 1),
  });

const createPendingReducedRequirementsCertification = async () => {
  const structure = await createCertificationAuthorityStructureHelper({
    hasReducedRequirements: true,
  });

  return createCertificationHelper({
    certificationAuthorityStructureId: structure.id,
    status: CertificationStatus.A_VALIDER_PAR_CERTIFICATEUR,
    availableAt: subDays(new Date(), 1),
    rncpExpiresAt: addDays(new Date(), 1),
  });
};

const ODT_MIME_TYPE = "application/vnd.oasis.opendocument.text";

const createUpload = ({
  filename,
  mimetype,
  content,
}: {
  filename: string;
  mimetype: string;
  content: Buffer;
}): GraphqlUploadedFile =>
  Promise.resolve().then(() => {
    const temporaryDirectory = mkdtempSync(join(tmpdir(), "reva-upload-"));
    const temporaryFilePath = join(temporaryDirectory, filename);

    writeFileSync(temporaryFilePath, content);

    return {
      filename,
      mimetype,
      createReadStream: () => createReadStream(temporaryFilePath),
    };
  });

const createDummyUpload = (): GraphqlUploadedFile =>
  createUpload({
    filename: "dossier-template.pdf",
    mimetype: "application/pdf",
    content: Buffer.from("%PDF-1.4\n%reva-test\n"),
  });

const createOdtUpload = (): GraphqlUploadedFile =>
  createUpload({
    filename: "dossier-template.odt",
    mimetype: ODT_MIME_TYPE,
    // ODT files are zip archives starting with the "PK\x03\x04" signature
    content: Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      Buffer.from(`mimetype${ODT_MIME_TYPE}`),
    ]),
  });

// Keep the real file type validation but skip the S3 upload and existence check
const mockS3UploadWithFileTypeValidation = () =>
  vi
    .spyOn(FILE, "uploadFileToS3")
    .mockImplementation((file: Parameters<typeof FILE.uploadFile>[0]) =>
      FILE.uploadFile(file),
    );

describe("updateCertificationAdditionalInfo", () => {
  it("requires a dossier link or template", async () => {
    const certification = await createPendingCertification();

    await expect(
      updateCertificationAdditionalInfo({
        certificationId: certification.id,
        additionalInfo: {
          linkToReferential: "",
          additionalDocuments: [],
        },
      }),
    ).rejects.toThrow(MISSING_DOSSIER_ERROR);
  });

  it("keeps dossier mutual exclusion", async () => {
    const certification = await createPendingCertification();

    await expect(
      updateCertificationAdditionalInfo({
        certificationId: certification.id,
        additionalInfo: {
          linkToReferential: "",
          additionalDocuments: [],
          dossierDeValidationLink: "https://example.test/dossier",
          dossierDeValidationTemplate: createDummyUpload(),
        },
      }),
    ).rejects.toThrow(MISSING_DOSSIER_ERROR);
  });

  it("allows missing dossier fields when reduced requirements are enabled", async () => {
    const certification = await createPendingReducedRequirementsCertification();

    const additionalInfo = await updateCertificationAdditionalInfo({
      certificationId: certification.id,
      additionalInfo: {
        linkToReferential: "",
        additionalDocuments: [],
      },
    });

    expect(additionalInfo.certificationId).toBe(certification.id);
    expect(additionalInfo.dossierDeValidationTemplateFileId).toBeNull();
    expect(additionalInfo.dossierDeValidationLink).toBeNull();
  });

  it("keeps dossier mutual exclusion when reduced requirements are enabled", async () => {
    const certification = await createPendingReducedRequirementsCertification();

    await expect(
      updateCertificationAdditionalInfo({
        certificationId: certification.id,
        additionalInfo: {
          linkToReferential: "",
          additionalDocuments: [],
          dossierDeValidationLink: "https://example.test/dossier",
          dossierDeValidationTemplate: createDummyUpload(),
        },
      }),
    ).rejects.toThrow(MISSING_DOSSIER_ERROR);
  });

  it("accepts an odt file as dossier de validation template", async () => {
    mockS3UploadWithFileTypeValidation();
    const certification = await createPendingCertification();

    const additionalInfo = await updateCertificationAdditionalInfo({
      certificationId: certification.id,
      additionalInfo: {
        linkToReferential: "",
        additionalDocuments: [],
        dossierDeValidationTemplate: createOdtUpload(),
      },
    });

    const templateFile = await prismaClient.file.findUniqueOrThrow({
      where: { id: additionalInfo.dossierDeValidationTemplateFileId ?? "" },
    });
    expect(templateFile.mimeType).toBe(ODT_MIME_TYPE);
    expect(templateFile.name).toBe("dossier-template.odt");
  });

  it("rejects an odt file as additional document", async () => {
    mockS3UploadWithFileTypeValidation();
    const certification = await createPendingCertification();

    await expect(
      updateCertificationAdditionalInfo({
        certificationId: certification.id,
        additionalInfo: {
          linkToReferential: "",
          additionalDocuments: [createOdtUpload()],
          dossierDeValidationLink: "https://example.test/dossier",
        },
      }),
    ).rejects.toThrow("Le type de fichier n'est pas autorisé");
  });
});
