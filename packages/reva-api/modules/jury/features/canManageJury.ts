import { FeasibilityStatus } from "@prisma/client";

import { getAccountByKeycloakId } from "@/modules/account/features/getAccountByKeycloakId";
import { getCertificationAuthorityLocalAccountByAccountId } from "@/modules/certification-authority/features/getCertificationAuthorityLocalAccountByAccountId";
import {
  CANDIDATURE_ETE_ABANDONNEE,
  CANDIDATURE_ETE_SUPPRIMEE,
  CANDIDATURE_NON_TROUVEE,
  COMPTE_UTILISATEUR_NON_TROUVE,
  DOSSIER_FAISABILITE_PAS_RECEVABLE,
} from "@/modules/shared/errors/messages";
import { prismaClient } from "@/prisma/client";

export const canManageJury = async ({
  candidacyId,
  roles,
  keycloakId,
}: {
  candidacyId: string;
  roles: string[];
  keycloakId: string;
}) => {
  const candidacy = await prismaClient.candidacy.findUnique({
    where: { id: candidacyId },
    include: {
      candidacyDropOut: true,
      Feasibility: {
        where: { isActive: true },
      },
    },
  });

  if (!candidacy) {
    throw new Error(CANDIDATURE_NON_TROUVEE);
  }

  if (candidacy.candidacyDropOut) {
    throw new Error(CANDIDATURE_ETE_ABANDONNEE);
  }

  if (candidacy.status === "ARCHIVE") {
    throw new Error(CANDIDATURE_ETE_SUPPRIMEE);
  }

  const feasibility = candidacy.Feasibility[0];
  if (!feasibility) {
    throw new Error("Le dossier de faisabilité n'a pas été trouvé");
  }

  if (feasibility.decision !== FeasibilityStatus.ADMISSIBLE) {
    throw new Error(DOSSIER_FAISABILITE_PAS_RECEVABLE);
  }

  const certificationAuthorityId = feasibility.certificationAuthorityId;

  // admin
  if (roles.includes("admin")) {
    return true;
  }

  // certification authority
  if (!roles.includes("manage_feasibility")) {
    return false;
  }

  // certification authority admin account
  if (roles.includes("manage_certification_authority_local_account")) {
    if (!certificationAuthorityId) {
      return false;
    }

    // is user account attached to a certification authority which manage the candidacy certification
    const authorized = !!(await prismaClient.account.findFirst({
      where: {
        keycloakId,
        certificationAuthorityOnAccount: { certificationAuthorityId },
      },
      select: { id: true },
    }));

    return authorized;
  }

  // certification authority local account
  // check if candidacy department and certification are in the local account access perimeter
  const account = await getAccountByKeycloakId({ keycloakId });
  if (!account) {
    throw new Error(COMPTE_UTILISATEUR_NON_TROUVE);
  }

  const certificationAuthorityLocalAccount =
    await getCertificationAuthorityLocalAccountByAccountId({
      accountId: account.id,
    });
  if (!certificationAuthorityLocalAccount) {
    throw new Error("Compte local d'autorité de certification non trouvé");
  }

  if (
    certificationAuthorityLocalAccount.certificationAuthorityId !==
    certificationAuthorityId
  ) {
    return false;
  }

  //check if the candidacy is assigned to the certification authority local account
  const certificationAuthorityLocalAccountOnCandidacy =
    await prismaClient.certificationAuthorityLocalAccountOnCandidacy.findUnique(
      {
        where: {
          certificationAuthorityLocalAccountId_candidacyId: {
            candidacyId: feasibility.candidacyId,
            certificationAuthorityLocalAccountId:
              certificationAuthorityLocalAccount.id,
          },
        },
      },
    );

  const authorized = !!certificationAuthorityLocalAccountOnCandidacy;

  return authorized;
};
