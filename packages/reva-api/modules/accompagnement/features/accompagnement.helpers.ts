import {
  Accompagnement,
  AccompagnementStatus,
  CandidacyStatusStep,
  EndAccompagnementReason,
  EndAccompagnementStatus,
  FinanceModule,
  Prisma,
} from "@prisma/client";

import { prismaClient } from "@/prisma/client";

type PrismaClientOrTransaction = Prisma.TransactionClient | typeof prismaClient;

const getClient = (tx?: PrismaClientOrTransaction) => tx ?? prismaClient;

export const getCurrentAccompagnement = async ({
  candidacyId,
  tx,
}: {
  candidacyId: string;
  tx?: PrismaClientOrTransaction;
}): Promise<Accompagnement | null> =>
  getClient(tx).accompagnement.findFirst({
    where: {
      candidacyId,
      status: {
        in: [AccompagnementStatus.BROUILLON, AccompagnementStatus.ACTIF],
      },
    },
  });

export const createAccompagnement = async ({
  candidacyId,
  organismId,
  status = AccompagnementStatus.BROUILLON,
  candidacyStatusAtStart = CandidacyStatusStep.PROJET,
  financeModule = FinanceModule.hors_plateforme,
  individualHourCount,
  collectiveHourCount,
  additionalHourCount,
  certificateSkills,
  otherTraining,
  isCertificationPartial,
  firstAppointmentOccuredAt,
  endAccompagnementDate,
  endAccompagnementStatus,
  endAccompagnementReason,
  endAccompagnementCandidateDropOutReasonId,
  tx,
}: {
  candidacyId: string;
  organismId?: string | null;
  status?: AccompagnementStatus;
  candidacyStatusAtStart?: CandidacyStatusStep;
  financeModule?: FinanceModule;
  individualHourCount?: number | null;
  collectiveHourCount?: number | null;
  additionalHourCount?: number | null;
  certificateSkills?: string | null;
  otherTraining?: string | null;
  isCertificationPartial?: boolean | null;
  firstAppointmentOccuredAt?: Date | null;
  endAccompagnementDate?: Date | null;
  endAccompagnementStatus?: EndAccompagnementStatus;
  endAccompagnementReason?: EndAccompagnementReason | null;
  endAccompagnementCandidateDropOutReasonId?: string | null;
  tx?: PrismaClientOrTransaction;
}): Promise<Accompagnement> => {
  // const hasOrganism = !!organismId;
  return getClient(tx).accompagnement.create({
    data: {
      candidacyId,
      organismId: organismId ?? null,
      status,
      startedAt: null,
      candidacyStatusAtStart,
      financeModule,
      individualHourCount: individualHourCount ?? null,
      collectiveHourCount: collectiveHourCount ?? null,
      additionalHourCount: additionalHourCount ?? null,
      certificateSkills: certificateSkills ?? null,
      otherTraining: otherTraining ?? null,
      isCertificationPartial: isCertificationPartial ?? null,
      firstAppointmentOccuredAt: firstAppointmentOccuredAt ?? null,
      endAccompagnementDate: endAccompagnementDate ?? null,
      endAccompagnementStatus:
        endAccompagnementStatus ?? EndAccompagnementStatus.NOT_REQUESTED,
      endAccompagnementReason: endAccompagnementReason ?? null,
      endAccompagnementCandidateDropOutReasonId:
        endAccompagnementCandidateDropOutReasonId ?? null,
    },
  });
};

export const activateAccompagnement = async ({
  accompagnementId,
  organismId,
  tx,
}: {
  accompagnementId: string;
  organismId: string;
  tx?: PrismaClientOrTransaction;
}): Promise<Accompagnement> =>
  getClient(tx).accompagnement.update({
    where: { id: accompagnementId },
    data: {
      organismId,
      status: AccompagnementStatus.ACTIF,
      startedAt: new Date(),
      endedAt: null,
    },
  });

// export const updateAccompagnementOrganism = async ({
//   accompagnementId,
//   organismId,
//   tx,
// }: {
//   accompagnementId: string;
//   organismId: string;
//   tx?: PrismaClientOrTransaction;
// }): Promise<Accompagnement> => {
//   const accompagnement = await getClient(tx).accompagnement.findUnique({
//     where: { id: accompagnementId },
//   });

//   if (!accompagnement) {
//     throw new Error("Accompagnement non trouvé");
//   }

//   if (accompagnement.status === AccompagnementStatus.BROUILLON) {
//     return activateAccompagnement({ accompagnementId, organismId, tx });
//   }

//   return getClient(tx).accompagnement.update({
//     where: { id: accompagnementId },
//     data: { organismId },
//   });
// };

