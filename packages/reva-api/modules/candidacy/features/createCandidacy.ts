import {
  CandidacyStatusStep,
  CandidacyTypeAccompagnement,
  CandidateTypology,
} from "@prisma/client";

// import { createAccompagnement } from "@/modules/accompagnement/features/accompagnement.helpers";
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

  const resolvedTypeAccompagnement = typeAccompagnement ?? "ACCOMPAGNE";

  const feasibilityFormat =
    isDfDematAutonomeActive ||
    resolvedTypeAccompagnement === "ACCOMPAGNE" ||
    cohorteVaeCollectiveId
      ? "DEMATERIALIZED"
      : "UPLOADED_PDF";

  let cohorteVaeCollective;

  if (cohorteVaeCollectiveId) {
    cohorteVaeCollective = await prismaClient.cohorteVaeCollective.findUnique({
      where: { id: cohorteVaeCollectiveId },
    });

    if (!cohorteVaeCollective) {
      throw new Error("Cohorte VAÉ collective non trouvée");
    }
  }

  // Row-level lock per candidate to avoid duplicate candidacies under concurrency
  // If a diffrent transaction tries to aquire the lock while the first one still holds it, it will fail and rollback
  await prismaClient.$queryRaw`SELECT id FROM candidate WHERE id = ${candidateId}::uuid FOR UPDATE NOWAIT`;
  const candidacy = await prismaClient.candidacy.create({
    data: {
      typeAccompagnement: resolvedTypeAccompagnement,
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
      organismId: cohorteVaeCollective?.organismId,
      feasibilityFormat,
      candidacyStatuses: {
        create: {
          status: CandidacyStatusStep.PROJET,
        },
      },
      ccnId:
        isDfDematAutonomeActive || resolvedTypeAccompagnement === "ACCOMPAGNE"
          ? candidate?.ccnId
          : null,
      typology:
        isDfDematAutonomeActive || resolvedTypeAccompagnement === "ACCOMPAGNE"
          ? (candidate?.typology ?? CandidateTypology.NON_SPECIFIE)
          : CandidateTypology.NON_SPECIFIE,
      typologyAdditional:
        isDfDematAutonomeActive || resolvedTypeAccompagnement === "ACCOMPAGNE"
          ? candidate?.typologyAdditional
          : null,
    },
  });

  // if (resolvedTypeAccompagnement === "ACCOMPAGNE") {
  //   await createAccompagnement({
  //     candidacyId: candidacy.id,
  //     organismId: cohorteVaeCollective?.organismId,
  //     candidacyStatusAtStart: CandidacyStatusStep.PROJET,
  //     financeModule: "hors_plateforme",
  //   });
  // }

  await refreshCertificationAuthorityOfCandidacy({ candidacyId: candidacy.id });

  return candidacy;
};
