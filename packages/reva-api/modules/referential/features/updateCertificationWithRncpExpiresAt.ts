import { Certification } from "@prisma/client";

import { prismaClient } from "@/prisma/client";

import { RNCPReferential } from "../rncp/referential";

export const updateCertificationWithRncpExpiresAt = async (params: {
  certification: Certification;
}) => {
  const {
    certification: { id, rncpId: codeRncp },
  } = params;

  const rncpCertification =
    await RNCPReferential.getInstance().findOneByRncp(codeRncp);
  if (!rncpCertification) {
    throw new Error(
      `La certification avec le code rncp ${codeRncp} n'existe pas dans le référentiel RNCP`,
    );
  }

  if (!rncpCertification.DATE_FIN_ENREGISTREMENT) {
    throw new Error(
      `La certification avec le code rncp ${codeRncp} n'a pas de date de fin d'enregistrement`,
    );
  }
  const rncpExpiresAt = new Date(rncpCertification.DATE_FIN_ENREGISTREMENT);

  // Update certification from based on RNCP
  await prismaClient.certification.update({
    where: { id },
    data: {
      rncpExpiresAt,
    },
  });
};