export const terminateAccompagnement = async ({
  accompagnementId,
  endedAt = new Date(),
  candidacyStatusAtEnd,
  endAccompagnementDate,
  endAccompagnementStatus,
  endAccompagnementReason,
  endAccompagnementCandidateDropOutReasonId,
  tx,
}: {
  accompagnementId: string;
  endedAt?: Date;
  candidacyStatusAtEnd?: CandidacyStatusStep | null;
  endAccompagnementDate?: Date | null;
  endAccompagnementStatus?: EndAccompagnementStatus;
  endAccompagnementReason?: EndAccompagnementReason | null;
  endAccompagnementCandidateDropOutReasonId?: string | null;
  tx?: PrismaClientOrTransaction;
}): Promise<Accompagnement> =>
  getClient(tx).accompagnement.update({
    where: { id: accompagnementId },
    data: {
      status: AccompagnementStatus.TERMINE,
      endedAt,
      candidacyStatusAtEnd: candidacyStatusAtEnd ?? undefined,
      ...(endAccompagnementDate !== undefined ? { endAccompagnementDate } : {}),
      ...(endAccompagnementStatus !== undefined
        ? { endAccompagnementStatus }
        : {}),
      ...(endAccompagnementReason !== undefined
        ? { endAccompagnementReason }
        : {}),
      ...(endAccompagnementCandidateDropOutReasonId !== undefined
        ? { endAccompagnementCandidateDropOutReasonId }
        : {}),
    },
  });

export const updateCurrentAccompagnementParcours = async ({
  candidacyId,
  data,
  tx,
}: {
  candidacyId: string;
  data: {
    certificateSkills?: string | null;
    otherTraining?: string | null;
    individualHourCount?: number | null;
    collectiveHourCount?: number | null;
    additionalHourCount?: number | null;
    isCertificationPartial?: boolean | null;
    firstAppointmentOccuredAt?: Date | null;
  };
  tx?: PrismaClientOrTransaction;
}): Promise<Accompagnement | null> => {
  const current = await getCurrentAccompagnement({ candidacyId, tx });
  if (!current) {
    return null;
  }

  return getClient(tx).accompagnement.update({
    where: { id: current.id },
    data,
  });
};

export const updateCurrentAccompagnementFinanceModule = async ({
  candidacyId,
  financeModule,
  tx,
}: {
  candidacyId: string;
  financeModule: FinanceModule;
  tx?: PrismaClientOrTransaction;
}): Promise<Accompagnement | null> => {
  const current = await getCurrentAccompagnement({ candidacyId, tx });
  if (!current) {
    return null;
  }

  return getClient(tx).accompagnement.update({
    where: { id: current.id },
    data: { financeModule },
  });
};

export const updateCurrentAccompagnementEndFields = async ({
  candidacyId,
  endAccompagnementDate,
  endAccompagnementStatus,
  endAccompagnementReason,
  endAccompagnementCandidateDropOutReasonId,
  tx,
}: {
  candidacyId: string;
  endAccompagnementDate?: Date | null;
  endAccompagnementStatus?: EndAccompagnementStatus;
  endAccompagnementReason?: EndAccompagnementReason | null;
  endAccompagnementCandidateDropOutReasonId?: string | null;
  tx?: PrismaClientOrTransaction;
}): Promise<Accompagnement | null> => {
  const current = await getCurrentAccompagnement({ candidacyId, tx });
  if (!current) {
    return null;
  }

  return getClient(tx).accompagnement.update({
    where: { id: current.id },
    data: {
      ...(endAccompagnementDate !== undefined ? { endAccompagnementDate } : {}),
      ...(endAccompagnementStatus !== undefined
        ? { endAccompagnementStatus }
        : {}),
      ...(endAccompagnementReason !== undefined
        ? { endAccompagnementReason }
        : {}),
      ...(endAccompagnementCandidateDropOutReasonId !== undefined
        ? { endAccompagnementCandidateDropOutReasonId }
        : {}),
    },
  });
};

export const resetAccompagnementToBrouillon = async ({
  accompagnementId,
  tx,
}: {
  accompagnementId: string;
  tx?: PrismaClientOrTransaction;
}): Promise<Accompagnement> =>
  getClient(tx).accompagnement.update({
    where: { id: accompagnementId },
    data: {
      status: AccompagnementStatus.BROUILLON,
    },
  });
// export const ensureCurrentAccompagnement = async ({
//   candidacyId,
//   organismId,
//   candidacyStatusAtStart,
//   financeModule,
//   tx,
// }: {
//   candidacyId: string;
//   organismId?: string | null;
//   candidacyStatusAtStart?: CandidacyStatusStep;
//   financeModule?: FinanceModule;
//   tx?: PrismaClientOrTransaction;
// }): Promise<Accompagnement> => {
//   const current = await getCurrentAccompagnement({ candidacyId, tx });
//   if (current) {
//     return current;
//   }

//   return createAccompagnement({
//     candidacyId,
//     organismId,
//     candidacyStatusAtStart,
//     financeModule,
//     tx,
//   });
// };
