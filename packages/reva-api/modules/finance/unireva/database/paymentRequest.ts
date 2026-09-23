import { getCurrentAccompagnement } from "@/modules/accompagnement/features/accompagnement.helpers";
import { prismaClient } from "@/prisma/client";

import { PaymentRequest } from "../finance.types";

export const getPaymentRequestByCandidacyId = async (params: {
  candidacyId: string;
}) =>
  prismaClient.paymentRequest.findUnique({
    where: {
      candidacyId: params.candidacyId,
    },
  });

export const createPaymentRequest = async (params: {
  candidacyId: string;
  paymentRequest: PaymentRequest;
}) => {
  const currentAccompagnement = await getCurrentAccompagnement({
    candidacyId: params.candidacyId,
  });

  return prismaClient.paymentRequest.create({
    data: {
      candidacyId: params.candidacyId,
      accompagnementId: currentAccompagnement?.id,
      ...params.paymentRequest,
    },
  });
};

export const updatePaymentRequest = async (params: {
  paymentRequestId: string;
  paymentRequest: PaymentRequest;
}) =>
  prismaClient.paymentRequest.update({
    where: { id: params.paymentRequestId },
    data: {
      ...params.paymentRequest,
    },
  });
