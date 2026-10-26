import { faker } from "@faker-js/faker";

import {
  CANDIDATURE_ETE_ABANDONNEE,
  CANDIDATURE_ETE_SUPPRIMEE,
  CANDIDATURE_NON_TROUVEE,
  DOSSIER_FAISABILITE_PAS_RECEVABLE,
} from "@/modules/shared/errors/messages";
import { prismaClient } from "@/prisma/client";
import { createAccountHelper } from "@/test/helpers/entities/create-account-helper";
import { createCandidacyDropOutHelper } from "@/test/helpers/entities/create-candidacy-drop-out-helper";
import { createCandidacyHelper } from "@/test/helpers/entities/create-candidacy-helper";
import { createCertificationAuthorityHelper } from "@/test/helpers/entities/create-certification-authority-helper";
import { createCertificationAuthorityLocalAccountHelper } from "@/test/helpers/entities/create-certification-authority-local-account-helper";
import { createCertificationAuthorityOnAccountHelper } from "@/test/helpers/entities/create-certification-authority-on-account-helper";
import { createFeasibilityUploadedPdfHelper } from "@/test/helpers/entities/create-feasibility-uploaded-pdf-helper";

import { canManageJury } from "./canManageJury";

async function createAdmissibleSetup() {
  const certificationAuthority = await createCertificationAuthorityHelper();
  const candidacy = await createCandidacyHelper({
    candidacyActiveStatus: "DOSSIER_DE_VALIDATION_ENVOYE",
  });
  await createFeasibilityUploadedPdfHelper({
    candidacyId: candidacy.id,
    certificationAuthorityId: certificationAuthority.id,
    decision: "ADMISSIBLE",
    isActive: true,
  });
  return { candidacy, certificationAuthority };
}

// Creates a local account that will be auto-assigned to the candidacy when the
// feasibility is created (because its perimeter covers the candidacy's certification
// and the candidate's department).
async function createSetupWithAssignedLocalAccount() {
  const certificationAuthority = await createCertificationAuthorityHelper();
  const candidacy = await createCandidacyHelper({
    candidacyActiveStatus: "DOSSIER_DE_VALIDATION_ENVOYE",
  });

  const parisDepartment = await prismaClient.department.findFirstOrThrow({
    where: { code: "75" },
  });

  const localAccount = await createCertificationAuthorityLocalAccountHelper({
    certificationAuthorityId: certificationAuthority.id,
    certificationAuthorityLocalAccountOnCertification: {
      create: { certificationId: candidacy.certificationId! },
    },
    certificationAuthorityLocalAccountOnDepartment: {
      create: { departmentId: parisDepartment.id },
    },
  });

  // Creating the feasibility triggers assignCandidacyToCertificationAuthorityLocalAccounts,
  // which picks up the local account above and creates the candidacy association.
  await createFeasibilityUploadedPdfHelper({
    candidacyId: candidacy.id,
    certificationAuthorityId: certificationAuthority.id,
    decision: "ADMISSIBLE",
    isActive: true,
  });

  return { candidacy, certificationAuthority, localAccount };
}

// --- Error cases ---

test("throws when candidacy is not found", async () => {
  await expect(
    canManageJury({
      candidacyId: faker.string.uuid(),
      roles: ["admin"],
      keycloakId: faker.string.uuid(),
    }),
  ).rejects.toThrow(CANDIDATURE_NON_TROUVEE);
});

test("throws when candidacy is dropped out", async () => {
  const candidacy = await createCandidacyHelper();
  await createCandidacyDropOutHelper({ candidacyId: candidacy.id });

  await expect(
    canManageJury({
      candidacyId: candidacy.id,
      roles: ["admin"],
      keycloakId: faker.string.uuid(),
    }),
  ).rejects.toThrow(CANDIDATURE_ETE_ABANDONNEE);
});

test("throws when candidacy is archived", async () => {
  const candidacy = await createCandidacyHelper({
    candidacyArgs: { status: "ARCHIVE" },
  });

  await expect(
    canManageJury({
      candidacyId: candidacy.id,
      roles: ["admin"],
      keycloakId: faker.string.uuid(),
    }),
  ).rejects.toThrow(CANDIDATURE_ETE_SUPPRIMEE);
});

