import {
  CandidacyStatusStep,
  CandidacyTypeAccompagnement,
} from "@prisma/client";

export const canCandidateUpdateCandidacy = async ({
  candidacy,
}: {
  candidacy: {
    status: CandidacyStatusStep;
    typeAccompagnement: CandidacyTypeAccompagnement;
  };
  userRoles?: KeyCloakUserRole[];
}): Promise<boolean> => {
  return (
    ["PROJET", "VALIDATION", "PRISE_EN_CHARGE", "PARCOURS_ENVOYE"].includes(
      candidacy.status,
    ) ||
    (candidacy.typeAccompagnement === "AUTONOME" &&
      candidacy.status === "DOSSIER_FAISABILITE_INCOMPLET")
  );
};
