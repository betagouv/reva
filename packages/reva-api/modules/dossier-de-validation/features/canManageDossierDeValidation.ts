import { getAccountByKeycloakId } from "@/modules/account/features/getAccountByKeycloakId";
import { getCertificationAuthorityLocalAccountByAccountId } from "@/modules/certification-authority/features/getCertificationAuthorityLocalAccountByAccountId";
import {
  COMPTE_LOCAL_AUTORITE_CERTIFICATION_NON_TROUVE,
  COMPTE_UTILISATEUR_NON_TROUVE,
  DOSSIER_INTROUVABLE,
} from "@/modules/shared/errors/messages";
import { prismaClient } from "@/prisma/client";

export const canManageDossierDeValidation = async ({
  dossierDeValidationId,
  roles,
  keycloakId,
}: {
  dossierDeValidationId: string;
  roles: string[];
  keycloakId: string;
}) => {
  const dossierDeValidation = await prismaClient.dossierDeValidation.findFirst({
    where: { id: dossierDeValidationId },
    include: {
      candidacy: { include: { Feasibility: { where: { isActive: true } } } },
    },
  });

  if (dossierDeValidation == null) {
    throw new Error(DOSSIER_INTROUVABLE);
  }

  const certificationAuthorityId =
    dossierDeValidation.candidacy.Feasibility?.[0].certificationAuthorityId;

  //admins can manage everything
  if (roles.includes("admin")) {
    return true;
  } else if (roles.includes("manage_feasibility")) {
    //certification authority admin account
    if (roles.includes("manage_certification_authority_local_account")) {
      if (!certificationAuthorityId) {
        return false;
      }

      //is user account attached to a certification authority which manage the candidacy certification ?
      return !!(await prismaClient.account.findFirst({
        where: {
          keycloakId,
          certificationAuthorityOnAccount: { certificationAuthorityId },
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
                candidacyId: dossierDeValidation.candidacyId,
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