test("throws when no active feasibility exists", async () => {
  const candidacy = await createCandidacyHelper();

  await expect(
    canManageJury({
      candidacyId: candidacy.id,
      roles: ["admin"],
      keycloakId: faker.string.uuid(),
    }),
  ).rejects.toThrow("Le dossier de faisabilité n'a pas été trouvé");
});

test("throws when feasibility is not admissible", async () => {
  const certificationAuthority = await createCertificationAuthorityHelper();
  const candidacy = await createCandidacyHelper();
  await createFeasibilityUploadedPdfHelper({
    candidacyId: candidacy.id,
    certificationAuthorityId: certificationAuthority.id,
    decision: "PENDING",
    isActive: true,
  });

  await expect(
    canManageJury({
      candidacyId: candidacy.id,
      roles: ["admin"],
      keycloakId: faker.string.uuid(),
    }),
  ).rejects.toThrow(DOSSIER_FAISABILITE_PAS_RECEVABLE);
});

// --- Role-based access ---

test("returns true for admin role", async () => {
  const { candidacy } = await createAdmissibleSetup();

  const result = await canManageJury({
    candidacyId: candidacy.id,
    roles: ["admin"],
    keycloakId: faker.string.uuid(),
  });

  expect(result).toBe(true);
});

test("returns false when user lacks manage_feasibility role", async () => {
  const { candidacy } = await createAdmissibleSetup();

  const result = await canManageJury({
    candidacyId: candidacy.id,
    roles: ["manage_candidacy"],
    keycloakId: faker.string.uuid(),
  });

  expect(result).toBe(false);
});

// --- Certification authority admin (manage_certification_authority_local_account) ---

test("returns true when CA admin account is linked to the candidacy CA", async () => {
  const { candidacy, certificationAuthority } = await createAdmissibleSetup();
  const account = await createAccountHelper({
    keycloakId: faker.string.uuid(),
  });
  await createCertificationAuthorityOnAccountHelper({
    certificationAuthorityId: certificationAuthority.id,
    accountId: account.id,
  });

  const result = await canManageJury({
    candidacyId: candidacy.id,
    roles: [
      "manage_feasibility",
      "manage_certification_authority_local_account",
    ],
    keycloakId: account.keycloakId,
  });

  expect(result).toBe(true);
});

test("returns false when CA admin account is linked to a different CA", async () => {
  const { candidacy } = await createAdmissibleSetup();
  const otherCertificationAuthority =
    await createCertificationAuthorityHelper();
  const account = await createAccountHelper({
    keycloakId: faker.string.uuid(),
  });
  await createCertificationAuthorityOnAccountHelper({
    certificationAuthorityId: otherCertificationAuthority.id,
    accountId: account.id,
  });

  const result = await canManageJury({
    candidacyId: candidacy.id,
    roles: [
      "manage_feasibility",
      "manage_certification_authority_local_account",
    ],
    keycloakId: account.keycloakId,
  });

  expect(result).toBe(false);
});

// --- Certification authority local account ---

test("returns true when local account is assigned to the candidacy", async () => {
  const { candidacy, localAccount } =
    await createSetupWithAssignedLocalAccount();

  const result = await canManageJury({
    candidacyId: candidacy.id,
    roles: ["manage_feasibility"],
    keycloakId: localAccount.account.keycloakId,
  });

  expect(result).toBe(true);
});

test("returns false when local account is not assigned to the candidacy", async () => {
  const { candidacy, certificationAuthority } = await createAdmissibleSetup();

  // Local account belongs to the correct CA but has no perimeter match,
  // so it is never added to certificationAuthorityLocalAccountOnCandidacy.
  const localAccount = await createCertificationAuthorityLocalAccountHelper({
    certificationAuthorityId: certificationAuthority.id,
  });

  const result = await canManageJury({
    candidacyId: candidacy.id,
    roles: ["manage_feasibility"],
    keycloakId: localAccount.account.keycloakId,
  });

  expect(result).toBe(false);
});

test("returns false when local account belongs to a different CA", async () => {
  const { candidacy } = await createAdmissibleSetup();

  const otherCertificationAuthority =
    await createCertificationAuthorityHelper();
  const localAccount = await createCertificationAuthorityLocalAccountHelper({
    certificationAuthorityId: otherCertificationAuthority.id,
  });

  const result = await canManageJury({
    candidacyId: candidacy.id,
    roles: ["manage_feasibility"],
    keycloakId: localAccount.account.keycloakId,
  });

  expect(result).toBe(false);
});
