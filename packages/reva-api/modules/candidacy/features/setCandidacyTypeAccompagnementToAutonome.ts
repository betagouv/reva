import { Candidacy, CandidacyStatusStep } from "@prisma/client";

import { getActiveFeasibilityByCandidacyid } from "@/modules/feasibility/feasibility.features";
import { CANDIDATURE_NON_TROUVEE } from "@/modules/shared/errors/messages";
import { prismaClient } from "@/prisma/client";

import { getCandidacyById } from "./getCandidacyById";
import { updateCandidacyStatus } from "./updateCandidacyStatus";

const convertToValidAutonomeStatus = (status: CandidacyStatusStep) => {
  // Les statuts VALIDATION, PRISE_EN_CHARGE, PARCOURS_ENVOYE, PARCOURS_CONFIRME
  // ne sont pas valides pour un autonome, on les rollback vers PROJET
  switch (status) {
    case "VALIDATION":
      return "PROJET";
    case "PRISE_EN_CHARGE":
      return "PROJET";
    case "PARCOURS_ENVOYE":
      return "PROJET";
    case "PARCOURS_CONFIRME":
      return "PROJET";
    default:
      return status;
  }
};

export const setCandidacyTypeAccompagnementToAutonome = async ({
  candidacyId,
}: {
  candidacyId: string;
}): Promise<Candidacy> => {
  const candidacy = await getCandidacyById({ candidacyId });

  if (!candidacy) {
    throw new Error(CANDIDATURE_NON_TROUVEE);
  }

  if (candidacy.typeAccompagnement === "AUTONOME") {
    throw new Error(
      "Impossible de modifier le type d'accompagnement. Le type d'accompagnement est déjà AUTONOME",
    );
  }
  if (candidacy.financeModule !== "hors_plateforme") {
    throw new Error(
      "Impossible de modifier le type d'accompagnement si l'utilisateur n'est pas hors financement",
    );
  }
  // Vérifier si le statut actuel est valide pour un autonome, sinon rollback
  const validStatus = convertToValidAutonomeStatus(candidacy.status);
  const needsStatusRollback = candidacy.status !== validStatus;

  if (candidacy.feasibilityFormat === "DEMATERIALIZED") {
    const activeFeasibility = await getActiveFeasibilityByCandidacyid({
      candidacyId,
    });

    if (activeFeasibility && activeFeasibility.decision !== "ADMISSIBLE") {
      throw new Error(
        "Impossible de modifier le type d'accompagnement d'un DF dématérialisé si la recevabilité n'est pas valide",
      );
    } else if (
      activeFeasibility &&
      activeFeasibility.decision === "ADMISSIBLE"
    ) {
      // On ne modifie pas le format d'un DF déjà admis
      return prismaClient.$transaction(async (tx) => {
        if (needsStatusRollback) {
          await updateCandidacyStatus({
            candidacyId,
            status: validStatus,
            tx,
          });
        }
        return tx.candidacy.update({
          where: { id: candidacyId },
          data: {
            typeAccompagnement: "AUTONOME",
            organism: { disconnect: true },
          },
        });
      });
    }
  }

  const isDfDematAutonomeActive = await prismaClient.feature.findFirst({
    where: { key: "DF_DEMAT_AUTONOME", isActive: true },
  });

  // Si pas de DF envoyé, on passe au DF pdf ou dématérialisé suivant la feature DF_DEMAT_AUTONOME
  return prismaClient.$transaction(async (tx) => {
    if (needsStatusRollback) {
      await updateCandidacyStatus({
        candidacyId,
        status: validStatus,
        tx,
      });
    }
    return tx.candidacy.update({
      where: { id: candidacyId },
      data: {
        typeAccompagnement: "AUTONOME",
        feasibilityFormat: isDfDematAutonomeActive
          ? "DEMATERIALIZED"
          : "UPLOADED_PDF",
        organism: { disconnect: true },
      },
    });
  });
};
