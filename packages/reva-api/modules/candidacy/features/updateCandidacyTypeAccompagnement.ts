import {
  Candidacy,
  CandidacyTypeAccompagnement,
  CandidateTypology,
} from "@prisma/client";

import { isCandidacyStatusEqualOrAboveGivenStatus } from "@/modules/candidacy-menu/features/isCandidacyStatusEqualOrAboveGivenStatus";
import { getCertificationById } from "@/modules/referential/features/getCertificationById";
import { CANDIDATURE_NON_TROUVEE } from "@/modules/shared/errors/messages";
import { prismaClient } from "@/prisma/client";

import { getCandidacyById } from "./getCandidacyById";
import { updateCandidacyStatus } from "./updateCandidacyStatus";

export const updateCandidacyTypeAccompagnement = async ({
  candidacyId,
  typeAccompagnement,
}: {
  candidacyId: string;
  typeAccompagnement: CandidacyTypeAccompagnement;
}): Promise<Candidacy> => {
  const candidacy = await getCandidacyById({
    candidacyId,
    includes: { candidate: true, candidacyDropOut: true },
  });

  if (!candidacy) {
    throw new Error(CANDIDATURE_NON_TROUVEE);
  }

  if (candidacy.candidacyDropOut) {
    throw new Error(
      "Impossible de modifier le type d'accompagnement une fois la candidature abandonnée",
    );
  }

  if (
    candidacy.typeAccompagnement === "ACCOMPAGNE" &&
    isCandidacyStatusEqualOrAboveGivenStatus(candidacy.status)(
      "PARCOURS_CONFIRME",
    )
  ) {
    throw new Error(
      "Impossible de modifier le type d'accompagnement une fois le parcours confirmé",
    );
  }

  if (
    candidacy.typeAccompagnement === "AUTONOME" &&
    candidacy.status !== "PROJET"
  ) {
    throw new Error(
      "Impossible de modifier le type d'accompagnement une fois le dossier de faisabilité envoyé",
    );
  }

  const certification = await getCertificationById({
    certificationId: candidacy.certificationId,
  });

  const isDfDematAutonomeActive = await prismaClient.feature.findFirst({
    where: { key: "DF_DEMAT_AUTONOME", isActive: true },
  });

  return prismaClient.$transaction(async (tx) => {
    await updateCandidacyStatus({ candidacyId, status: "PROJET", tx });

    // Fin d'accompagnement : on archive un éventuel DF dématérialisé pas encore
    // recevable pour que le candidat autonome reparte sur un dépôt de DF au format
    // PDF (sinon la tuile continue de router vers l'écran démat). Un DF déjà
    // recevable (ADMISSIBLE) est conservé tel quel.
    if (!isDfDematAutonomeActive && typeAccompagnement === "AUTONOME") {
      await tx.feasibility.updateMany({
        where: {
          candidacyId,
          isActive: true,
          feasibilityFormat: "DEMATERIALIZED",
          decision: { not: { in: ["ADMISSIBLE", "REJECTED"] } },
        },
        data: { isActive: false },
      });
    }

    return tx.candidacy.update({
      where: { id: candidacyId },
      data: {
        typeAccompagnement,
        organism: { disconnect: true },
        goals: { deleteMany: { candidacyId } },
        experiences: { deleteMany: { candidacyId } },
        basicSkills: { deleteMany: { candidacyId } },
        trainings: { deleteMany: { candidacyId } },
        candidacyOnCandidacyFinancingMethod: { deleteMany: { candidacyId } },
        certificateSkills: null,
        otherTraining: null,
        individualHourCount: null,
        collectiveHourCount: null,
        additionalHourCount: null,
        isCertificationPartial: null,
        firstAppointmentOccuredAt: null,
        ccn:
          (isDfDematAutonomeActive || typeAccompagnement === "ACCOMPAGNE") &&
          candidacy.candidate?.ccnId
            ? { connect: { id: candidacy.candidate.ccnId } }
            : { disconnect: true },
        typology:
          isDfDematAutonomeActive || typeAccompagnement === "ACCOMPAGNE"
            ? (candidacy.candidate?.typology ?? CandidateTypology.NON_SPECIFIE)
            : CandidateTypology.NON_SPECIFIE,
        typologyAdditional:
          isDfDematAutonomeActive || typeAccompagnement === "ACCOMPAGNE"
            ? (candidacy.candidate?.typologyAdditional ?? null)
            : null,
        feasibilityFormat:
          typeAccompagnement === "AUTONOME" && !isDfDematAutonomeActive
            ? "UPLOADED_PDF"
            : certification?.feasibilityFormat,
      },
    });
  });
};
