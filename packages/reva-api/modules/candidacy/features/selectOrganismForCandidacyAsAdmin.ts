import {
  createAccompagnement,
  getCurrentAccompagnement,
  terminateAccompagnement,
} from "@/modules/accompagnement/features/accompagnement.helpers";
import { logCandidacyAuditEvent } from "@/modules/candidacy-log/features/logCandidacyAuditEvent";
import { getOrganismById } from "@/modules/organism/features/getOrganism";
import { getBackofficeUrl } from "@/modules/shared/email/backoffice.url.helpers";
import { sendEmailUsingTemplate } from "@/modules/shared/email/sendEmailUsingTemplate";
import {
  FunctionalCodeError,
  FunctionalError,
} from "@/modules/shared/error/functionalError";
import {
  CANDIDATURE_NON_TROUVEE,
  ERREUR_MISE_A_JOUR_ORGANISME,
  ORGANISME_NON_TROUVE,
} from "@/modules/shared/errors/messages";
import { logger } from "@/modules/shared/logger/logger";
import { prismaClient } from "@/prisma/client";

import { updateCandidacyOrganism } from "./updateCandidacyOrganism";

export const selectOrganismForCandidacyAsAdmin = async ({
  candidacyId,
  organismId,
  userKeycloakId,
  userEmail,
  userRoles,
}: {
  candidacyId: string;
  organismId: string;
  userKeycloakId?: string;
  userEmail?: string;
  userRoles: KeyCloakUserRole[];
}) => {
  const candidacy = await prismaClient.candidacy.findFirst({
    where: { id: candidacyId },
    select: {
      financeModule: true,
      status: true,
      candidate: {
        select: {
          firstname: true,
          lastname: true,
        },
      },
    },
  });

  if (!candidacy) {
    throw new FunctionalError(
      FunctionalCodeError.CANDIDACY_DOES_NOT_EXIST,
      CANDIDATURE_NON_TROUVEE,
    );
  }

  if (candidacy.financeModule != "hors_plateforme") {
    throw new Error(
      "La candidature doit utiliser le module de financement 'hors plateforme'.",
    );
  }

  const organism = await getOrganismById({ organismId });
  if (!organism) {
    throw new Error(ORGANISME_NON_TROUVE);
  }

  try {
    const updatedCandidacy = await updateCandidacyOrganism({
      candidacyId,
      organismId,
    });

    const currentAccompagnement = await getCurrentAccompagnement({
      candidacyId,
    });

    if (
      currentAccompagnement &&
      currentAccompagnement.organismId !== organismId
    ) {
      await terminateAccompagnement({
        accompagnementId: currentAccompagnement?.id,
        endedAt: new Date(),
        candidacyStatusAtEnd: candidacy.status,
        endAccompagnementDate: null,
        endAccompagnementStatus: "NOT_REQUESTED",
        endAccompagnementReason: null,
        endAccompagnementCandidateDropOutReasonId: null,
      });
      await createAccompagnement({
        candidacyId,
        organismId,
        candidacyStatusAtStart: candidacy.status,
        firstAppointmentOccuredAt: null,
      });
    }

    const newAapEmail =
      organism.emailContact || organism.contactAdministrativeEmail;

    await sendEmailUsingTemplate({
      to: { email: newAapEmail },
      templateId: 691,
      params: {
        candidateFullName: `${candidacy.candidate?.lastname} ${candidacy.candidate?.firstname}`,
        candidacyUrl: getBackofficeUrl({
          path: `/candidacies/${candidacyId}/summary`,
        }),
      },
    });

    await logCandidacyAuditEvent({
      candidacyId,
      eventType: "ORGANISM_SELECTED",
      userKeycloakId,
      userEmail,
      userRoles,
      details: { organism: { id: organism.id, label: organism.label } },
    });

    return updatedCandidacy;
  } catch (e) {
    logger.error(e);
    throw new FunctionalError(
      FunctionalCodeError.ORGANISM_NOT_UPDATED,
      ERREUR_MISE_A_JOUR_ORGANISME,
    );
  }
};
