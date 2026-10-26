import { Feasibility } from "@prisma/client";

import { getAccountByKeycloakId } from "@/modules/account/features/getAccountByKeycloakId";
import { getCertificationAuthorityLocalAccountByAccountId } from "@/modules/certification-authority/features/getCertificationAuthorityLocalAccountByAccountId";
import {
  COMPTE_LOCAL_AUTORITE_CERTIFICATION_NON_TROUVE,
  COMPTE_UTILISATEUR_NON_TROUVE,
  DOSSIER_INTROUVABLE,
} from "@/modules/shared/errors/messages";
import { prismaClient } from "@/prisma/client";

export const canManageFeasibility = async ({
  hasRole,
  feasibility,
  keycloakId,
}: {
  hasRole(role: string): boolean;
  feasibility: Feasibility | null;
  keycloakId: string;
}) => {
  if (feasibility == null) {
    throw new Error(DOSSIER_INTROUVABLE);
  }

  //admins can manage everything
  if (hasRole("admin")) {
    return true;
  } else if (hasRole("manage_feasibility")) {
    //certification authority admin account
    if (hasRole("manage_certification_authority_local_account")) {
      if (!feasibility.certificationAuthorityId) {
        return false;
      }

      //is user account attached to a certification authority which manage the candidacy certification ?
      return !!(await prismaClient.account.findFirst({
        where: {
          keycloakId,
          certificationAuthorityOnAccount: {
            certificationAuthorityId: feasibility.certificationAuthorityId,
          },
        },
        select: { id: true },
      }));
    }
    //certification authority local account
    //check if candidacy department and certification are in the local account access perimeter
    else {
      const account = await getAccountByKeycloakId({ keycloakId });
      if (!account) {
        throw new Error(COMPTE_UTILISATEUR_NON_TROUVE);
      }
      const certificationAuthorityLocalAccount =
        await getCertificationAuthorityLocalAccountByAccountId({
          accountId: account.id,
        });

      if (!certificationAuthorityLocalAccount) {
        throw new Error(COMPTE_LOCAL_AUTORITE_CERTIFICATION_NON_TROUVE);
      }

      const hasCandidacy =
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

      return !!hasCandidacy;
    }
  }

  return false;
};
