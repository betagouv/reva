import { prismaClient } from "@/prisma/client";

export const getRolesSpecificToSousCompteAndCohorteVaeCollective = ({
  sousCompteVaeCollectiveId,
  cohorteVaeCollectiveId,
}: {
  sousCompteVaeCollectiveId: string;
  cohorteVaeCollectiveId: string;
}) =>
  prismaClient.sousCompteVaeCollective
    .findUnique({ where: { id: sousCompteVaeCollectiveId } })
    .roleSpecificToSousCompteAndCohorteVaeCollectives({
      where: {
        cohorteVaeCollectiveId,
      },
    })
    .then((roles) => roles?.map((r) => r.role) ?? []);
