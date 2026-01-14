import { updateCertification } from "@/modules/candidacy/certification/features/updateCertification";
import { createCandidacy } from "@/modules/candidacy/features/createCandidacy";
import { getFirstActiveCandidacyByCandidateId } from "@/modules/candidacy/features/getFirstActiveCandidacyByCandidateId";
import { getCertificationById } from "@/modules/referential/features/getCertificationById";
import { isCertificationAvailable } from "@/modules/referential/features/isCertificationAvailable";
import {
  createAccountInIAM,
  generateIAMTokenWithPassword,
  getAccountInIAM,
  getJWTContent,
  resetPassword,
} from "@/modules/shared/auth/auth.helper";
import { prismaClient } from "@/prisma/client";

interface FinalizeRegistrationWithPasswordInput {
  token: string;
  password: string;
}

interface FinalizeRegistrationTokenContent {
  email: string;
  action: "finalize-registration";
  certificationId?: string;
}

export const candidateFinalizeRegistrationWithPassword = async ({
  token,
  password,
}: FinalizeRegistrationWithPasswordInput) => {
  const tokenContent = (await getJWTContent(
    token,
  )) as FinalizeRegistrationTokenContent;

  if (tokenContent.action !== "finalize-registration") {
    throw new Error("Action non reconnue");
  }

  const { email, certificationId } = tokenContent;
  const realm = process.env.KEYCLOAK_APP_REALM as string;

  const existingAccount = await getAccountInIAM(email, realm);
  if (existingAccount) {
    throw new Error(
      "Un compte existe déjà avec cette adresse email. Veuillez vous connecter.",
    );
  }

  const keycloakId = await createAccountInIAM({ email }, realm, ["candidate"]);

  await resetPassword(keycloakId, password, realm);

  const defaultDepartment = await prismaClient.department.findFirst({
    where: { code: "75" },
  });

  if (!defaultDepartment) {
    throw new Error("Département par défaut non trouvé");
  }

  const candidate = await prismaClient.$transaction(async (tx) => {
    const createdCandidate = await tx.candidate.create({
      data: {
        email,
        keycloakId,
        firstname: "",
        lastname: "",
        phone: "",
        departmentId: defaultDepartment.id,
      },
    });

    await createCandidacy({
      candidateId: createdCandidate.id,
      typeAccompagnement: "ACCOMPAGNE",
      tx,
    });

    return createdCandidate;
  });

  if (
    certificationId &&
    (await isCertificationAvailable({ certificationId }))
  ) {
    const candidacy = await getFirstActiveCandidacyByCandidateId({
      candidateId: candidate.id,
    });

    if (candidacy) {
      const certification = await getCertificationById({ certificationId });
      if (certification) {
        await updateCertification({
          candidacyId: candidacy.id,
          author: "candidate",
          certificationId,
          feasibilityFormat:
            candidacy.typeAccompagnement === "ACCOMPAGNE"
              ? certification.feasibilityFormat
              : "UPLOADED_PDF",
        });
      }
    }
  }

  return generateIAMTokenWithPassword(keycloakId, password, realm);
};
