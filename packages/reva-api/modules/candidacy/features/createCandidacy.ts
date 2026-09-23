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

  // If a certification is provided, we need to check if it exists
  let certification;

  if (certificationId) {
    certification = await prismaClient.certification.findUnique({
      where: { id: certificationId },
    });

    if (!certification) {
      throw new Error("Certification non trouvée");
    }
  }

  // If a cohorte VAE collective is provided, we need to check if it exists
  let cohorteVaeCollective;

  if (cohorteVaeCollectiveId) {
    cohorteVaeCollective = await prismaClient.cohorteVaeCollective.findUnique({
      where: { id: cohorteVaeCollectiveId },
    });

    if (!cohorteVaeCollective) {
      throw new Error("Cohorte VAE collective non trouvée");
    }

    // If a certification is provided, we need to check if it is associated with the cohorte VAE collective
    if (certification) {
      const certificationCohorteVaeCollective =
        await prismaClient.certificationCohorteVaeCollective.findFirst({
          where: {
            cohorteVaeCollectiveId: cohorteVaeCollectiveId,
            certificationId: certification.id,
          },
        });

      if (!certificationCohorteVaeCollective) {
        throw new Error(
          "Certification de la cohorte VAE collective non trouvée",
        );
      }
    }
  }

  // Row-level lock per candidate to avoid duplicate candidacies under concurrency
  // If a diffrent transaction tries to aquire the lock while the first one still holds it, it will fail and rollback
  await prismaClient.$queryRaw`SELECT id FROM candidate WHERE id = ${candidateId}::uuid FOR UPDATE NOWAIT`;
  const candidacy = await prismaClient.candidacy.create({
    data: {
      typeAccompagnement: resolvedTypeAccompagnement,
      candidateId,
      certificationId: certification?.id,
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
      cohorteVaeCollectiveId: cohorteVaeCollective?.id,
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
