import { faker } from "@faker-js/faker";
import { CertificationStatus, FeasibilityFormat, Prisma } from "@prisma/client";
import { v4 as uuidV4 } from "uuid";

import { prismaClient } from "@/prisma/client";

import { createCertificationAuthorityHelper } from "./create-certification-authority-helper";

export const createCertificationHelper = async (
  args?: Partial<Prisma.CertificationUncheckedCreateInput>,
) => {
  const certificationAuthority = await createCertificationAuthorityHelper();

  const newCertificationId = uuidV4();

  const certification = await prismaClient.certification.create({
    data: {
      id: newCertificationId,
      firstVersionCertificationId: newCertificationId,
      label: faker.company.name(),
      level: 1,
      activities: faker.lorem.sentence(),
      activityArea: faker.lorem.sentence(),
      accessibleJobType: faker.lorem.word(),
      abilities: null,
      summary: faker.lorem.sentence(),
      status: CertificationStatus.VALIDE_PAR_CERTIFICATEUR,
      visible: true,
      availableAt: faker.date.past(),
      feasibilityFormat: FeasibilityFormat.UPLOADED_PDF,
      rncpLabel: faker.lorem.word(),
      rncpLevel: 1,
      rncpId: faker.string.uuid(),
      rncpTypeDiplome: "HyperDoctorat" as const,
      rncpExpiresAt: faker.date.future(),
      rncpDeliveryDeadline: faker.date.future(),
      rncpPublishedAt: faker.date.future(),
      rncpEffectiveAt: faker.date.future(),
      certificationAuthorityStructureId:
        certificationAuthority
          .certificationAuthorityOnCertificationAuthorityStructure[0]
          .certificationAuthorityStructureId,
      ...args,
    },
    include: {
      certificationAuthorityStructure: {
        include: {
          certificationAuthorityOnCertificationAuthorityStructure: {
            include: { certificationAuthority: true },
          },
          certificationRegistryManager: {
            include: {
              account: true,
            },
          },
        },
      },
    },
  });

  return {
    ...certification,
    certificationAuthorityStructure:
      certification.certificationAuthorityStructure && {
        ...certification.certificationAuthorityStructure,
        certificationAuthorityOnCertificationAuthorityStructure:
          certification.certificationAuthorityStructure.certificationAuthorityOnCertificationAuthorityStructure.map(
            (caocas) => ({
              ...caocas,
              certificationAuthority: {
                ...caocas.certificationAuthority,
                Account: certificationAuthority.Account,
              },
            }),
          ),
      },
  };
};
