import { startOfToday } from "date-fns";

import { logger } from "@/modules/shared/logger/logger";
import { prismaClient } from "@/prisma/client";

import { updateCertificationWithRncpExpiresAt } from "./updateCertificationWithRncpExpiresAt";

export const setCertificationsVisibleOrNotUsingStatusAndAvailabilityDate =
  async () => {
    const certifications = await prismaClient.certification.findMany();

    for (const certification of certifications) {
      try {
        await updateCertificationWithRncpExpiresAt({
          certification,
        });
      } catch (error) {
        logger.error(
          `Error updating certification with rncp expires at: ${error}`,
        );
      }
    }

    await prismaClient.$transaction([
      prismaClient.certification.updateMany({ data: { visible: false } }),
      prismaClient.certification.updateMany({
        where: {
          status: "VALIDE_PAR_CERTIFICATEUR",
          availableAt: { lte: startOfToday() },
          rncpExpiresAt: { gte: startOfToday() },
          certificationAuthorityOnCertification: { some: {} },
        },
        data: { visible: true },
      }),
    ]);
  };
