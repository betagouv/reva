"use server";

import { jwtDecode } from "jwt-decode";

import { getAccessTokenFromCookie } from "@/helpers/auth/get-access-token-from-cookie/getAccessTokenFromCookie";
import { throwUrqlErrors } from "@/helpers/graphql/throw-urql-errors/throwUrqlErrors";
import { client } from "@/helpers/graphql/urql-client/urqlClient";

import { graphql } from "@/graphql/generated";
import { PermissionVaeCollective } from "@/graphql/generated/graphql";

import { UserRole } from "./types";

const getUserPermissionsQuery = graphql(`
  query vaeCollective_getUserPermissions($cohorteVaeCollectiveId: ID) {
    vaeCollective_getUserPermissions(
      cohorteVaeCollectiveId: $cohorteVaeCollectiveId
    )
  }
`);

const getUserPermissions = async ({
  cohorteVaeCollectiveId,
}: {
  cohorteVaeCollectiveId?: string;
}) => {
  const accessToken = await getAccessTokenFromCookie();

  if (!accessToken) {
    return [];
  }

  const result = throwUrqlErrors(
    await client.query(
      getUserPermissionsQuery,
      { cohorteVaeCollectiveId },
      {
        fetchOptions: {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      },
    ),
  );

  return result.data?.vaeCollective_getUserPermissions ?? [];
};

export const isUserInRole = async (role: UserRole) => {
  const accessToken = await getAccessTokenFromCookie();

  if (!accessToken) {
    return false;
  }

  const decodedToken = jwtDecode<{
    resource_access?: { "reva-vae-collective"?: { roles: string[] } };
  }>(accessToken);

  const roles = (decodedToken?.resource_access?.["reva-vae-collective"]
    ?.roles || []) as UserRole[];

  return roles.includes(role);
};

export const hasPermission = async ({
  permission,
  cohorteVaeCollectiveId,
}: {
  permission: PermissionVaeCollective;
  cohorteVaeCollectiveId?: string;
}) => {
  let userHasPermission = false;
  const isAdmin = await isUserInRole("admin");
  if (isAdmin) {
    userHasPermission = true;
  } else {
    const permissions = await getUserPermissions({ cohorteVaeCollectiveId });
    userHasPermission = permissions.includes(permission);
  }
  return userHasPermission;
};
