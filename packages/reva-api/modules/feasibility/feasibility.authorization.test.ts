import { faker } from "@faker-js/faker";

import {
  NOT_AUTHORIZED,
  NOT_AUTHORIZED_CANDIDACY_ACCESS,
  NOT_AUTHORIZED_CANDIDACY_MANAGE,
  SESSION_EXPIRED,
} from "@/modules/shared/security/messages";
import { authorizationHeaderForUser } from "@/test/helpers/authorization-helper";
import { createCandidacyHelper } from "@/test/helpers/entities/create-candidacy-helper";
import { createCandidateHelper } from "@/test/helpers/entities/create-candidate-helper";
import { createCertificationAuthorityHelper } from "@/test/helpers/entities/create-certification-authority-helper";
import { createCertificationAuthorityLocalAccountHelper } from "@/test/helpers/entities/create-certification-authority-local-account-helper";
import { createCertificationHelper } from "@/test/helpers/entities/create-certification-helper";
import { createFeasibilityUploadedPdfHelper } from "@/test/helpers/entities/create-feasibility-uploaded-pdf-helper";
import { createFileHelper } from "@/test/helpers/entities/create-file-helper";
import { createOrganismHelper } from "@/test/helpers/entities/create-organism-helper";
import { injectGraphql } from "@/test/helpers/graphql-helper";

// Autorisation de chaque resolver du module `feasibility` : qui passe, qui est refusé.
//
// Les champs de `Candidacy` et de `Feasibility` portent tous le même contrôle, parce qu'ils
// portent tous la même donnée : le dossier du candidat, son courrier de décision et l'historique
// de ses décisions. Leurs racines exposent un identifiant de candidature (`root.id` pour une
// `Candidacy`, `root.candidacyId` pour une `Feasibility`), donc le contrôle d'ownership y est
// réellement applicable - à la différence des enfants du DFF et du PDF, laissés ouverts et gardés
// par leur parent (voir `dematerialized-feasibility-file.authorization.test.ts`).
//
// Les trois requêtes de listing ne sont, elles, rattachées à aucune candidature : seul le rôle
// peut les garder. Sans ce contrôle, n'importe quel compte authentifié listerait les dossiers de
// toute la plateforme.

const asRole = (role: KeyCloakUserRole, keycloakId?: string) =>
  authorizationHeaderForUser({
    role,
    keycloakId: keycloakId ?? faker.string.uuid(),
  });

// Candidature complète : dossier de faisabilité PDF recevable avec courrier de décision, rattaché
// à une autorité de certification dont le compte dispose d'un compte local couvrant la
// certification et le département du candidat (seul montage qui rend le certificateur compétent).
// Le compte local doit exister AVANT le helper de faisabilité, qui ne relie que l'existant.
const creerCandidatureAvecDossier = async () => {
  const certification = await createCertificationHelper();
  const certificationAuthority = await createCertificationAuthorityHelper();
  const candidacy = await createCandidacyHelper({
    candidacyActiveStatus: "DOSSIER_FAISABILITE_RECEVABLE",
    candidacyArgs: { certificationId: certification.id },
  });

  await createCertificationAuthorityLocalAccountHelper({
    certificationAuthorityId: certificationAuthority.id,
    accountId: certificationAuthority.account.id,
    certificationAuthorityLocalAccountOnCertification: {
      create: { certificationId: certification.id },
    },
    certificationAuthorityLocalAccountOnDepartment: {
      create: { departmentId: candidacy.candidate?.departmentId ?? "" },
    },
  });

  const decisionFile = await createFileHelper();
  const feasibility = await createFeasibilityUploadedPdfHelper({
    candidacyId: candidacy.id,
    certificationAuthorityId: certificationAuthority.id,
    decision: "ADMISSIBLE",
    decisionFileId: decisionFile.id,
  });

  return {
    candidacy,
    feasibility,
    decisionFile,
    certificateurKeycloakId: certificationAuthority.account.keycloakId,
    aapKeycloakId:
      candidacy.organism?.organismOnAccounts[0].account.keycloakId ?? "",
    candidatKeycloakId: candidacy.candidate?.keycloakId ?? "",
  };
};

const lireCandidature = (
  candidacyId: string,
  returnFields: string,
  authorization?: string,
) =>
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

