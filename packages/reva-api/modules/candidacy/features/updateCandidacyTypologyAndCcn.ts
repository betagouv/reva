import { CandidateTypology } from "@prisma/client";

import { logCandidacyAuditEvent } from "@/modules/candidacy-log/features/logCandidacyAuditEvent";
import {
  CANDIDATURE_NON_TROUVEE,
  CONVENTION_COLLECTIVE_EXISTE_PAS,
} from "@/modules/shared/errors/messages";
import { prismaClient } from "@/prisma/client";

export const updateCandidacyTypologyAndCcn = async (
  context: ContextAuth,
  params: {
    candidacyId: string;
    typology: CandidateTypology;
    additionalInformation?: string;
    ccnId?: string;
  },
): Promise<void> => {
  const { candidacyId, typology, additionalInformation, ccnId } = params;

  const candidacy = await prismaClient.candidacy.findUnique({
    where: { id: candidacyId },
    include: {
      Feasibility: {
        where: {
          isActive: true,
        },
      },
    },
  });
  if (!candidacy) {
    throw new Error(CANDIDATURE_NON_TROUVEE);
  }

  if (!candidacy.candidateId) {
    throw new Error(`La candidature n'est pas rattachée à un candidat`);
  }

  let ccn = null;
  if (ccnId) {
    ccn = await prismaClient.candidacyConventionCollective.findUnique({
      where: { id: ccnId },
    });
    if (!ccn) {
      throw new Error(CONVENTION_COLLECTIVE_EXISTE_PAS);
    }
  }

  const ccnRequired =
    typology === CandidateTypology.SALARIE_PRIVE ||
    typology === CandidateTypology.DEMANDEUR_EMPLOI ||
    typology === CandidateTypology.TRAVAILLEUR_NON_SALARIE ||
    typology === CandidateTypology.TITULAIRE_MANDAT_ELECTIF ||
    typology === CandidateTypology.AIDANTS_FAMILIAUX_AGRICOLES;

  if (ccnRequired && !ccnId) {
    throw new Error(
      'Les typologies "SALARIE_PRIVE", "DEMANDEUR_EMPLOI", "TRAVAILLEUR_NON_SALARIE", "TITULAIRE_MANDAT_ELECTIF" et "AIDANTS_FAMILIAUX_AGRICOLES" doivent être associées à une convention collective.',
    );
  }

  const feasibility = candidacy.Feasibility[0];

  const isTypologyAndConventionCollectiveEditable =
    !feasibility ||
    feasibility.decision === "DRAFT" ||
    feasibility.decision === "INCOMPLETE";

  if (!isTypologyAndConventionCollectiveEditable) {
    throw new Error(
      "Le typologie et la convention collective ne peuvent pas être modifiées car un dossier de faisabilité a déjà été soumis.",
    );
  }

  const candidacies = await prismaClient.candidacy.findMany({
    where: { candidateId: candidacy.candidateId },
    select: {
      id: true,
      Feasibility: {
        where: {
          isActive: true,
        },
        select: {
          feasibilityFileSentAt: true,
          dematerializedFeasibilityFile: {
            select: {
              feasibilityFileId: true,
            },
          },
        },
      },
    },
  });

  const candidaciesWithoutFeasibility = candidacies.filter(
    (c) => !c.Feasibility?.[0] || !c.Feasibility?.[0]?.feasibilityFileSentAt,
  );

  await prismaClient.$transaction([
    prismaClient.candidacy.update({
      where: { id: candidacyId },
      data: {
        typology,
        typologyAdditional: additionalInformation,
        ccnId: ccnRequired ? ccnId : null,
      },
    }),
    prismaClient.candidate.update({
      where: { id: candidacy.candidateId },
      data: {
        typology,
        typologyAdditional: additionalInformation,
        ccnId: ccnRequired ? ccnId : null,
      },
    }),
    prismaClient.candidacy.updateMany({
      where: { id: { in: candidaciesWithoutFeasibility.map((c) => c.id) } },
      data: {
        typology,
        typologyAdditional: additionalInformation,
        ccnId: ccnRequired ? ccnId : null,
      },
    }),
  ]);

  await logCandidacyAuditEvent({
    candidacyId: candidacyId,
    eventType: "TYPOLOGY_AND_CCN_INFO_UPDATED",
    userKeycloakId: context.userInfo?.sub,
    userRoles: context.userInfo?.realm_access?.roles || [],
    userEmail: context.userInfo?.email,
    details: {
      ccn: ccn ? { id: ccn.id, label: ccn.label, idcc: ccn.idcc } : undefined,
      typology,
    },
  });
};
