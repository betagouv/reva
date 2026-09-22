import { prismaClient } from "@/prisma/client";

export const getVaeCollectiveRolesFromKeycloakRoles = async ({
  userKeycloakRoles,
}: {
  userKeycloakRoles: KeyCloakUserRole[];
}) => {
  const rolesOnKeycloakRoles =
    await prismaClient.keycloakRoleOnRoleVaeCollective.findMany({
      where: {
        keycloakRole: {
          in: userKeycloakRoles,
        },
      },
      distinct: ["role"],
    });

  return rolesOnKeycloakRoles.map(({ role }) => role);
};
