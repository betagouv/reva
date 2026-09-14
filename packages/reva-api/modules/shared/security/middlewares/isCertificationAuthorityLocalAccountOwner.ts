import debug from "debug";
import { IFieldResolver, MercuriusContext } from "mercurius";

import { NOT_AUTHORIZED_LOCAL_ACCOUNT_ACCESS } from "@/modules/shared/security/messages";
import { prismaClient } from "@/prisma/client";

const log = debug("gql:security");

export const isCertificationAuthorityLocalAccountOwner =
  (next: IFieldResolver<unknown>) =>
  async (
    root: any,
    args: Record<string, any>,
    context: MercuriusContext,
    info: any,
  ) => {
    log("isCertificationAuthorityLocalAccountOwner");

    const localAccountId =
      args.input?.certificationAuthorityLocalAccountId || args.id;

    if (!localAccountId) {
      throw new Error('args "localAccountId" is missing');
    }

    const certificationAuthorityLocalAccount =
      await prismaClient.certificationAuthorityLocalAccount.findFirst({
        where: {
          certificationAuthorityLocalAccountOnAccount: {
            some: {
              account: {
                keycloakId: context.auth.userInfo.sub,
              },
            },
          },
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
