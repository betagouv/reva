import { Prisma, PrismaClient } from "@prisma/client";

import { certificationVisibilityWhereClause } from "../utils/certificationVisibilityWhereClause";

type PrismaTransactionClient = PrismaClient | Prisma.TransactionClient;

export const updateCertificationsVisibility = async (
  certificationIds: string[],
  prismaTransactionClient: PrismaTransactionClient,
) => {
  if (!certificationIds.length) {
    return;
  }

  await prismaTransactionClient.certification.updateMany({
    where: { id: { in: certificationIds } },
    data: { visible: false },
  });

  await prismaTransactionClient.certification.updateMany({
    where: {
      id: { in: certificationIds },
      ...certificationVisibilityWhereClause(),
    },
    data: { visible: true },
  });
};
