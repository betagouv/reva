import { randomUUID } from "crypto";

import { CandidacyStatusStep } from "@prisma/client";

import { prismaClient } from "@/prisma/client";
import { TRAINING_INPUT } from "@/test/fixtures/trainings.fixture";
import { authorizationHeaderForUser } from "@/test/helpers/authorization-helper";
import { createCandidacyHelper } from "@/test/helpers/entities/create-candidacy-helper";
import { createCertificationAuthorityHelper } from "@/test/helpers/entities/create-certification-authority-helper";
import { createCertificationHelper } from "@/test/helpers/entities/create-certification-helper";
import { getCandidateDepartmentIdOrThrow } from "@/test/helpers/entities/get-candidate-department-id-or-throw";
import { injectGraphql } from "@/test/helpers/graphql-helper";

const submitTraining = async ({
  keycloakId,
  candidacyId,
}: {
  keycloakId: string;
  candidacyId: string;
}) =>
  await injectGraphql({
    fastify: global.testApp,
    authorization: authorizationHeaderForUser({
      role: "manage_candidacy",
      keycloakId,
    }),
    payload: {
      requestType: "mutation",
      endpoint: "training_submitTrainingForm",
      arguments: {
        candidacyId,
        training: TRAINING_INPUT,
      },
      returnFields: "{id,status}",
    },
  });

const confirmTraining = async ({
  keycloakId,
  candidacyId,
}: {
  keycloakId: string;
  candidacyId: string;
}) =>
  await injectGraphql({
    fastify: global.testApp,
    authorization: authorizationHeaderForUser({
      role: "candidate",
      keycloakId,
    }),
    payload: {
      requestType: "mutation",
      endpoint: "training_confirmTrainingForm",
      arguments: {
        candidacyId,
      },
      returnFields: "{id, status}",
    },
  });

const updateCertification = async ({
  keycloakId,
  candidacyId,
  certificationId,
}: {
  keycloakId: string;
  candidacyId: string;
  certificationId: string;
}) =>
  await injectGraphql({
    fastify: global.testApp,
    authorization: authorizationHeaderForUser({
      role: "candidate",
      keycloakId,
    }),
    payload: {
      requestType: "mutation",
      endpoint: "candidacy_certification_updateCertification",
      arguments: {
        candidacyId,
        certificationId,
      },
      returnFields: "",
    },
  });

test("should be able to select a new certification while a training is sent", async () => {
  const candidacy = await createCandidacyHelper({
    candidacyActiveStatus: CandidacyStatusStep.PRISE_EN_CHARGE,
  });
  const organismKeycloakId =
    candidacy.organism?.organismOnAccounts[0].account.keycloakId ?? "";
  const certification = await createCertificationHelper();
  await submitTraining({
    keycloakId: organismKeycloakId,
    candidacyId: candidacy.id,
  });
  await updateCertification({
    keycloakId: candidacy.candidate?.keycloakId ?? "",
    candidacyId: candidacy.id,
    certificationId: certification.id,
  });
  const candidacyUpdated = await prismaClient.candidacy.findUnique({
    where: { id: candidacy.id },
  });

  expect(candidacyUpdated?.certificationId).toEqual(certification.id);
});

test("should not be able to select a new certification after the training is confirmed", async () => {
  const candidacy = await createCandidacyHelper();
  const organismKeycloakId =
    candidacy.organism?.organismOnAccounts[0].account.keycloakId ?? "";
  await submitTraining({
    keycloakId: organismKeycloakId,
    candidacyId: candidacy.id,
  });
  await confirmTraining({
    keycloakId: candidacy.candidate?.keycloakId ?? "",
    candidacyId: candidacy.id,
  });
  const resp = await updateCertification({
    keycloakId: candidacy.candidate?.keycloakId ?? "",
    candidacyId: candidacy.id,
    certificationId: randomUUID(),
  });

  expect(resp.statusCode).toEqual(200);
  expect(resp.json().errors?.[0].message).toEqual(
    "Impossible de changer de certification après avoir confirmé le parcours",
  );
});

