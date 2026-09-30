import debug from "debug";
import { IFieldResolver, MercuriusContext } from "mercurius";

import { NOT_AUTHORIZED_LOCAL_ACCOUNT_ACCESS } from "@/modules/shared/security/messages";
import { prismaClient } from "@/prisma/client";

const log = debug("gql:security");

export const isCertificationAuthorityLocalAccountManager =
  (next: IFieldResolver<unknown>) =>
  async (
    root: any,
    args: Record<string, any>,
    context: MercuriusContext,
    info: any,
  ) => {
    log("isCertificationAuthorityLocalAccountManager");

    const localAccountId =
      args.input?.certificationAuthorityLocalAccountId ||
      args.certificationAuthorityLocalAccountId ||
      args.id ||
      root.id;

    if (!localAccountId) {
      throw new Error('args "localAccountId" is missing');
    }

    if (!context.auth.hasRole("manage_certification_authority_local_account")) {
      log("not authorized");

      throw new Error(NOT_AUTHORIZED_LOCAL_ACCOUNT_ACCESS);
    }

    const account = await prismaClient.account.findUnique({
      where: {
        keycloakId: context.auth.userInfo.sub,
      },
    });

    if (!account?.certificationAuthorityId) {
      log("not authorized");

      throw new Error(NOT_AUTHORIZED_LOCAL_ACCOUNT_ACCESS);
    }

    const certificationAuthorityLocalAccount =
      await prismaClient.certificationAuthorityLocalAccount.findFirst({
        where: {
          certificationAuthorityId: account.certificationAuthorityId,
          id: localAccountId,
        },
      });

    if (!certificationAuthorityLocalAccount) {
      log("not authorized");

      throw new Error(NOT_AUTHORIZED_LOCAL_ACCOUNT_ACCESS);
    }

    log("authorized");

    return next(root, args, context, info);
  };