describe("feasibility - autorisation des resolvers", () => {
  describe("champs de Candidacy et de Feasibility", () => {
    const CHAMPS = `{
      certificationAuthorities { id }
      warningOnFeasibilitySubmission
      feasibility {
        id
        candidacy { id }
        decisionFile { name }
        history { id }
      }
    }`;

    test("l'admin : autorisé", async () => {
      const { candidacy, feasibility, decisionFile } =
        await creerCandidatureAvecDossier();
      const resp = await lireCandidature(candidacy.id, CHAMPS, asRole("admin"));
      expect(resp.json()).not.toHaveProperty("errors");
      expect(resp.json().data.getCandidacyById.feasibility.id).toBe(
        feasibility.id,
      );
      expect(
        resp.json().data.getCandidacyById.feasibility.decisionFile.name,
      ).toBe(decisionFile.name);
    });

    test("l'AAP accompagnateur : autorisé", async () => {
      const { candidacy, feasibility, aapKeycloakId } =
        await creerCandidatureAvecDossier();
      const resp = await lireCandidature(
        candidacy.id,
        CHAMPS,
        asRole("manage_candidacy", aapKeycloakId),
      );
      expect(resp.json()).not.toHaveProperty("errors");
      expect(resp.json().data.getCandidacyById.feasibility.id).toBe(
        feasibility.id,
      );
    });

    test("le candidat propriétaire : autorisé", async () => {
      const { candidacy, decisionFile, candidatKeycloakId } =
        await creerCandidatureAvecDossier();
      const resp = await lireCandidature(
        candidacy.id,
        CHAMPS,
        asRole("candidate", candidatKeycloakId),
      );
      expect(resp.json()).not.toHaveProperty("errors");
      expect(
        resp.json().data.getCandidacyById.feasibility.decisionFile.name,
      ).toBe(decisionFile.name);
    });

    test("le certificateur compétent sur la candidature : autorisé", async () => {
      const { candidacy, feasibility, certificateurKeycloakId } =
        await creerCandidatureAvecDossier();
      const resp = await lireCandidature(
        candidacy.id,
        CHAMPS,
        asRole("manage_feasibility", certificateurKeycloakId),
      );
      expect(resp.json()).not.toHaveProperty("errors");
      expect(resp.json().data.getCandidacyById.feasibility.id).toBe(
        feasibility.id,
      );
    });

    // Le refus vient de la candidature elle-même : elle est le seul point d'entrée vers ces
    // champs, et elle est déjà réservée aux acteurs de la candidature.
    test("un AAP d'un autre organisme : refusé", async () => {
      const { candidacy } = await creerCandidatureAvecDossier();
      const autreOrganisme = await createOrganismHelper();
      const resp = await lireCandidature(
        candidacy.id,
        CHAMPS,
        asRole(
          "manage_candidacy",
          autreOrganisme.organismOnAccounts[0].account.keycloakId,
        ),
      );
      expect(resp.json().errors[0].message).toBe(
        NOT_AUTHORIZED_CANDIDACY_ACCESS,
      );
    });

    test("un candidat qui n'est pas le propriétaire : refusé", async () => {
      const { candidacy } = await creerCandidatureAvecDossier();
      const autreCandidat = await createCandidateHelper();
      const resp = await lireCandidature(
        candidacy.id,
        CHAMPS,
        asRole("candidate", autreCandidat.keycloakId),
      );
      expect(resp.json().errors[0].message).toBe(
        NOT_AUTHORIZED_CANDIDACY_ACCESS,
      );
    });

    test("un certificateur d'une autre autorité : refusé", async () => {
      const { candidacy } = await creerCandidatureAvecDossier();
      const autre = await creerCandidatureAvecDossier();
      const resp = await lireCandidature(
        candidacy.id,
        CHAMPS,
        asRole("manage_feasibility", autre.certificateurKeycloakId),
      );
      expect(resp.json().errors[0].message).toBe(
        NOT_AUTHORIZED_CANDIDACY_ACCESS,
      );
    });
  });

  describe("feasibility_getActiveFeasibilityByCandidacyId", () => {
    const call = (candidacyId: string, authorization?: string) =>
      injectGraphql({
        fastify: global.testApp,
        authorization,
        payload: {
          requestType: "query",
          endpoint: "feasibility_getActiveFeasibilityByCandidacyId",
          arguments: { candidacyId },
          returnFields: "{ id decision }",
        },
      });

    test("l'admin : autorisé", async () => {
      const { candidacy, feasibility } = await creerCandidatureAvecDossier();
      const resp = await call(candidacy.id, asRole("admin"));
      expect(resp.json()).not.toHaveProperty("errors");
      expect(
        resp.json().data.feasibility_getActiveFeasibilityByCandidacyId.id,
      ).toBe(feasibility.id);
    });

    test("l'AAP accompagnateur : autorisé", async () => {
      const { candidacy, aapKeycloakId } = await creerCandidatureAvecDossier();
      const resp = await call(
        candidacy.id,
        asRole("manage_candidacy", aapKeycloakId),
      );
      expect(resp.json()).not.toHaveProperty("errors");
    });

    test("le candidat propriétaire : autorisé", async () => {
      const { candidacy, candidatKeycloakId } =
        await creerCandidatureAvecDossier();
      const resp = await call(
        candidacy.id,
        asRole("candidate", candidatKeycloakId),
      );
      expect(resp.json()).not.toHaveProperty("errors");
    });

    test("le certificateur compétent sur la candidature : autorisé", async () => {
      const { candidacy, certificateurKeycloakId } =
        await creerCandidatureAvecDossier();
      const resp = await call(
        candidacy.id,
        asRole("manage_feasibility", certificateurKeycloakId),
      );
      expect(resp.json()).not.toHaveProperty("errors");
    });

    test("un certificateur d'une autre autorité : refusé", async () => {
      const { candidacy } = await creerCandidatureAvecDossier();
      const autre = await creerCandidatureAvecDossier();
      const resp = await call(
        candidacy.id,
        asRole("manage_feasibility", autre.certificateurKeycloakId),
      );
      expect(resp.json().errors[0].message).toBe(
        NOT_AUTHORIZED_CANDIDACY_MANAGE,
      );
    });

    test("non authentifié : refusé", async () => {
      const { candidacy } = await creerCandidatureAvecDossier();
      const resp = await call(candidacy.id);
      expect(resp.json().errors[0].message).toBe(SESSION_EXPIRED);
    });
  });

  describe("feasibilities, feasibilityCountByCategory et feasibility", () => {
    const listerDossiers = (authorization?: string) =>
      injectGraphql({
        fastify: global.testApp,
        authorization,
        payload: {
          requestType: "query",
          endpoint: "feasibilities",
          returnFields: "{ rows { id } }",
        },
      });

    const compterDossiers = (authorization?: string) =>
      injectGraphql({
        fastify: global.testApp,
        authorization,
        payload: {
          requestType: "query",
          endpoint: "feasibilityCountByCategory",
          returnFields: "{ ALL ADMISSIBLE }",
        },
      });

    const lireDossier = (feasibilityId: string, authorization?: string) =>
      injectGraphql({
        fastify: global.testApp,
        authorization,
        payload: {
          requestType: "query",
          endpoint: "feasibility",
          arguments: { feasibilityId },
          returnFields: "{ id decision }",
        },
      });

    test("l'admin : autorisé sur les trois requêtes", async () => {
      const { feasibility } = await creerCandidatureAvecDossier();
      const authorization = asRole("admin");
      const liste = await listerDossiers(authorization);
      expect(liste.json()).not.toHaveProperty("errors");
      expect(
        liste.json().data.feasibilities.rows.map((r: { id: string }) => r.id),
      ).toContain(feasibility.id);

      const compte = await compterDossiers(authorization);
      expect(compte.json()).not.toHaveProperty("errors");

      const dossier = await lireDossier(feasibility.id, authorization);
      expect(dossier.json()).not.toHaveProperty("errors");
      expect(dossier.json().data.feasibility.id).toBe(feasibility.id);
    });

    test("le certificateur : autorisé, mais ne voit que les dossiers de son périmètre", async () => {
      const { feasibility, certificateurKeycloakId } =
        await creerCandidatureAvecDossier();
      const horsPerimetre = await creerCandidatureAvecDossier();
      const resp = await listerDossiers(
        asRole("manage_feasibility", certificateurKeycloakId),
      );
      expect(resp.json()).not.toHaveProperty("errors");
      const ids = resp
        .json()
        .data.feasibilities.rows.map((row: { id: string }) => row.id);
      expect(ids).toEqual([feasibility.id]);
      expect(ids).not.toContain(horsPerimetre.feasibility.id);
    });

    // Sans contrôle de rôle en amont, un candidat ou un AAP atteint la feature, qui lui répond
    // sur l'existence du dossier avant de le refuser.
    test("un candidat : refusé sur les trois requêtes", async () => {
      const { feasibility } = await creerCandidatureAvecDossier();
      const autreCandidat = await createCandidateHelper();
      const authorization = asRole("candidate", autreCandidat.keycloakId);
      expect(
        (await listerDossiers(authorization)).json().errors[0].message,
      ).toBe(NOT_AUTHORIZED);
      expect(
        (await compterDossiers(authorization)).json().errors[0].message,
      ).toBe(NOT_AUTHORIZED);
      expect(
        (await lireDossier(feasibility.id, authorization)).json().errors[0]
          .message,
      ).toBe(NOT_AUTHORIZED);
    });

    test("un AAP : refusé sur les trois requêtes", async () => {
      const { feasibility } = await creerCandidatureAvecDossier();
      const aap = await createOrganismHelper();
      const authorization = asRole(
        "manage_candidacy",
        aap.organismOnAccounts[0].account.keycloakId,
      );
      expect(
        (await listerDossiers(authorization)).json().errors[0].message,
      ).toBe(NOT_AUTHORIZED);
      expect(
        (await compterDossiers(authorization)).json().errors[0].message,
      ).toBe(NOT_AUTHORIZED);
      expect(
        (await lireDossier(feasibility.id, authorization)).json().errors[0]
          .message,
      ).toBe(NOT_AUTHORIZED);
    });

    test("non authentifié : refusé sur les trois requêtes", async () => {
      const { feasibility } = await creerCandidatureAvecDossier();
      const liste = await listerDossiers();
      expect(liste.json().errors[0].message).toBe(SESSION_EXPIRED);
      expect(liste.json().errors[0].extensions.code).toBe("UNAUTHENTICATED");
      expect((await compterDossiers()).json().errors[0].message).toBe(
        SESSION_EXPIRED,
      );
      expect((await lireDossier(feasibility.id)).json().errors[0].message).toBe(
        SESSION_EXPIRED,
      );
    });
  });

  describe("feasibility_updateFeasibilityFileTemplateFirstReadAt", () => {
    const call = (candidacyId: string, authorization?: string) =>
      injectGraphql({
        fastify: global.testApp,
        authorization,
        payload: {
          requestType: "mutation",
          endpoint: "feasibility_updateFeasibilityFileTemplateFirstReadAt",
          arguments: { candidacyId },
          returnFields: "{ id }",
        },
      });

    test("l'admin : autorisé", async () => {
      const { candidacy } = await creerCandidatureAvecDossier();
      const resp = await call(candidacy.id, asRole("admin"));
      expect(resp.json()).not.toHaveProperty("errors");
      expect(
        resp.json().data.feasibility_updateFeasibilityFileTemplateFirstReadAt
          .id,
      ).toBe(candidacy.id);
    });

    test("le candidat propriétaire : autorisé", async () => {
      const { candidacy, candidatKeycloakId } =
        await creerCandidatureAvecDossier();
      const resp = await call(
        candidacy.id,
        asRole("candidate", candidatKeycloakId),
      );
      expect(resp.json()).not.toHaveProperty("errors");
    });

    test("un candidat qui n'est pas le propriétaire : refusé", async () => {
      const { candidacy } = await creerCandidatureAvecDossier();
      const autreCandidat = await createCandidateHelper();
      const resp = await call(
        candidacy.id,
        asRole("candidate", autreCandidat.keycloakId),
      );
      expect(resp.json().errors[0].message).toBe(
        NOT_AUTHORIZED_CANDIDACY_ACCESS,
      );
    });

    test("l'AAP accompagnateur : refusé sur le rôle", async () => {
      const { candidacy, aapKeycloakId } = await creerCandidatureAvecDossier();
      const resp = await call(
        candidacy.id,
        asRole("manage_candidacy", aapKeycloakId),
      );
      expect(resp.json().errors[0].message).toBe(NOT_AUTHORIZED);
    });

    test("le certificateur : refusé sur le rôle", async () => {
      const { candidacy, certificateurKeycloakId } =
        await creerCandidatureAvecDossier();
      const resp = await call(
        candidacy.id,
        asRole("manage_feasibility", certificateurKeycloakId),
      );
      expect(resp.json().errors[0].message).toBe(NOT_AUTHORIZED);
    });

    test("non authentifié : refusé", async () => {
      const { candidacy } = await creerCandidatureAvecDossier();
      const resp = await call(candidacy.id);
      expect(resp.json().errors[0].message).toBe(SESSION_EXPIRED);
    });
  });

  describe("feasibility_updateFeasibilityFileDematAutonomeFirstOpeningAt", () => {
    const call = (candidacyId: string, authorization?: string) =>
      injectGraphql({
        fastify: global.testApp,
        authorization,
        payload: {
          requestType: "mutation",
          endpoint:
            "feasibility_updateFeasibilityFileDematAutonomeFirstOpeningAt",
          arguments: { candidacyId },
          returnFields: "{ id }",
        },
      });

    test("l'admin : autorisé", async () => {
      const { candidacy } = await creerCandidatureAvecDossier();
      const resp = await call(candidacy.id, asRole("admin"));
      expect(resp.json()).not.toHaveProperty("errors");
      expect(
        resp.json().data
          .feasibility_updateFeasibilityFileDematAutonomeFirstOpeningAt.id,
      ).toBe(candidacy.id);
    });

    test("le candidat propriétaire : autorisé", async () => {
      const { candidacy, candidatKeycloakId } =
        await creerCandidatureAvecDossier();
      const resp = await call(
        candidacy.id,
        asRole("candidate", candidatKeycloakId),
      );
      expect(resp.json()).not.toHaveProperty("errors");
    });

    test("un candidat qui n'est pas le propriétaire : refusé", async () => {
      const { candidacy } = await creerCandidatureAvecDossier();
      const autreCandidat = await createCandidateHelper();
      const resp = await call(
        candidacy.id,
        asRole("candidate", autreCandidat.keycloakId),
      );
      expect(resp.json().errors[0].message).toBe(
        NOT_AUTHORIZED_CANDIDACY_ACCESS,
      );
    });

    test("l'AAP accompagnateur : refusé sur le rôle", async () => {
      const { candidacy, aapKeycloakId } = await creerCandidatureAvecDossier();
      const resp = await call(
        candidacy.id,
        asRole("manage_candidacy", aapKeycloakId),
      );
      expect(resp.json().errors[0].message).toBe(NOT_AUTHORIZED);
    });

    test("le certificateur : refusé sur le rôle", async () => {
      const { candidacy, certificateurKeycloakId } =
        await creerCandidatureAvecDossier();
      const resp = await call(
        candidacy.id,
        asRole("manage_feasibility", certificateurKeycloakId),
      );
      expect(resp.json().errors[0].message).toBe(NOT_AUTHORIZED);
    });

    test("non authentifié : refusé", async () => {
      const { candidacy } = await creerCandidatureAvecDossier();
      const resp = await call(candidacy.id);
      expect(resp.json().errors[0].message).toBe(SESSION_EXPIRED);
    });
  });

  describe("feasibility_revokeCertificationAuthorityDecision", () => {
    const call = (feasibilityId: string, authorization?: string) =>
      injectGraphql({
        fastify: global.testApp,
        authorization,
        payload: {
          requestType: "mutation",
          endpoint: "feasibility_revokeCertificationAuthorityDecision",
          arguments: { feasibilityId, reason: "erreur de saisie" },
          returnFields: "{ id decision }",
        },
      });

    test("l'admin : autorisé", async () => {
      const { feasibility } = await creerCandidatureAvecDossier();
      const resp = await call(feasibility.id, asRole("admin"));
      expect(resp.json()).not.toHaveProperty("errors");
      expect(
        resp.json().data.feasibility_revokeCertificationAuthorityDecision
          .decision,
      ).toBe("COMPLETE");
    });

    // L'annulation d'une décision est réservée à l'admin, y compris pour le certificateur qui l'a
    // prononcée : le bouton de l'espace certificateur est lui aussi conditionné à `isAdmin`.
    test("le certificateur compétent sur la candidature : refusé", async () => {
      const { feasibility, certificateurKeycloakId } =
        await creerCandidatureAvecDossier();
      const resp = await call(
        feasibility.id,
        asRole("manage_feasibility", certificateurKeycloakId),
      );
      expect(resp.json().errors[0].message).toBe(NOT_AUTHORIZED);
    });

    test("l'AAP accompagnateur : refusé", async () => {
      const { feasibility, aapKeycloakId } =
        await creerCandidatureAvecDossier();
      const resp = await call(
        feasibility.id,
        asRole("manage_candidacy", aapKeycloakId),
      );
      expect(resp.json().errors[0].message).toBe(NOT_AUTHORIZED);
    });

    test("le candidat propriétaire : refusé", async () => {
      const { feasibility, candidatKeycloakId } =
        await creerCandidatureAvecDossier();
      const resp = await call(
        feasibility.id,
        asRole("candidate", candidatKeycloakId),
      );
      expect(resp.json().errors[0].message).toBe(NOT_AUTHORIZED);
    });

    test("non authentifié : refusé", async () => {
      const { feasibility } = await creerCandidatureAvecDossier();
      const resp = await call(feasibility.id);
      expect(resp.json().errors[0].message).toBe(SESSION_EXPIRED);
    });
  });
});