test("should reset the training and status when selecting a new certification", async () => {
  const candidacy = await createCandidacyHelper({
    candidacyActiveStatus: CandidacyStatusStep.PRISE_EN_CHARGE,
  });
  const candidacyId = candidacy.id;
  const organismKeycloakId =
    candidacy.organism?.organismOnAccounts[0].account.keycloakId ?? "";
  const certification = await createCertificationHelper();
  await submitTraining({
    keycloakId: organismKeycloakId,
    candidacyId,
  });
  await updateCertification({
    keycloakId: candidacy.candidate?.keycloakId ?? "",
    candidacyId,
    certificationId: certification.id,
  });

  const basicSkillsCount = await prismaClient.basicSkillOnCandidacies.count({
    where: { candidacyId },
  });
  const trainingCount = await prismaClient.trainingOnCandidacies.count({
    where: { candidacyId },
  });
  const financingMethodCount =
    await prismaClient.candidacyOnCandidacyFinancingMethod.count({
      where: { candidacyId },
    });

  const candidacyUpdated = await prismaClient.candidacy.findUnique({
    where: { id: candidacyId },
  });

  expect(candidacyUpdated).toMatchObject({
    status: CandidacyStatusStep.PROJET,
    certificateSkills: null,
    otherTraining: null,
    individualHourCount: null,
    collectiveHourCount: null,
    additionalHourCount: null,
    isCertificationPartial: null,
  });

  expect(basicSkillsCount).toEqual(0);
  expect(trainingCount).toEqual(0);
  expect(financingMethodCount).toEqual(0);
});

test("should block candidate ACCOMPAGNE from updating certification when status is DOSSIER_FAISABILITE_INCOMPLET", async () => {
  const candidacy = await createCandidacyHelper({
    candidacyActiveStatus: CandidacyStatusStep.DOSSIER_FAISABILITE_INCOMPLET,
    candidacyArgs: {
      typeAccompagnement: "ACCOMPAGNE",
    },
  });
  const certification = await createCertificationHelper();

  const resp = await updateCertification({
    keycloakId: candidacy.candidate?.keycloakId ?? "",
    candidacyId: candidacy.id,
    certificationId: certification.id,
  });

  expect(resp.statusCode).toEqual(200);
  expect(resp.json().errors?.[0].message).toEqual(
    "Impossible de changer de certification après avoir confirmé le parcours",
  );
});

test("should allow admin to update certification when status is DOSSIER_FAISABILITE_INCOMPLET", async () => {
  const candidacy = await createCandidacyHelper({
    candidacyActiveStatus: CandidacyStatusStep.DOSSIER_FAISABILITE_INCOMPLET,
    candidacyArgs: {
      typeAccompagnement: "AUTONOME",
    },
  });
  const certification = await createCertificationHelper();

  // Use admin role for the update
  const resp = await injectGraphql({
    fastify: global.testApp,
    authorization: authorizationHeaderForUser({
      role: "admin",
      keycloakId: candidacy.candidate?.keycloakId ?? "",
    }),
    payload: {
      requestType: "mutation",
      endpoint: "candidacy_certification_updateCertification",
      arguments: {
        candidacyId: candidacy.id,
        certificationId: certification.id,
      },
      returnFields: "",
    },
  });

  expect(resp.statusCode).toEqual(200);
  expect(resp.json().errors).toBeUndefined();

  const candidacyUpdated = await prismaClient.candidacy.findUnique({
    where: { id: candidacy.id },
  });

  expect(candidacyUpdated?.certificationId).toEqual(certification.id);
});

test("should refresh certificationAuthorityId after candidate updates certification", async () => {
  const candidacy = await createCandidacyHelper({
    candidacyActiveStatus: CandidacyStatusStep.PRISE_EN_CHARGE,
  });
  const newCertification = await createCertificationHelper();
  const ca = await createCertificationAuthorityHelper({
    certificationAuthorityOnCertification: {
      create: { certificationId: newCertification.id },
    },
    certificationAuthorityOnDepartment: {
      create: {
        departmentId: getCandidateDepartmentIdOrThrow(candidacy.candidate),
      },
    },
  });

  await injectGraphql({
    fastify: global.testApp,
    authorization: authorizationHeaderForUser({
      role: "candidate",
      keycloakId: candidacy.candidate?.keycloakId ?? "",
    }),
    payload: {
      requestType: "mutation",
      endpoint: "candidacy_certification_updateCertification",
      arguments: {
        candidacyId: candidacy.id,
        certificationId: newCertification.id,
      },
      returnFields: "",
    },
  });

  const updated = await prismaClient.candidacy.findUnique({
    where: { id: candidacy.id },
  });
  expect(updated?.certificationAuthorityId).toEqual(ca.id);
});
