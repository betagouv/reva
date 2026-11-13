import { prismaClient } from "../../prisma/client.js";

export const findActiveSessionsCreatedBefore = (date: Date) =>
  prismaClient.session.findMany({
    where: { endedAt: null, createdAt: { lt: date } },
    orderBy: { createdAt: "asc" },
  });
