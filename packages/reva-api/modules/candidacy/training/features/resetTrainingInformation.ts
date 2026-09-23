import { CandidacyStatusStep } from "@prisma/client";

import { updateCurrentAccompagnementParcours } from "@/modules/accompagnement/features/accompagnement.helpers";
import { logCandidacyAuditEvent } from "@/modules/candidacy-log/features/logCandidacyAuditEvent";
import { CANDIDATURE_NON_TROUVEE } from "@/modules/shared/errors/messages";
import { prismaClient } from "@/prisma/client";

import { updateCandidacyStatus } from "../../features/updateCandidacyStatus";

export const resetTrainingInformation = async ({
  candidacyId,
  updateStatusToValidation,
  userKeycloakId,
  userEmail,
  userRoles,
}: {
  candidacyId: string;
  updateStatusToValidation: boolean;
  userKeycloakId?: string;
  userEmail?: string;
  userRoles: KeyCloakUserRole[];
}) => {
  const candidacy = await prismaClient.candidacy.findUnique({
    where: { id: candidacyId },
    select: {
      id: true,
      status: true,
    },
  });

  if (!candidacy) {
    throw new Error(CANDIDATURE_NON_TROUVEE);
  }

  if (candidacy.status !== "PARCOURS_ENVOYE") {
    throw new Error(
      `Le status ${candidacy.status} de cette candidature permet pas de réinitialiser le parcours envoyé.`,
    );
  }

  await prismaClient.$transaction(async (tx) => {
    await tx.basicSkillOnCandidacies.deleteMany({
      where: {
        candidacyId,
      },
    });
    await tx.trainingOnCandidacies.deleteMany({
      where: {
        candidacyId,
      },
    });
    await tx.candidacyOnCandidacyFinancingMethod.deleteMany({
      where: {
        candidacyId,
      },
    });

    await tx.candidacy.update({
      where: {
        id: candidacyId,
      },
      data: {
        certificateSkills: null,
        otherTraining: null,
        individualHourCount: null,
        collectiveHourCount: null,
        additionalHourCount: null,
        isCertificationPartial: null,
      },
    });

    await updateCurrentAccompagnementParcours({
      candidacyId,
      data: {
        certificateSkills: null,
        otherTraining: null,
        individualHourCount: null,
        collectiveHourCount: null,
        additionalHourCount: null,
        isCertificationPartial: null,
      },
      tx,
    });

    if (updateStatusToValidation) {
      await updateCandidacyStatus({
        candidacyId,
        status: CandidacyStatusStep.VALIDATION,
        tx,
      });
    }
  });

  await logCandidacyAuditEvent({
    candidacyId,
    eventType: "TRAINING_INFO_RESET",
    userKeycloakId,
    userEmail,
    userRoles,
  });
};
