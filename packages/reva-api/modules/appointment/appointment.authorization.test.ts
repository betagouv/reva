import { faker } from "@faker-js/faker";

import {
  NOT_AUTHORIZED,
  SESSION_EXPIRED as UNAUTHENTICATED,
} from "@/modules/shared/security/messages";
import { authorizationHeaderForUser } from "@/test/helpers/authorization-helper";
import { createAppointmentHelper } from "@/test/helpers/entities/create-appointment-helper";
import { createCandidacyHelper } from "@/test/helpers/entities/create-candidacy-helper";
import { createCertificationAuthorityHelper } from "@/test/helpers/entities/create-certification-authority-helper";
import { createFeasibilityDematerializedHelper } from "@/test/helpers/entities/create-feasibility-dematerialized-helper";
import { injectGraphql } from "@/test/helpers/graphql-helper";

// Autorisation des resolvers appointment : complète `appointment.test.ts`, qui ne couvre que
// les chemins d'ownership, sur les rôles hors preset, l'anonyme et les champs de `Candidacy`.

const asRole = (role: KeyCloakUserRole, keycloakId?: string) =>
  authorizationHeaderForUser({
    role,
    keycloakId: keycloakId ?? faker.string.uuid(),
  });

// Un seul champ de `Candidacy` par requête : `appointments` est non nullable, son refus
// annulerait la `Candidacy` entière et rendrait le champ testé inobservable.
const getCandidacyField = ({
  candidacyId,
  returnFields,
  authorization,
}: {
  candidacyId: string;
  returnFields: string;
  authorization?: string;
}) =>
  injectGraphql({
    fastify: global.testApp,
    authorization,
    payload: {
      requestType: "query",
      endpoint: "getCandidacyById",
      arguments: { id: candidacyId },
      returnFields,
    },
  });

// Une candidature avec un rendez-vous, et un certificateur qui accède à la candidature via
// une faisabilité active (fixture reprise de `candidacy.canAccessCandidacy.test.ts`).
const createCandidacyWithAppointmentAndCertificationAuthority = async () => {
  const candidacy = await createCandidacyHelper();
  await createAppointmentHelper({ candidacyId: candidacy.id });
  const certificationAuthority = await createCertificationAuthorityHelper();
  await createFeasibilityDematerializedHelper({
    candidacyId: candidacy.id,
    certificationAuthorityId: certificationAuthority.id,
    isActive: true,
  });

  return { candidacy, certificationAuthority };
};

describe("appointment - autorisation des resolvers", () => {
  describe("Candidacy.firstAppointmentOccuredAt", () => {
    const call = (candidacyId: string, authorization?: string) =>
      getCandidacyField({
        candidacyId,
        returnFields: "{ firstAppointmentOccuredAt }",
        authorization,
      });

    test("admin : autorisé, la date du premier rendez-vous revient", async () => {
      const candidacy = await createCandidacyHelper();
      await createAppointmentHelper({ candidacyId: candidacy.id });

      const resp = await call(candidacy.id, asRole("admin"));
      expect(resp.json()).not.toHaveProperty("errors");
      expect(
        resp.json().data.getCandidacyById.firstAppointmentOccuredAt,
      ).not.toBeNull();
    });

    test("le candidat propriétaire : autorisé, la date revient", async () => {
      const candidacy = await createCandidacyHelper();
      await createAppointmentHelper({ candidacyId: candidacy.id });

      const resp = await call(
        candidacy.id,
        asRole("candidate", candidacy.candidate!.keycloakId),
      );
      expect(resp.json()).not.toHaveProperty("errors");
      expect(
        resp.json().data.getCandidacyById.firstAppointmentOccuredAt,
      ).not.toBeNull();
    });

    // Durcissement : le certificateur accède bien à la candidature, mais plus au champ.
    test("le certificateur rattaché à la candidature : refusé", async () => {
      const { candidacy, certificationAuthority } =
        await createCandidacyWithAppointmentAndCertificationAuthority();

      const resp = await call(
        candidacy.id,
        asRole(
          "manage_certification_authority_local_account",
          certificationAuthority.account.keycloakId,
        ),
      );
      expect(resp.json().errors[0].message).toBe(NOT_AUTHORIZED);
    });
  });

  describe("Candidacy.appointments", () => {
    // Champ frère de `firstAppointmentOccuredAt` : les deux doivent se comporter à l'identique.
    test("le certificateur rattaché à la candidature : refusé", async () => {
      const { candidacy, certificationAuthority } =
        await createCandidacyWithAppointmentAndCertificationAuthority();

      const resp = await getCandidacyField({
        candidacyId: candidacy.id,
        returnFields: "{ appointments { rows { id } } }",
        authorization: asRole(
          "manage_certification_authority_local_account",
          certificationAuthority.account.keycloakId,
        ),
      });
      expect(resp.json().errors[0].message).toBe(NOT_AUTHORIZED);
    });
  });

  describe("Appointment.temporalStatus", () => {
    // La feuille reste publique : elle n'est protégée que par son parent.
    test("admin : autorisé, un rendez-vous à venir est UPCOMING", async () => {
      const candidacy = await createCandidacyHelper();
      await createAppointmentHelper({
        candidacyId: candidacy.id,
        date: faker.date.future(),
      });

      const resp = await getCandidacyField({
        candidacyId: candidacy.id,
        returnFields: "{ appointments { rows { id temporalStatus } } }",
        authorization: asRole("admin"),
      });
      expect(resp.json()).not.toHaveProperty("errors");
      expect(
        resp.json().data.getCandidacyById.appointments.rows[0].temporalStatus,
      ).toBe("UPCOMING");
    });
  });

  describe("appointment_getAppointmentById", () => {
    // Identifiants fictifs : le refus porte sur l'absence de session, avant toute lecture.
    test("non authentifié : refusé", async () => {
      const resp = await injectGraphql({
        fastify: global.testApp,
        payload: {
          requestType: "query",
          endpoint: "appointment_getAppointmentById",
          arguments: {
            candidacyId: faker.string.uuid(),
            appointmentId: faker.string.uuid(),
          },
          returnFields: "{ id }",
        },
      });
      expect(resp.json().errors[0].message).toBe(UNAUTHENTICATED);
    });
  });

  describe("appointment_createAppointment", () => {
    // `isAdminOrCandidacyCompanion` n'admet pas le rôle candidate, même propriétaire.
    test("le candidat propriétaire de la candidature : refusé", async () => {
      const candidacy = await createCandidacyHelper();

      const resp = await injectGraphql({
        fastify: global.testApp,
        authorization: asRole("candidate", candidacy.candidate!.keycloakId),
        payload: {
          requestType: "mutation",
          endpoint: "appointment_createAppointment",
          arguments: {
            input: {
              candidacyId: candidacy.id,
              type: "RENDEZ_VOUS_PEDAGOGIQUE",
              title: "Rendez-vous pédagogique",
              date: "2225-09-26T10:00:00.000Z",
            },
          },
          enumFields: ["type"],
          returnFields: "{ id }",
        },
      });
      expect(resp.json().errors[0].message).toBe(NOT_AUTHORIZED);
    });
  });
});
