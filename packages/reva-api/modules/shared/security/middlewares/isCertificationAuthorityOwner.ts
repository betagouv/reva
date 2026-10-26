import debug from "debug";
import { IFieldResolver, MercuriusContext } from "mercurius";

import { getCertificationAuthorityIdForAccount } from "@/modules/certification-authority/features/getCertificationAuthorityIdForAccount";
import { NOT_AUTHORIZED_CERTIFICATION_AUTHORITY_ACCESS } from "@/modules/shared/security/messages";
import { prismaClient } from "@/prisma/client";

const log = debug("gql:security");

export const isCertificationAuthorityOwner =
  (next: IFieldResolver<unknown>) =>
  async (
    root: any,
    args: Record<string, any>,
    context: MercuriusContext,
    info: any,
  ) => {
    log("isCertificationAuthorityOwner");

    const certificationAuthorityId =
      root.certificationAuthorityId ||
      root.id ||
      args.id ||
      args.certificationAuthorityId ||
      args.certificationAuthority?.id ||
      args.input?.certificationAuthorityId ||
      args.input?.certificationAuthority?.id;

    if (!certificationAuthorityId) {
      throw new Error('args "certificationAuthorityId" is missing');
    }

    if (!context.auth.hasRole("manage_certification_authority_local_account")) {
      log("not authorized");

      throw new Error(NOT_AUTHORIZED_CERTIFICATION_AUTHORITY_ACCESS);
    }

    const account = await prismaClient.account.findUnique({
      where: {
        keycloakId: context.auth.userInfo.sub,
      },
    });

    const accountCertificationAuthorityId = account
      ? await getCertificationAuthorityIdForAccount(account.id)
      : undefined;

    if (accountCertificationAuthorityId != certificationAuthorityId) {
      log("not authorized");

      throw new Error(NOT_AUTHORIZED_CERTIFICATION_AUTHORITY_ACCESS);
    }

    log("authorized");

    return next(root, args, context, info);
  };
