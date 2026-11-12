import { Prisma } from "@prisma/client";
import { startOfToday } from "date-fns";

// A certification is visible when it is validated, currently available, not expired,
// has at least one certification authority and either has no parcours
// or has at least one parcours linked to a certification authority.
export const certificationVisibilityWhereClause =
  (): Prisma.CertificationWhereInput => ({
    status: "VALIDE_PAR_CERTIFICATEUR",
    availableAt: { lte: startOfToday() },
    rncpExpiresAt: { gte: startOfToday() },
    certificationAuthorityOnCertification: { some: {} },
    OR: [
      { parcours: { none: {} } },
      {
        parcours: {
          some: {
            certificationAuthorityOnCertificationOnParcoursCertifications: {
              some: {},
            },
          },
        },
      },
    ],
  });
