import { CertificationStatus } from "@prisma/client";
import { addDays, startOfToday, subDays } from "date-fns";

import { prismaClient } from "@/prisma/client";
import { createCertificationAuthorityHelper } from "@/test/helpers/entities/create-certification-authority-helper";
import { createCertificationHelper } from "@/test/helpers/entities/create-certification-helper";
import { createParcoursCertificationHelper } from "@/test/helpers/entities/create-parcours-certification-helper";

import { updateCertificationsVisibility } from "./updateCertificationsVisibility";

const createCertificationWithAuthority = async (
  args?: Parameters<typeof createCertificationHelper>[0],
) => {
  const certification = await createCertificationHelper(args);
  const certificationAuthority = await createCertificationAuthorityHelper();
  const certificationAuthorityOnCertification =
    await prismaClient.certificationAuthorityOnCertification.create({
      data: {
        certificationId: certification.id,
        certificationAuthorityId: certificationAuthority.id,
      },
    });
  return { ...certification, certificationAuthorityOnCertification };
};

const createEligibleCertificationWithAuthority = () =>
  createCertificationWithAuthority({
    status: CertificationStatus.VALIDE_PAR_CERTIFICATEUR,
    availableAt: subDays(new Date(), 1),
    rncpExpiresAt: addDays(new Date(), 1),
    visible: false,
  });

const getVisible = async (certificationId: string) =>
  (
    await prismaClient.certification.findUniqueOrThrow({
      where: { id: certificationId },
    })
  ).visible;

describe("updateCertificationsVisibility", () => {
  test("makes visible a certification that is validated, in-date, and has a certification authority", async () => {
    const certification = await createCertificationWithAuthority({
      status: CertificationStatus.VALIDE_PAR_CERTIFICATEUR,
      availableAt: subDays(new Date(), 1),
      rncpExpiresAt: addDays(new Date(), 1),
      visible: false,
    });

    await updateCertificationsVisibility([certification.id], prismaClient);

    expect(await getVisible(certification.id)).toBe(true);
  });

  test("keeps invisible a certification whose status is not VALIDE_PAR_CERTIFICATEUR", async () => {
    const certification = await createCertificationWithAuthority({
      status: CertificationStatus.A_VALIDER_PAR_CERTIFICATEUR,
      availableAt: subDays(new Date(), 1),
      rncpExpiresAt: addDays(new Date(), 1),
      visible: false,
    });

    await updateCertificationsVisibility([certification.id], prismaClient);

    expect(await getVisible(certification.id)).toBe(false);
  });

  test("keeps invisible a certification not yet available", async () => {
    const certification = await createCertificationWithAuthority({
      status: CertificationStatus.VALIDE_PAR_CERTIFICATEUR,
      availableAt: addDays(new Date(), 1),
      rncpExpiresAt: addDays(new Date(), 2),
      visible: false,
    });

    await updateCertificationsVisibility([certification.id], prismaClient);

    expect(await getVisible(certification.id)).toBe(false);
  });

  test("keeps invisible a certification whose RNCP registration has expired", async () => {
    const certification = await createCertificationWithAuthority({
      status: CertificationStatus.VALIDE_PAR_CERTIFICATEUR,
      availableAt: subDays(new Date(), 2),
      rncpExpiresAt: subDays(new Date(), 1),
      visible: false,
    });

    await updateCertificationsVisibility([certification.id], prismaClient);

    expect(await getVisible(certification.id)).toBe(false);
  });

  test("keeps invisible an otherwise eligible certification with no certification authority assigned", async () => {
    const certification = await createCertificationHelper({
      status: CertificationStatus.VALIDE_PAR_CERTIFICATEUR,
      availableAt: subDays(new Date(), 1),
      rncpExpiresAt: addDays(new Date(), 1),
      visible: false,
    });

    await updateCertificationsVisibility([certification.id], prismaClient);

    expect(await getVisible(certification.id)).toBe(false);
  });

  test("makes visible a certification whose availableAt is today", async () => {
    const certification = await createCertificationWithAuthority({
      status: CertificationStatus.VALIDE_PAR_CERTIFICATEUR,
      availableAt: startOfToday(),
      rncpExpiresAt: addDays(new Date(), 1),
      visible: false,
    });

    await updateCertificationsVisibility([certification.id], prismaClient);

    expect(await getVisible(certification.id)).toBe(true);
  });

  test("makes visible a certification whose rncpExpiresAt is today", async () => {
    const certification = await createCertificationWithAuthority({
      status: CertificationStatus.VALIDE_PAR_CERTIFICATEUR,
      availableAt: subDays(new Date(), 1),
      rncpExpiresAt: startOfToday(),
      visible: false,
    });

    await updateCertificationsVisibility([certification.id], prismaClient);

    expect(await getVisible(certification.id)).toBe(true);
  });

  test("makes invisible again a previously visible certification that is no longer eligible", async () => {
    const certification = await createCertificationWithAuthority({
      status: CertificationStatus.VALIDE_PAR_CERTIFICATEUR,
      availableAt: subDays(new Date(), 2),
      rncpExpiresAt: subDays(new Date(), 1),
      visible: true,
    });

    await updateCertificationsVisibility([certification.id], prismaClient);

    expect(await getVisible(certification.id)).toBe(false);
  });

  test("only updates certifications included in the given list of ids", async () => {
    const includedCertification = await createCertificationWithAuthority({
      status: CertificationStatus.VALIDE_PAR_CERTIFICATEUR,
      availableAt: subDays(new Date(), 1),
      rncpExpiresAt: addDays(new Date(), 1),
      visible: false,
    });
    const excludedCertification = await createCertificationWithAuthority({
      status: CertificationStatus.VALIDE_PAR_CERTIFICATEUR,
      availableAt: subDays(new Date(), 1),
      rncpExpiresAt: addDays(new Date(), 1),
      visible: false,
    });

    await updateCertificationsVisibility(
      [includedCertification.id],
      prismaClient,
    );

    expect(await getVisible(includedCertification.id)).toBe(true);
    expect(await getVisible(excludedCertification.id)).toBe(false);
  });

  test("keeps invisible an otherwise eligible certification whose parcours have no certification authority linked", async () => {
    const certification = await createEligibleCertificationWithAuthority();
    await createParcoursCertificationHelper({
      certificationId: certification.id,
    });

    await updateCertificationsVisibility([certification.id], prismaClient);

    expect(await getVisible(certification.id)).toBe(false);
  });

  test("makes visible an eligible certification with at least one parcours linked to a certification authority", async () => {
    const certification = await createEligibleCertificationWithAuthority();
    const linkedParcours = await createParcoursCertificationHelper({
      certificationId: certification.id,
    });
    await createParcoursCertificationHelper({
      certificationId: certification.id,
    });
    await prismaClient.certificationAuthorityOnCertificationOnParcoursCertification.create(
      {
        data: {
          certificationAuthorityOnCertificationId:
            certification.certificationAuthorityOnCertification.id,
          parcoursCertificationId: linkedParcours.id,
        },
      },
    );

    await updateCertificationsVisibility([certification.id], prismaClient);

    expect(await getVisible(certification.id)).toBe(true);
  });

  test("does nothing when given an empty list of ids", async () => {
    const certification = await createCertificationWithAuthority({
      status: CertificationStatus.VALIDE_PAR_CERTIFICATEUR,
      availableAt: subDays(new Date(), 1),
      rncpExpiresAt: addDays(new Date(), 1),
      visible: true,
    });

    await updateCertificationsVisibility([], prismaClient);

    expect(await getVisible(certification.id)).toBe(true);
  });
});
