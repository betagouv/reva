import {
  CandidacyAuditLogUserInfo,
  logCandidacyAuditEvent,
} from "@/modules/candidacy-log/features/logCandidacyAuditEvent";
import {
  CANDIDATURE_NON_TROUVEE,
  CANDIDATURE_PAS_ASSOCIEE_CERTIFICATION,
  CANDIDATURE_PAS_DOSSIER_FAISABILITE_COURS,
  CANDIDAT_ASSOCIE_CANDIDATURE_PAS_RATTACHE_DEPARTEMENT,
  COMPTE_LOCAL_AUTORITE_CERTIFICATION_NON_TROUVE,
  DOSSIER_FAISABILITE_PAS_RELIE_AUTORITE_CERTIFICATION,
} from "@/modules/shared/errors/messages";
import { prismaClient } from "@/prisma/client";

import { sendCandidacyTransferedToOrganismEmail } from "../emails/sendCandidacyTransferedToOrganism";
import { sendCandidacyTransferToCandidate } from "../emails/sendCandidacyTransferToCandidate";
import { sendCandidacyTransferToNewCertificationAuthorityEmail } from "../emails/sendCandidacyTransferToNewCertificationAuthority";
import { sendCandidacyTransferToPreviousCertificationAuthorityEmail } from "../emails/sendCandidacyTransferToPreviousCertificationAuthority";

