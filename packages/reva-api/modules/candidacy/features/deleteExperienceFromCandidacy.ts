import { logCandidacyAuditEvent } from "@/modules/candidacy-log/features/logCandidacyAuditEvent";
import {
  AUCUNE_EXPERIENCE_ETE_TROUVEE,
  CANDIDATURE_NON_TROUVEE,
  IMPOSSIBLE_MODIFIER_EXPERIENCES_APRES_ENVOI_DOSSIER,
} from "@/modules/shared/errors/messages";
import { prismaClient } from "@/prisma/client";

import { canAAPEditExperiences } from "./canAAPEditExperiences";

export const deleteExperienceFromCandidacy = async ({
  candidacyId,
  experienceId,
  userKeycloakId,
  userEmail,
  userRoles,
}: {
  candidacyId: string;
  experienceId: string;
  userKeycloakId?: string;
  userEmail?: string;
  userRoles: KeyCloakUserRole[];
}) => {
  const candidacy = await prismaClient.candidacy.findUnique({
    where: { id: candidacyId },
    select: {
      status: true,
      typeAccompagnement: true,
    },
  });

  if (!candidacy) {
    throw new Error(CANDIDATURE_NON_TROUVEE);
  }

  if (
    userRoles.includes("candidate") &&
    candidacy.typeAccompagnement === "ACCOMPAGNE" &&
    candidacy.status !== "PROJET"
  ) {
    throw new Error(
      "Impossible de supprimer les expériences après avoir envoyé la candidature à l'AAP",
    );
  }

  if (
    userRoles.includes("manage_candidacy") &&
    !canAAPEditExperiences(candidacy.status)
  ) {
    throw new Error(IMPOSSIBLE_MODIFIER_EXPERIENCES_APRES_ENVOI_DOSSIER);
  }

  const experienceToDelete = await prismaClient.experience.findUnique({
    where: {
      id: experienceId,
      candidacyId,
    },
    select: { id: true },
  });

  if (!experienceToDelete) {
    throw new Error(AUCUNE_EXPERIENCE_ETE_TROUVEE);
  }

  await prismaClient.experience.delete({
    where: { id: experienceId, candidacyId },
  });

  await logCandidacyAuditEvent({
    candidacyId,
    eventType: "EXPERIENCE_DELETED",
    userKeycloakId,
    userEmail,
    userRoles,
  });

  return true;
};
