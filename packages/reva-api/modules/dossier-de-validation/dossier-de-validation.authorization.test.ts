import { faker } from "@faker-js/faker";

import {
  NOT_AUTHORIZED,
  NOT_AUTHORIZED_CANDIDACY_MANAGE,
  SESSION_EXPIRED,
} from "@/modules/shared/security/messages";
import { prismaClient } from "@/prisma/client";
import { authorizationHeaderForUser } from "@/test/helpers/authorization-helper";
import { createCandidacyHelper } from "@/test/helpers/entities/create-candidacy-helper";
import { createCandidateHelper } from "@/test/helpers/entities/create-candidate-helper";
import { createCertificationAuthorityHelper } from "@/test/helpers/entities/create-certification-authority-helper";
import { createCertificationAuthorityLocalAccountHelper } from "@/test/helpers/entities/create-certification-authority-local-account-helper";
import { createCertificationHelper } from "@/test/helpers/entities/create-certification-helper";
import { createDossierDeValidationHelper } from "@/test/helpers/entities/create-dossier-de-validation-helper";
import { createFeasibilityUploadedPdfHelper } from "@/test/helpers/entities/create-feasibility-uploaded-pdf-helper";
import { createFileHelper } from "@/test/helpers/entities/create-file-helper";
import { createOrganismHelper } from "@/test/helpers/entities/create-organism-helper";
import { injectGraphql } from "@/test/helpers/graphql-helper";

// Autorisation de chaque resolver dossier de validation : qui passe, qui est refusé.
//
// Les champs de `DossierDeValidation` et de `Candidacy` ne sont atteignables qu'à travers une
// candidature ou une requête déjà réservée au certificateur compétent. Les tests de ces champs
// vérifient donc que les quatre acteurs légitimes (admin, AAP accompagnateur, candidat
// propriétaire, certificateur compétent) continuent d'obtenir la donnée : le même contrôle
// d'ownership tourne déjà sur le même parent pour `DossierDeValidation.candidacy`.

const asRole = (role: KeyCloakUserRole, keycloakId?: string) =>
  authorizationHeaderForUser({
    role,
    keycloakId: keycloakId ?? faker.string.uuid(),
  });

