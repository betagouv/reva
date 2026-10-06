import { CertificationStatus } from "@prisma/client";
import { addDays, subDays } from "date-fns";

import { prismaClient } from "@/prisma/client";
import { createCertificationAuthorityHelper } from "@/test/helpers/entities/create-certification-authority-helper";
import { createCertificationHelper } from "@/test/helpers/entities/create-certification-helper";

import { setCertificationsVisibleOrNotUsingStatusAndAvailabilityDate } from "./setCertificationsVisibleOrNotUsingStatusAndAvailabilityDate";

vi.mock("./updateCertificationWithRncpExpiresAt", () => ({
  updateCertificationWithRncpExpiresAt: vi.fn(),
}));

const createEligibleCertification = () =>
  createCertificationHelper({
    status: CertificationStatus.VALIDE_PAR_CERTIFICATEUR,
    availableAt: subDays(new Date(), 1),
    rncpExpiresAt: addDays(new Date(), 1),
    visible: false,
  });

const assignCertificationAuthority = async (certificationId: string) => {
  const certificationAuthority = await createCertificationAuthorityHelper();

  await prismaClient.certificationAuthorityOnCertification.create({
    data: {
      certificationId,
      certificationAuthorityId: certificationAuthority.id,
    },
  });
};

describe("setCertificationsVisibleOrNotUsingStatusAndAvailabilityDate", () => {
  it("makes visible an eligible certification with a certification authority assigned", async () => {
    const certification = await createEligibleCertification();
    await assignCertificationAuthority(certification.id);

    await setCertificationsVisibleOrNotUsingStatusAndAvailabilityDate();

    const updatedCertification = await prismaClient.certification.findUnique({
      where: { id: certification.id },
    });

    expect(updatedCertification?.visible).toBe(true);
  });

  it("keeps an otherwise eligible certification invisible when no certification authority is assigned", async () => {
    const certification = await createEligibleCertification();

    await setCertificationsVisibleOrNotUsingStatusAndAvailabilityDate();

    const updatedCertification = await prismaClient.certification.findUnique({
      where: { id: certification.id },
    });

    expect(updatedCertification?.visible).toBe(false);
  });
});
