import { FeasibilityFormat } from "@prisma/client";

import {
  activateAccompagnement,
  getCurrentAccompagnement,
} from "@/modules/accompagnement/features/accompagnement.helpers";
import {
  CandidacyAuditLogUserInfo,
  logCandidacyAuditEvent,
} from "@/modules/candidacy-log/features/logCandidacyAuditEvent";
import { prismaClient } from "@/prisma/client";

import { getCertificationByCandidacyId } from "../../certification/features/getCertificationByCandidacyId";
import { existsCandidacyWithActiveStatus } from "../../features/existsCandidacyWithActiveStatus";
import { updateCandidacyStatus } from "../../features/updateCandidacyStatus";

export const confirmTrainingFormByCandidate = async ({
  candidacyId,
  userKeycloakId,
  userEmail,
  userRoles,
}: {
  candidacyId: string;
} & CandidacyAuditLogUserInfo) => {
  if (
    !(await existsCandidacyWithActiveStatus({
      candidacyId,
      status: "PARCOURS_ENVOYE",
    }))
  ) {
    throw new Error(
      `Le parcours candidat de la candidature ${candidacyId} ne peut être confirmé`,
    );
  }

  const candidacyCertification = await getCertificationByCandidacyId({
    candidacyId,
  });

  const feasibilityFormat =
    candidacyCertification?.feasibilityFormat as FeasibilityFormat;

  const feasibility = await prismaClient.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM candidacy WHERE id = ${candidacyId}::uuid FOR UPDATE NOWAIT`;
    await tx.candidacy.update({
      where: {
        id: candidacyId,
      },
      data: {
        feasibilityFormat,
      },
    });
    await tx.feasibility.updateMany({
      where: {
        candidacyId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });
    return tx.feasibility.create({
      data: {
        feasibilityFormat,
        candidacyId,
        isActive: true,
      },
    });
  });

  if (feasibilityFormat === "DEMATERIALIZED") {
    await prismaClient.feasibility.update({
      where: {
        id: feasibility.id,
      },
      data: {
        dematerializedFeasibilityFile: {
          create: {},
        },
      },
    });
  }

  const candidacy = await updateCandidacyStatus({
    candidacyId,
    status: "PARCOURS_CONFIRME",
  });

  const currentAccompagnement = await getCurrentAccompagnement({
    candidacyId,
  });

  if (currentAccompagnement && currentAccompagnement.organismId) {
    await activateAccompagnement({
      accompagnementId: currentAccompagnement.id,
      organismId: currentAccompagnement.organismId,
    });
  }

  await logCandidacyAuditEvent({
    candidacyId,
    eventType: "TRAINING_FORM_CONFIRMED",
    userKeycloakId,
    userEmail,
    userRoles,
  });

  return candidacy;
};