// Candidature complète : dossier de faisabilité rattaché à une autorité de certification,
// compte local de cette autorité couvrant la certification et le département du candidat
// (seul montage qui rend le certificateur compétent sur la candidature), un dossier de
// validation actif avec ses pièces jointes et un dossier précédent signalé incomplet.
const creerCandidatureAvecDossierDeValidation = async () => {
  const certification = await createCertificationHelper();
  const certificationAuthority = await createCertificationAuthorityHelper();
  const candidacy = await createCandidacyHelper({
    candidacyActiveStatus: "DOSSIER_DE_VALIDATION_ENVOYE",
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

  await createFeasibilityUploadedPdfHelper({
    certificationAuthorityId: certificationAuthority.id,
    candidacyId: candidacy.id,
  });

  const dossierDeValidation = await createDossierDeValidationHelper({
    candidacyId: candidacy.id,
    certificationAuthorityId: certificationAuthority.id,
  });

  const autreFichier = await createFileHelper();
  await prismaClient.dossierDeValidationOtherFilesOnFile.create({
    data: {
      dossierDeValidationId: dossierDeValidation.id,
      fileId: autreFichier.id,
    },
  });

  await createDossierDeValidationHelper({
    candidacyId: candidacy.id,
    certificationAuthorityId: certificationAuthority.id,
    decision: "INCOMPLETE",
    isActive: false,
  });

  return {
    candidacy,
    dossierDeValidation,
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

describe("dossier de validation - autorisation des resolvers", () => {
  describe("champs de Candidacy et de DossierDeValidation", () => {
    const CHAMPS = `{
      historyDossierDeValidation { id }
      activeDossierDeValidation {
        id
        candidacy { id }
        dossierDeValidationFile { name }
        dossierDeValidationOtherFiles { name }
        history { id }
      }
    }`;

    const attendreLaDonnee = (
      resp: Awaited<ReturnType<typeof lireCandidature>>,
      dossierDeValidationId: string,
    ) => {
      expect(resp.json()).not.toHaveProperty("errors");
      expect(
        resp.json().data.getCandidacyById.activeDossierDeValidation.id,
      ).toBe(dossierDeValidationId);
      expect(
        resp.json().data.getCandidacyById.activeDossierDeValidation
          .dossierDeValidationOtherFiles,
      ).toHaveLength(1);
      expect(
        resp.json().data.getCandidacyById.activeDossierDeValidation.history,
      ).toHaveLength(1);
      expect(
        resp.json().data.getCandidacyById.historyDossierDeValidation,
      ).toHaveLength(1);
    };

    test("l'admin : autorisé", async () => {
      const { candidacy, dossierDeValidation } =
        await creerCandidatureAvecDossierDeValidation();
      const resp = await lireCandidature(candidacy.id, CHAMPS, asRole("admin"));
      attendreLaDonnee(resp, dossierDeValidation.id);
    });

    test("l'AAP accompagnateur : autorisé", async () => {
      const { candidacy, dossierDeValidation, aapKeycloakId } =
        await creerCandidatureAvecDossierDeValidation();
      const resp = await lireCandidature(
        candidacy.id,
        CHAMPS,
        asRole("manage_candidacy", aapKeycloakId),
      );
      attendreLaDonnee(resp, dossierDeValidation.id);
    });

    test("le candidat propriétaire : autorisé", async () => {
      const { candidacy, dossierDeValidation, candidatKeycloakId } =
        await creerCandidatureAvecDossierDeValidation();
      const resp = await lireCandidature(
        candidacy.id,
        CHAMPS,
        asRole("candidate", candidatKeycloakId),
      );
      attendreLaDonnee(resp, dossierDeValidation.id);
    });

    test("le certificateur compétent sur la candidature : autorisé", async () => {
      const { candidacy, dossierDeValidation, certificateurKeycloakId } =
        await creerCandidatureAvecDossierDeValidation();
      const resp = await lireCandidature(
        candidacy.id,
        CHAMPS,
        asRole("manage_feasibility", certificateurKeycloakId),
      );
      attendreLaDonnee(resp, dossierDeValidation.id);
    });
  });

  describe("dossierDeValidation_getDossiersDeValidation et dossierDeValidation_dossierDeValidationCountByCategory", () => {
    const lister = (authorization?: string) =>
      injectGraphql({
        fastify: global.testApp,
        authorization,
        payload: {
          requestType: "query",
          endpoint: "dossierDeValidation_getDossiersDeValidation",
          returnFields: "{ rows { id } }",
        },
      });

    const compter = (authorization?: string) =>
      injectGraphql({
        fastify: global.testApp,
        authorization,
        payload: {
          requestType: "query",
          endpoint: "dossierDeValidation_dossierDeValidationCountByCategory",
          returnFields: "{ ALL PENDING INCOMPLETE COMPLETE }",
        },
      });

    test("l'admin : autorisé", async () => {
      const { dossierDeValidation } =
        await creerCandidatureAvecDossierDeValidation();
      const resp = await lister(asRole("admin"));
      expect(resp.json()).not.toHaveProperty("errors");
      expect(
        resp.json().data.dossierDeValidation_getDossiersDeValidation.rows[0].id,
      ).toBe(dossierDeValidation.id);
      expect((await compter(asRole("admin"))).json()).not.toHaveProperty(
        "errors",
      );
    });

    test("le certificateur : autorisé, mais ne voit que son périmètre", async () => {
      const { dossierDeValidation, certificateurKeycloakId } =
        await creerCandidatureAvecDossierDeValidation();
      const horsPerimetre = await creerCandidatureAvecDossierDeValidation();
      const resp = await lister(
        asRole("manage_feasibility", certificateurKeycloakId),
      );
      expect(resp.json()).not.toHaveProperty("errors");
      const ids = resp
        .json()
        .data.dossierDeValidation_getDossiersDeValidation.rows.map(
          (row: { id: string }) => row.id,
        );
      expect(ids).toEqual([dossierDeValidation.id]);
      expect(ids).not.toContain(horsPerimetre.dossierDeValidation.id);
    });

    test("un candidat : refusé sur les deux requêtes", async () => {
      const candidat = await createCandidateHelper();
      const authorization = asRole("candidate", candidat.keycloakId);
      expect((await lister(authorization)).json().errors[0].message).toBe(
        NOT_AUTHORIZED,
      );
      expect((await compter(authorization)).json().errors[0].message).toBe(
        NOT_AUTHORIZED,
      );
    });

    test("un AAP : refusé sur les deux requêtes", async () => {
      const aap = await createOrganismHelper();
      const authorization = asRole(
        "manage_candidacy",
        aap.organismOnAccounts[0].account.keycloakId,
      );
      expect((await lister(authorization)).json().errors[0].message).toBe(
        NOT_AUTHORIZED,
      );
      expect((await compter(authorization)).json().errors[0].message).toBe(
        NOT_AUTHORIZED,
      );
    });

    test("non authentifié : refusé", async () => {
      expect((await lister()).json().errors[0].message).toBe(SESSION_EXPIRED);
      expect((await compter()).json().errors[0].message).toBe(SESSION_EXPIRED);
    });
  });

  // Cette requête n'est pas gardée par un rôle mais par le périmètre : un certificateur qui
  // ne gère pas ce dossier est refusé.
  describe("dossierDeValidation_getDossierDeValidationById", () => {
    const call = (dossierDeValidationId: string, authorization?: string) =>
      injectGraphql({
        fastify: global.testApp,
        authorization,
        payload: {
          requestType: "query",
          endpoint: "dossierDeValidation_getDossierDeValidationById",
          arguments: { dossierDeValidationId },
          returnFields: "{ id candidacy { id } }",
        },
      });

    test("l'admin : autorisé", async () => {
      const { candidacy, dossierDeValidation } =
        await creerCandidatureAvecDossierDeValidation();
      const resp = await call(dossierDeValidation.id, asRole("admin"));
      expect(resp.json()).not.toHaveProperty("errors");
      expect(
        resp.json().data.dossierDeValidation_getDossierDeValidationById
          .candidacy.id,
      ).toBe(candidacy.id);
    });

    test("le certificateur compétent sur le dossier : autorisé", async () => {
      const { dossierDeValidation, certificateurKeycloakId } =
        await creerCandidatureAvecDossierDeValidation();
      const resp = await call(
        dossierDeValidation.id,
        asRole("manage_feasibility", certificateurKeycloakId),
      );
      expect(resp.json()).not.toHaveProperty("errors");
    });

    test("le certificateur d'un autre dossier : refusé", async () => {
      const { dossierDeValidation } =
        await creerCandidatureAvecDossierDeValidation();
      const autre = await creerCandidatureAvecDossierDeValidation();
      const resp = await call(
        dossierDeValidation.id,
        asRole("manage_feasibility", autre.certificateurKeycloakId),
      );
      expect(resp.json().errors[0].message).toBe(
        NOT_AUTHORIZED_CANDIDACY_MANAGE,
      );
    });

    test("l'AAP accompagnateur : refusé", async () => {
      const { dossierDeValidation, aapKeycloakId } =
        await creerCandidatureAvecDossierDeValidation();
      const resp = await call(
        dossierDeValidation.id,
        asRole("manage_candidacy", aapKeycloakId),
      );
      expect(resp.json().errors[0].message).toBe(
        NOT_AUTHORIZED_CANDIDACY_MANAGE,
      );
    });

    // Ce contrôle ne renvoie jamais SESSION_EXPIRED : il n'est pas précédé d'un contrôle de
    // rôle. On assert le message exact quand même, sinon le test passerait aussi bien sur une
    // erreur interne que sur un vrai refus.
    test("non authentifié : refusé", async () => {
      const { dossierDeValidation } =
        await creerCandidatureAvecDossierDeValidation();
      const resp = await call(dossierDeValidation.id);
      expect(resp.json().errors[0].message).toBe(
        NOT_AUTHORIZED_CANDIDACY_MANAGE,
      );
    });
  });

  describe("dossierDeValidation_markAsComplete et dossierDeValidation_markAsIncomplete", () => {
    const marquerComplet = (
      dossierDeValidationId: string,
      authorization?: string,
    ) =>
      injectGraphql({
        fastify: global.testApp,
        authorization,
        payload: {
          requestType: "mutation",
          endpoint: "dossierDeValidation_markAsComplete",
          arguments: { dossierDeValidationId, decisionComment: "dossier reçu" },
          returnFields: "{ id decision }",
        },
      });

    const marquerIncomplet = (
      dossierDeValidationId: string,
      authorization?: string,
    ) =>
      injectGraphql({
        fastify: global.testApp,
        authorization,
        payload: {
          requestType: "mutation",
          endpoint: "dossierDeValidation_markAsIncomplete",
          arguments: {
            dossierDeValidationId,
            decisionComment: "pièce manquante",
          },
          returnFields: "{ id decision }",
        },
      });

    test("l'admin : autorisé", async () => {
      const { dossierDeValidation } =
        await creerCandidatureAvecDossierDeValidation();
      const resp = await marquerComplet(
        dossierDeValidation.id,
        asRole("admin"),
      );
      expect(resp.json()).not.toHaveProperty("errors");
      expect(resp.json().data.dossierDeValidation_markAsComplete.decision).toBe(
        "COMPLETE",
      );
    });

    test("le certificateur compétent sur le dossier : autorisé", async () => {
      const { dossierDeValidation, certificateurKeycloakId } =
        await creerCandidatureAvecDossierDeValidation();
      const resp = await marquerIncomplet(
        dossierDeValidation.id,
        asRole("manage_feasibility", certificateurKeycloakId),
      );
      expect(resp.json()).not.toHaveProperty("errors");
      expect(
        resp.json().data.dossierDeValidation_markAsIncomplete.decision,
      ).toBe("INCOMPLETE");
    });

    test("le certificateur d'un autre dossier : refusé", async () => {
      const { dossierDeValidation } =
        await creerCandidatureAvecDossierDeValidation();
      const autre = await creerCandidatureAvecDossierDeValidation();
      const resp = await marquerComplet(
        dossierDeValidation.id,
        asRole("manage_feasibility", autre.certificateurKeycloakId),
      );
      expect(resp.json().errors[0].message).toBe(
        NOT_AUTHORIZED_CANDIDACY_MANAGE,
      );
    });

    test("l'AAP accompagnateur : refusé", async () => {
      const { dossierDeValidation, aapKeycloakId } =
        await creerCandidatureAvecDossierDeValidation();
      const resp = await marquerIncomplet(
        dossierDeValidation.id,
        asRole("manage_candidacy", aapKeycloakId),
      );
      expect(resp.json().errors[0].message).toBe(
        NOT_AUTHORIZED_CANDIDACY_MANAGE,
      );
    });
  });
});
