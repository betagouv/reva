export const allowedFileTypesMap = {
  image: ["image/png", "image/jpeg", "image/jpg"],
  pdf: ["application/pdf"],
};

export const allowFileTypeByDocumentType = {
  feasibilityFile: [...allowedFileTypesMap.pdf],
  feasibilityAttachmentFile: [
    ...allowedFileTypesMap.pdf,
    ...allowedFileTypesMap.image,
  ],
  IDFile: [...allowedFileTypesMap.image, ...allowedFileTypesMap.pdf],
  documentaryProofFile: [...allowedFileTypesMap.pdf],
  certificateOfAttendanceFile: [...allowedFileTypesMap.pdf],
  swornStatementFile: [...allowedFileTypesMap.pdf],
  certificationAuthorityDecisionFile: [...allowedFileTypesMap.pdf],
  feasibilityDecisionFile: [...allowedFileTypesMap.pdf],
  dossierDeValidationFile: [
    ...allowedFileTypesMap.image,
    ...allowedFileTypesMap.pdf,
  ],
  dossierDeValidationOtherFiles: [
    ...allowedFileTypesMap.image,
    ...allowedFileTypesMap.pdf,
  ],
  amenagementSpecifiqueJustificationFile: [
    ...allowedFileTypesMap.image,
    ...allowedFileTypesMap.pdf,
  ],
  juryConvocationFile: [...allowedFileTypesMap.pdf],
  juryDecisionFile: [...allowedFileTypesMap.pdf],
  juryDecisionOtherFiles: [
    ...allowedFileTypesMap.image,
    ...allowedFileTypesMap.pdf,
  ],
  maisonMereAAPLegalInformationFile: [
    ...allowedFileTypesMap.pdf,
    ...allowedFileTypesMap.image,
  ],
  dossierDeValidationTemplate: [
    ...allowedFileTypesMap.pdf,
    ...allowedFileTypesMap.image,
  ],
};
