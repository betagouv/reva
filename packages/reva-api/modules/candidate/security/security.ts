import {
  defaultSecurity,
  isAdminOrCandidacyCompanion,
  isAnyone,
  isAdminOrOwnerOfCandidate,
} from "@/modules/shared/security/presets";

export const resolversSecurityMap = {
  "Query.candidate_getCandidateById": isAdminOrOwnerOfCandidate,

  "Mutation.*": defaultSecurity, // forbidden

  "Mutation.candidate_askForRegistration": isAnyone,
  "Mutation.candidate_askForRegistrationWithPassword": isAnyone,
  "Mutation.candidate_askForLogin": isAnyone,
  "Mutation.candidate_loginWithToken": isAnyone,
  "Mutation.candidate_loginWithCredentials": isAnyone,
  "Mutation.candidate_forgotPassword": isAnyone,
  "Mutation.candidate_resetPassword": isAnyone,
  "Mutation.candidate_updateCandidateInformation": isAdminOrCandidacyCompanion,
  "Mutation.candidate_updateCandidateProfile": isAdminOrCandidacyCompanion,
  "Mutation.candidate_updateCandidateInformationBySelf":
    isAdminOrOwnerOfCandidate,
  "Mutation.candidate_updateCandidateContactDetails":
    isAdminOrCandidacyCompanion,
};
