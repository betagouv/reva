import { EndAccompagnementReason } from "@prisma/client";

import { updateCurrentAccompagnementEndFields } from "@/modules/accompagnement/features/accompagnement.helpers";
import { logCandidacyAuditEvent } from "@/modules/candidacy-log/features/logCandidacyAuditEvent";
import { getCandidateLoginUrl } from "@/modules/candidate/utils/candidate.url.helpers";
import { CANDIDATURE_NON_TROUVEE } from "@/modules/shared/errors/messages";
import { prismaClient } from "@/prisma/client";

import { sendEndAccompagnementSubmittedToCandidate } from "../emails/sendEndAccompagnementSubmittedToCandidate";

import { getCandidacyById } from "./getCandidacyById";

const JURY_FULL_SUCCESS_RESULT = [
  "FULL_SUCCESS_OF_FULL_CERTIFICATION",
  "FULL_SUCCESS_OF_PARTIAL_CERTIFICATION",
];

export const submitEndAccompagnement = async ({
  candidacyId,
  endAccompagnementDate,
  endAccompagnementReason,
  endAccompagnementCandidateDropOutReasonId,
  userKeycloakId,
  userEmail,
  userRoles,
}: {
  candidacyId: string;
  endAccompagnementDate: Date;
  endAccompagnementReason: EndAccompagnementReason;
  endAccompagnementCandidateDropOutReasonId?: string;
  userKeycloakId: string;
  userEmail: string;
  userRoles: KeyCloakUserRole[];
}) => {
  const candidacy = await getCandidacyById({
    candidacyId,
    includes: { Jury: true, candidate: true },
  });
  if (!candidacy) {
    throw new Error(CANDIDATURE_NON_TROUVEE);
  }

  const juryHasFullSuccess = candidacy.Jury.find(
    (jury) =>
      jury.isActive && JURY_FULL_SUCCESS_RESULT.includes(jury.result || ""),
  );

  const endAccompagnementStatus = juryHasFullSuccess
    ? "CONFIRMED_BY_ADMIN"
    : "PENDING";

  const updatedCandidacy = await prismaClient.candidacy.update({
    where: { id: candidacyId },
    data: {
      endAccompagnementDate,
      endAccompagnementStatus,
      endAccompagnementReason,
      endAccompagnementCandidateDropOutReasonId,
    },
  });

  await updateCurrentAccompagnementEndFields({
    candidacyId,
    endAccompagnementDate,
    endAccompagnementStatus,
    endAccompagnementReason,
    endAccompagnementCandidateDropOutReasonId:
      endAccompagnementCandidateDropOutReasonId ?? null,
  });

  await logCandidacyAuditEvent({
    candidacyId,
    tx: prismaClient,
    eventType: "END_ACCOMPAGNEMENT_SUBMITTED",
    details: {
      endAccompagnementDate,
    },
    userKeycloakId,
    userEmail,
    userRoles,
  });

  const candidate = candidacy.candidate;

  if (candidate) {
    const candidateFullName = `${candidate.firstname} ${candidate.lastname}`;
    const candidateLoginUrl = getCandidateLoginUrl({
      candidateEmail: candidate.email,
    });
    await sendEndAccompagnementSubmittedToCandidate({
      email: candidate.email,
      candidateFullName,
      candidateLoginUrl,
    });
  }

  return updatedCandidacy;
};
