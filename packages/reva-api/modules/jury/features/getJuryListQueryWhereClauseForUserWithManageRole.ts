import { Prisma, CertificationAuthorityLocalAccount } from "@prisma/client";

import { COMPTE_LOCAL_AUTORITE_CERTIFICATION_NON_TROUVEE } from "@/modules/shared/errors/messages";

export const getJuryListQueryWhereClauseForUserWithManageRole = ({
  certificationAuthorityId,
  isCertificationAuthorityLocalAccount,
  certificationAuthorityLocalAccount,
}: {
  certificationAuthorityId: string | null | undefined;
  isCertificationAuthorityLocalAccount: boolean;
  certificationAuthorityLocalAccount: CertificationAuthorityLocalAccount | null;
}): Prisma.JuryWhereInput => {
  let queryWhereClause: Prisma.JuryWhereInput = {};

  // For certification authority local accounts we restric matches to the local account own departments and certifications
  if (isCertificationAuthorityLocalAccount) {
    if (!certificationAuthorityLocalAccount) {
      throw new Error(COMPTE_LOCAL_AUTORITE_CERTIFICATION_NON_TROUVEE);
    }

    queryWhereClause = {
      ...queryWhereClause,
      certificationAuthorityId:
        certificationAuthorityLocalAccount?.certificationAuthorityId,
      candidacy: {
        certificationAuthorityLocalAccountOnCandidacy: {
          some: {
            certificationAuthorityLocalAccountId:
              certificationAuthorityLocalAccount.id,
          },
        },
      },
    };
  } else {
    queryWhereClause = {
      ...queryWhereClause,
      certificationAuthorityId: certificationAuthorityId || "_",
    };
  }

  return queryWhereClause;
};