export const transferCandidacyToCertificationAuthorityLocalAccount =
  async (params: {
    candidacyId: string;
    certificationAuthorityLocalAccountId: string;
    transferReason: string;
    userInfo: CandidacyAuditLogUserInfo;
  }) => {
    const {
      candidacyId,
      certificationAuthorityLocalAccountId,
      transferReason,
      userInfo,
    } = params;

    const candidacy = await prismaClient.candidacy.findUnique({
      where: {
        id: candidacyId,
      },
      include: {
        organism: true,
        candidate: true,
        Feasibility: {
          where: { isActive: true },
          include: { certificationAuthority: true },
        },
      },
    });

    if (!candidacy) {
      throw new Error(CANDIDATURE_NON_TROUVEE);
    }

    if (!candidacy.candidate?.departmentId) {
      throw new Error(CANDIDAT_ASSOCIE_CANDIDATURE_PAS_RATTACHE_DEPARTEMENT);
    }

    if (!candidacy.certificationId) {
      throw new Error(CANDIDATURE_PAS_ASSOCIEE_CERTIFICATION);
    }

    const feasibility = candidacy.Feasibility[0];

    if (!feasibility) {
      throw new Error(CANDIDATURE_PAS_DOSSIER_FAISABILITE_COURS);
    }

    if (!feasibility.certificationAuthorityId) {
      throw new Error(DOSSIER_FAISABILITE_PAS_RELIE_AUTORITE_CERTIFICATION);
    }

    const certificationAuthorityLocalAccount =
      await prismaClient.certificationAuthorityLocalAccount.findUnique({
        where: {
          id: certificationAuthorityLocalAccountId,
        },
        include: {
          certificationAuthorityLocalAccountOnAccount: {
            where: { account: { isApiUser: false } },
            include: { account: true },
          },
        },
      });
    if (!certificationAuthorityLocalAccount) {
      throw new Error(COMPTE_LOCAL_AUTORITE_CERTIFICATION_NON_TROUVE);
    }

    const humanAccount =
      certificationAuthorityLocalAccount
        .certificationAuthorityLocalAccountOnAccount[0]?.account;
    if (!humanAccount) {
      throw new Error(COMPTE_LOCAL_AUTORITE_CERTIFICATION_NON_TROUVE);
    }

    // Vérifier que le compte collaborateur cible est bien rattaché à un gestionnaire de candidatures associé à la structure certificatrice
    let certificationAuthorityIds = [feasibility.certificationAuthorityId];
    const certificationAuthorityStructureRelation =
      await prismaClient.certificationAuthorityOnCertificationAuthorityStructure.findFirst(
        {
          where: {
            certificationAuthorityId: feasibility.certificationAuthorityId,
          },
        },
      );

    if (certificationAuthorityStructureRelation) {
      const certificationAuthorities =
        await prismaClient.certificationAuthorityOnCertificationAuthorityStructure.findMany(
          {
            where: {
              certificationAuthorityStructureId:
                certificationAuthorityStructureRelation.certificationAuthorityStructureId,
            },
          },
        );

      certificationAuthorityIds = certificationAuthorities.map(
        ({ certificationAuthorityId }) => certificationAuthorityId,
      );
    }

    if (
      !certificationAuthorityIds.includes(
        certificationAuthorityLocalAccount.certificationAuthorityId,
      )
    ) {
      throw new Error(
        "Le compte local n'appartient pas à aucun des gestionnaires de candidatures associés à l'autorité de certification",
      );
    }

    await prismaClient.candidacy.update({
      where: {
        id: candidacyId,
      },
      data: {
        certificationAuthorityId:
          certificationAuthorityLocalAccount.certificationAuthorityId,
        certificationAuthorityTransferReason: transferReason,
        Feasibility: {
          updateMany: {
            where: {
              candidacyId,
              isActive: true,
            },
            data: {
              certificationAuthorityId:
                certificationAuthorityLocalAccount.certificationAuthorityId,
            },
          },
        },
        dossierDeValidation: {
          updateMany: {
            where: {
              candidacyId,
              isActive: true,
            },
            data: {
              certificationAuthorityId:
                certificationAuthorityLocalAccount.certificationAuthorityId,
            },
          },
        },
        Jury: {
          updateMany: {
            where: {
              candidacyId,
              isActive: true,
            },
            data: {
              certificationAuthorityId:
                certificationAuthorityLocalAccount.certificationAuthorityId,
            },
          },
        },
      },
    });

    await prismaClient.certificationAuthorityLocalAccountOnCandidacy.deleteMany(
      { where: { candidacyId } },
    );

    await prismaClient.certificationAuthorityLocalAccountOnCandidacy.create({
      data: {
        candidacyId,
        certificationAuthorityLocalAccountId,
        hasBeenTransfered: true,
      },
    });

    const previousCertificationAuthority = feasibility.certificationAuthority;
    let previousCertificationAuthorityName =
      previousCertificationAuthority?.contactFullName ??
      (previousCertificationAuthority?.label as string);

    const candidateName = `${candidacy.candidate?.firstname} ${candidacy.candidate?.lastname}`;

    const { firstname, lastname } = humanAccount;

    let newCertificationAuthorityName = lastname || "";
    if (firstname) {
      newCertificationAuthorityName = newCertificationAuthorityName
        ? `${newCertificationAuthorityName} ${firstname}`
        : newCertificationAuthorityName;
    }

    const organismEmail =
      candidacy.organism?.emailContact ??
      candidacy.organism?.contactAdministrativeEmail;
    const organismName = (candidacy.organism?.nomPublic ??
      candidacy.organism?.label) as string;

    await logCandidacyAuditEvent({
      candidacyId,
      eventType:
        "CANDIDACY_TRANSFERRED_TO_CERTIFICATION_AUTHORITY_LOCAL_ACCOUNT",
      details: {
        certificationAuthorityLocalAccountId,
        certificationAuthorityLocalAccountAccountEmail: humanAccount.email,
        certificationAuthorityTransferReason: transferReason,
      },
      ...userInfo,
    });

    if (userInfo.userKeycloakId) {
      const account = await prismaClient.account.findUnique({
        where: { keycloakId: userInfo.userKeycloakId },
        include: {
          certificationAuthorityLocalAccountOnAccount: {
            include: {
              certificationAuthorityLocalAccount: true,
            },
          },
        },
      });

      const previousCertificationAuthorityLocalAccount =
        account?.certificationAuthorityLocalAccountOnAccount
          ?.certificationAuthorityLocalAccount;

      if (previousCertificationAuthorityLocalAccount) {
        previousCertificationAuthorityName = account.lastname || "";

        if (account.firstname) {
          previousCertificationAuthorityName =
            previousCertificationAuthorityName
              ? `${previousCertificationAuthorityName} ${account.firstname}`
              : previousCertificationAuthorityName;
        }

        await sendCandidacyTransferToPreviousCertificationAuthorityEmail({
          email: account.email,
          previousCertificationAuthorityName,
          newCertificationAuthorityName,
          candidateName,
        });
      } else if (previousCertificationAuthority?.contactEmail) {
        await sendCandidacyTransferToPreviousCertificationAuthorityEmail({
          email: previousCertificationAuthority.contactEmail,
          previousCertificationAuthorityName,
          newCertificationAuthorityName,
          candidateName,
        });
      }
    }

    sendCandidacyTransferToNewCertificationAuthorityEmail({
      email: humanAccount.email,
      previousCertificationAuthorityName,
      candidateName,
      newCertificationAuthorityName,
      transferReason,
      candidacyId,
    });

    if (candidacy.candidate?.email) {
      await sendCandidacyTransferToCandidate({
        email: candidacy.candidate?.email,
        newCertificationAuthorityName,
      });
    }

    if (organismEmail) {
      await sendCandidacyTransferedToOrganismEmail({
        email: organismEmail,
        organismName,
        candidateName,
        certificationAuthorityName: newCertificationAuthorityName,
      });
    }
  };
