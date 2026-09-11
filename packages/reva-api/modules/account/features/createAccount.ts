import { Account } from "@prisma/client";

import { getCertificationAuthorityById } from "@/modules/feasibility/feasibility.features";
import { isFeatureActiveForUser } from "@/modules/feature-flipping/feature-flipping.features";
import {
  FunctionalCodeError,
  FunctionalError,
} from "@/modules/shared/error/functionalError";
import { prismaClient } from "@/prisma/client";

import * as IAM from "./keycloak";

export const createAccount = async (params: {
  email: string;
  username: string;
  firstname?: string;
  lastname?: string;
  group: KeyCloakGroup;
  organismId?: string;
  certificationAuthorityId?: string;
  certificationAuthorityLocalAccountId?: string;
  maisonMereAAPRaisonSociale?: string;
  dontSendKeycloakEmail?: boolean;
  isApiUser?: boolean;
}): Promise<Account> => {
  const isEnableEmailOtpOnAccountCreationFeatureActive =
    await isFeatureActiveForUser({
      userKeycloakId: null,
      feature: "ENABLE_EMAIL_OTP_ON_ACCOUNT_CREATION",
    });

  const emailOtpEnabled = isEnableEmailOtpOnAccountCreationFeatureActive;

  // On n'envoie pas d'email de définition de mot de passe si le flag dontSendKeycloakEmail est positionné ou si l'envitonnement est sandbox
  // Les comptes créés dans l'environnement de sandbox ou avec le flag isApiUser sont destinés à une utilisation via API
  // et ne doivent pas recevoir de mail de création de mot de passe
  const dontSendKeycloakEmail =
    params.dontSendKeycloakEmail ||
    process.env.APP_ENV === "sandbox" ||
    params.isApiUser;

  //assertions on parameters
  if (!params.email) {
    throw new FunctionalError(
      FunctionalCodeError.ACCOUNT_EMAIL_EMPTY,
      `Adresse électronique invalide`,
    );
  }

  // Normalisation en minuscules : évite les doublons de casse en base et
  // s'aligne sur Keycloak (case-insensitive).
  const email = params.email.toLowerCase();

  //assertions depending on user group
  switch (params.group) {
    case "admin":
      // for admins, no specific checks
      break;

    case "certification_authority":
      if (!params.certificationAuthorityId) {
        throw new FunctionalError(
          FunctionalCodeError.ACCOUNT_CERTIFICATION_AUTHORITY_ID_EMPTY,
          `certificationAuthorityId est obligatoire pour un groupe "certification_authority"`,
        );
      }
      if (
        (await getCertificationAuthorityById(
          params.certificationAuthorityId || "",
        )) == null
      ) {
        throw new FunctionalError(
          FunctionalCodeError.CERTIFICATION_AUTHORITY_NOT_FOUND,
          `Autorité certificatrice non trouvée`,
        );
      }
      break;
  }

  //check if account already exist in keycloak and throw an error if that's the case.
  const maybeExistingAccount = await IAM.getAccount({
    email,
    username: params.username,
  });

  if (maybeExistingAccount) {
    throw new FunctionalError(
      FunctionalCodeError.ACCOUNT_ALREADY_EXISTS,
      `Un compte existe déjà pour cet adresse électronique`,
    );
  }

  // create the account in keycloak
  const keycloakId = await IAM.createAccount({
    ...params,
    email,
    dontSendKeycloakEmail,
  });

  //create and return the account in database
  return prismaClient.account.create({
    data: {
      keycloakId: keycloakId,
      email,
      firstname: params.firstname,
      lastname: params.lastname,
      organismId: params.organismId,
      certificationAuthorityId: params.certificationAuthorityId,
      certificationAuthorityLocalAccountId:
        params.certificationAuthorityLocalAccountId,
      isApiUser: params.isApiUser,
      emailOtpEnabled,
    },
  });
};
