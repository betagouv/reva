import { faker } from "@faker-js/faker";
import { Prisma } from "@prisma/client";

import { getCurrentAccompagnement } from "@/modules/accompagnement/features/accompagnement.helpers";
import { prismaClient } from "@/prisma/client";

import { createCandidacyHelper } from "./create-candidacy-helper";

export const createPaymentRequestUnirevaHelper = async (
  args?: Partial<Prisma.PaymentRequestUncheckedCreateInput>,
) => {
  let candidacyId = args?.candidacyId;
  if (!candidacyId) {
    const candidacy = await createCandidacyHelper();
    candidacyId = candidacy.id;
  }

  const currentAccompagnement = await getCurrentAccompagnement({ candidacyId });

  return prismaClient.paymentRequest.create({
    data: {
      candidacyId,
      accompagnementId: args?.accompagnementId ?? currentAccompagnement?.id,
      diagnosisEffectiveHourCount: 0,
      diagnosisEffectiveCost: 0,
      postExamEffectiveHourCount: 0,
      postExamEffectiveCost: 0,
      individualEffectiveHourCount: 0,
      individualEffectiveCost: 0,
      collectiveEffectiveHourCount: 0,
      collectiveEffectiveCost: 0,
      mandatoryTrainingsEffectiveHourCount: 0,
      mandatoryTrainingsEffectiveCost: 0,
      basicSkillsEffectiveHourCount: 0,
      basicSkillsEffectiveCost: 0,
      certificateSkillsEffectiveHourCount: 0,
      certificateSkillsEffectiveCost: 0,
      otherTrainingEffectiveHourCount: 0,
      otherTrainingEffectiveCost: 0,
      examEffectiveHourCount: 0,
      examEffectiveCost: 0,
      invoiceNumber: faker.string.uuid(),
      ...args,
    },
  });
};
