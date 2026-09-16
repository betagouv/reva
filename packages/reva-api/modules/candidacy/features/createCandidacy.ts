import {
  CandidacyStatusStep,
  CandidacyTypeAccompagnement,
  CandidateTypology,
} from "@prisma/client";

import { refreshCertificationAuthorityOfCandidacy } from "@/modules/certification-authority/features/refreshCertificationAuthorityOfCandidacy";
import { prismaClient } from "@/prisma/client";

export const createCandidacy = async ({
  candidateId,
  typeAccompagnement,
  certificationId,
  cohorteVaeCollectiveId,
}: {
  candidateId: string;
  typeAccompagnement?: CandidacyTypeAccompagnement;
  certificationId?: string;
  cohorteVaeCollectiveId?: string;
}) => {
  const candidate = await prismaClient.candidate.findUnique({
    where: { id: candidateId },
  });

  const isDfDematAutonomeActive = await prismaClient.feature.findFirst({
    where: { key: "DF_DEMAT_AUTONOME", isActive: true },
  });

  const feasibilityFormat =
    isDfDematAutonomeActive ||
    typeAccompagnement === "ACCOMPAGNE" ||
    cohorteVaeCollectiveId
      ? "DEMATERIALIZED"
      : "UPLOADED_PDF";

  // Row-level lock per candidate to avoid duplicate candidacies under concurrency
  // If a diffrent transaction tries to aquire the lock while the first one still holds it, it will fail and rollback
  await prismaClient.$queryRaw`SELECT id FROM candidate WHERE id = ${candidateId}::uuid FOR UPDATE NOWAIT`;
  const candidacy = await prismaClient.candidacy.create({
    data: {
      typeAccompagnement,
      candidateId,
      certificationId,
      admissibility: { create: {} },
      examInfo: { create: {} },
      candidacyCandidateInfo: {
        create: {
          street: candidate?.street,
          city: candidate?.city,
          zip: candidate?.zip,
          addressComplement: candidate?.addressComplement,
        },
      },
      status: "PROJET",
      financeModule: "hors_plateforme",
      cohorteVaeCollectiveId,
      feasibilityFormat,
      candidacyStatuses: {
        create: {
          status: CandidacyStatusStep.PROJET,
        },
      },
      ccnId:
        isDfDematAutonomeActive || typeAccompagnement === "ACCOMPAGNE"
          ? candidate?.ccnId
          : null,
      typology:
        isDfDematAutonomeActive || typeAccompagnement === "ACCOMPAGNE"
          ? (candidate?.typology ?? CandidateTypology.NON_SPECIFIE)
          : CandidateTypology.NON_SPECIFIE,
      typologyAdditional:
        isDfDematAutonomeActive || typeAccompagnement === "ACCOMPAGNE"
          ? candidate?.typologyAdditional
          : null,
    },
  });

  await refreshCertificationAuthorityOfCandidacy({ candidacyId: candidacy.id });

  return candidacy;
};
