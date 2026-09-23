import { CandidacyStatusStep } from "@prisma/client";

import { createAccompagnement } from "@/modules/accompagnement/features/accompagnement.helpers";
import { getCandidateById } from "@/modules/candidate/features/getCandidateById";
import { isFeatureActiveForUser } from "@/modules/feature-flipping/feature-flipping.features";
import { CANDIDATURE_NON_TROUVEE } from "@/modules/shared/errors/messages";

import { sendConfirmationCandidacySubmissionEmail } from "../emails/sendConfirmationCandidacySubmissionEmail";
import { sendNewCandidacyEmail } from "../emails/sendNewCandidacyEmail";

import { getCandidacyById } from "./getCandidacyById";
import { getReferentOrganismFromCandidacyId } from "./getReferentOrganismFromCandidacyId";
import { updateCandidacyStatus } from "./updateCandidacyStatus";

export const submitCandidacy = async ({
  candidacyId,
}: {
  candidacyId: string;
}) => {
  const candidacyCreationDisabled = await isFeatureActiveForUser({
    feature: "CANDIDACY_CREATION_DISABLED",
  });
  if (candidacyCreationDisabled) {
    throw new Error("La création de candidature est désactivée");
  }

  const candidacy = await getCandidacyById({
    candidacyId,
  });
  if (!candidacy) {
    throw new Error(CANDIDATURE_NON_TROUVEE);
  }

  const validateCandidacyNotAlreadySubmitted =
    candidacy.status === CandidacyStatusStep.PROJET;

  if (!validateCandidacyNotAlreadySubmitted) {
    throw new Error(`Cette candidature a déjà été soumise`);
  }

  const candidate = await getCandidateById({
    candidateId: candidacy.candidateId as string,
  });

  if (!candidate) {
    throw new Error(
      `Impossible de trouver le candidat ${candidacy.candidateId}`,
    );
  }

  const updatedCandidacy = await updateCandidacyStatus({
    candidacyId,
    status: CandidacyStatusStep.VALIDATION,
  });

  const organism = await getReferentOrganismFromCandidacyId({ candidacyId });

  if (!organism) {
    throw new Error(
      `Impossible de trouver l'organisme pour la candidature ${candidacy.id}`,
    );
  }

  await createAccompagnement({
    candidacyId,
    organismId: organism.id,
    candidacyStatusAtStart: CandidacyStatusStep.VALIDATION,
    firstAppointmentOccuredAt: null,
  });

  await sendNewCandidacyEmail({
    email: organism.emailContact || organism.contactAdministrativeEmail,
    candidacyId: candidacy.id,
  });
  await sendConfirmationCandidacySubmissionEmail({
    email: candidate.email as string,
    organismName: organism.label,
    organismEmail: organism.emailContact || organism.contactAdministrativeEmail,
  });

  return updatedCandidacy;
};
