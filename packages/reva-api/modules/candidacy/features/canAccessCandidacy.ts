import { prismaClient } from "@/prisma/client";

export const canAccessCandidacy = async ({
  candidacyId,
  keycloakId,
  roles,
}: {
  candidacyId: string;
  keycloakId: string;
  roles: KeyCloakUserRole[];
}) => {
  const candidacy = await prismaClient.candidacy.findFirst({
    where: { id: candidacyId },
  });

  if (!candidacy) {
    return false;
  }

  if (roles.includes("admin")) {
    return true;
  }

  // Validate keycloakId before using it in queries
  if (!keycloakId || keycloakId.trim() === "") {
    return false;
  }

  //user is candidate
  if (roles.includes("candidate")) {
    const candidate = await prismaClient.candidate.findFirst({
      where: { keycloakId },
    });
    if (!candidate) {
      return false;
    }

    return candidacy?.candidateId === candidate?.id;
  }

  const account = await prismaClient.account.findFirst({
    where: { keycloakId },
    include: {
      organismOnAccounts: true,
      certificationAuthorityLocalAccountOnAccount: true,
    },
  });
  if (!account) {
    return false;
  }

  //user is maison mere manager
  if (roles.includes("gestion_maison_mere_aap")) {
    if (!candidacy.organismId) {
      return false;
    }

    const candidacyOrganism = await prismaClient.organism.findFirst({
      where: { id: candidacy.organismId },
    });

    if (!candidacyOrganism) {
      return false;
    }

    const maisonMere = await prismaClient.maisonMereAAP.findFirst({
      where: { gestionnaireAccountId: account.id },
    });

    if (!maisonMere) {
      return false;
    }

    return candidacyOrganism?.maisonMereAAPId === maisonMere?.id;
  }

  //user is aap
  if (roles.includes("manage_candidacy")) {
    if (!candidacy.organismId) {
      return false;
    }

    const candidacyOrganism = await prismaClient.organism.findFirst({
      where: { id: candidacy.organismId },
    });

    return account.organismOnAccounts.some(
      (organismOnAccount) =>
        organismOnAccount.organismId === candidacyOrganism?.id,
    );
  }

  //user is certification authority admin
  if (roles.includes("manage_certification_authority_local_account")) {
    const candidacyFeasibility = await prismaClient.feasibility.findFirst({
      where: { candidacyId: candidacy.id, isActive: true },
    });

    if (!candidacyFeasibility) {
      return false;
    }

    return (
      candidacyFeasibility.certificationAuthorityId ===
      account.certificationAuthorityId
    );
  }

  //user is certification authority local account owner
  if (roles.includes("manage_feasibility")) {
    const candidacyFeasibility = await prismaClient.feasibility.findFirst({
      where: { candidacyId: candidacy.id, isActive: true },
    });

    if (!candidacyFeasibility) {
      return false;
    }

    if (!account.certificationAuthorityLocalAccountOnAccount) {
      return false;
    }

    const hasCandidacy =
      await prismaClient.certificationAuthorityLocalAccountOnCandidacy.findUnique(
        {
          where: {
            certificationAuthorityLocalAccountId_candidacyId: {
              candidacyId: candidacyId,
              certificationAuthorityLocalAccountId:
                account.certificationAuthorityLocalAccountOnAccount
                  .certificationAuthorityLocalAccountId,
            },
          },
        },
      );

    return !!hasCandidacy;
  }

  return false;
};
