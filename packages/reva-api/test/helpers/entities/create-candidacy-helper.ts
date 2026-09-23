import {
  AccompagnementStatus,
  Candidacy,
  CandidacyStatusStep,
  CandidateTypology,
  FinanceModule,
} from "@prisma/client";

import { prismaClient } from "@/prisma/client";
import {
  BASIC_SKILL_1,
  BASIC_SKILL_2,
} from "@/test/fixtures/basic-skills.fixtures";

import { createCandidateHelper } from "./create-candidate-helper";
import { createCertificationHelper } from "./create-certification-helper";
import { createOrganismHelper } from "./create-organism-helper";

export const createCandidacyHelper = async (args?: {
  candidacyArgs?: Partial<Candidacy>;
  candidacyActiveStatus?: CandidacyStatusStep;
  certificationId?: string;
}) => {
  const { candidacyArgs, candidacyActiveStatus, certificationId } = args ?? {};

  const certification = await createCertificationHelper();
  const candidate = await createCandidateHelper();

  const organism = candidacyArgs?.organismId
    ? await prismaClient.organism.findUnique({
        where: { id: candidacyArgs?.organismId },
      })
    : await createOrganismHelper();

  if (!organism) {
    throw Error("Organism not found");
  }

  const basicSkillId1 = (
    await prismaClient.basicSkill.findFirstOrThrow({
      where: {
        label: BASIC_SKILL_1,
      },
    })
  ).id;

  const basicSkillId2 = (
    await prismaClient.basicSkill.findFirstOrThrow({
      where: {
        label: BASIC_SKILL_2,
      },
    })
  ).id;

  const typeAccompagnement = candidacyArgs?.typeAccompagnement ?? "ACCOMPAGNE";
  const status = candidacyActiveStatus ?? CandidacyStatusStep.PARCOURS_CONFIRME;
  const financeModule = candidacyArgs?.financeModule ?? FinanceModule.unifvae;
  const organismId =
    candidacyArgs && "organismId" in candidacyArgs
      ? candidacyArgs.organismId
      : organism.id;

  const candidacy = await prismaClient.candidacy.create({
    data: {
      typology: CandidateTypology.BENEVOLE,
      financeModule,
      isCertificationPartial: false,
      status,
      basicSkills: {
        createMany: {
          data: [
            { basicSkillId: basicSkillId1 },
            { basicSkillId: basicSkillId2 },
          ],
        },
      },
      certificationId: certificationId ?? certification.id,
      candidateId: candidate.id,
      organismId,
      candidacyStatuses: {
        create: {
          status,
        },
      },
      ...candidacyArgs,
    },
    include: {
      certification: {
        include: {
          certificationAuthorityStructure: {
            include: {
              certificationAuthorityOnCertificationAuthorityStructure: {
                include: {
                  certificationAuthority: { include: { Account: true } },
                },
              },
              certificationRegistryManager: { include: { account: true } },
            },
          },
        },
      },
      organism: {
        include: {
          organismOnAccounts: {
            include: {
              account: true,
            },
          },
        },
      },
      candidate: true,
      candidacyDropOut: true,
      candidacyStatuses: true,
    },
  });

  const finalTypeAccompagnement =
    candidacy.typeAccompagnement ?? typeAccompagnement;

  const shouldCreateAccompagnement =
    status !== CandidacyStatusStep.PROJET &&
    status !== CandidacyStatusStep.ARCHIVE;

  if (finalTypeAccompagnement === "ACCOMPAGNE" && shouldCreateAccompagnement) {
    const endConfirmed =
      candidacy.endAccompagnementStatus === "CONFIRMED_BY_CANDIDATE" ||
      candidacy.endAccompagnementStatus === "CONFIRMED_BY_ADMIN";

    const accompagnementStatus = endConfirmed
      ? AccompagnementStatus.TERMINE
      : candidacy.organismId
        ? AccompagnementStatus.ACTIF
        : AccompagnementStatus.BROUILLON;

    const accompagnement = await prismaClient.accompagnement.create({
      data: {
        candidacyId: candidacy.id,
        status: accompagnementStatus,
        organismId: candidacy.organismId,
        startedAt:
          accompagnementStatus === AccompagnementStatus.BROUILLON
            ? null
            : (candidacy.sentAt ?? candidacy.createdAt),
        endedAt: endConfirmed
          ? (candidacy.endAccompagnementDate ?? new Date())
          : null,
        candidacyStatusAtStart: candidacy.status,
        candidacyStatusAtEnd: endConfirmed ? candidacy.status : null,
        financeModule: candidacy.financeModule,
        individualHourCount: candidacy.individualHourCount,
        collectiveHourCount: candidacy.collectiveHourCount,
        additionalHourCount: candidacy.additionalHourCount,
        certificateSkills: candidacy.certificateSkills,
        otherTraining: candidacy.otherTraining,
        isCertificationPartial: candidacy.isCertificationPartial,
        firstAppointmentOccuredAt: candidacy.firstAppointmentOccuredAt,
        endAccompagnementDate: candidacy.endAccompagnementDate,
        endAccompagnementStatus: candidacy.endAccompagnementStatus,
        endAccompagnementReason: candidacy.endAccompagnementReason,
        endAccompagnementCandidateDropOutReasonId:
          candidacy.endAccompagnementCandidateDropOutReasonId,
      },
    });

    await prismaClient.basicSkillOnCandidacies.updateMany({
      where: { candidacyId: candidacy.id },
      data: { accompagnementId: accompagnement.id },
    });
  }

  return candidacy;
};
