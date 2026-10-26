import { faker } from "@faker-js/faker";
import { startOfYesterday } from "date-fns";

import {
  NOT_AUTHORIZED,
  NOT_AUTHORIZED_CANDIDACY_ACCESS,
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
import { createFeasibilityUploadedPdfHelper } from "@/test/helpers/entities/create-feasibility-uploaded-pdf-helper";
import { createFileHelper } from "@/test/helpers/entities/create-file-helper";
import { createJuryHelper } from "@/test/helpers/entities/create-jury-helper";
import { createOrganismHelper } from "@/test/helpers/entities/create-organism-helper";
import { injectGraphql } from "@/test/helpers/graphql-helper";

// Autorisation de chaque resolver jury : qui passe, qui est refusé.
//
// Les champs de `Candidacy` et de `Jury` ne sont atteignables qu'à travers une candidature,
// dont l'accès est déjà réservé aux acteurs de la candidature. Les tests de ces champs
// vérifient donc que les quatre acteurs légitimes (admin, AAP accompagnateur, candidat
// propriétaire, certificateur compétent) continuent d'obtenir la donnée : le même contrôle
// d'ownership tourne déjà sur le même parent pour `Candidacy.jury` et `Jury.candidacy`.

const asRole = (role: KeyCloakUserRole, keycloakId?: string) =>
  authorizationHeaderForUser({
    role,
    keycloakId: keycloakId ?? faker.string.uuid(),
  });

// Candidature complète : dossier de faisabilité recevable rattaché à une autorité de
// certification, compte local de cette autorité couvrant la certification et le département
// du candidat (seul montage qui rend le certificateur compétent sur la candidature), et un
// jury passé avec sa convocation.
const creerCandidatureAvecJury = async () => {
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
    decision: "ADMISSIBLE",
  });

  const convocationFile = await createFileHelper();
  const jury = await createJuryHelper({
    candidacyId: candidacy.id,
    certificationAuthorityId: certificationAuthority.id,
    convocationFileId: convocationFile.id,
    dateOfSession: startOfYesterday(),
  });

  await prismaClient.examInfo.create({ data: { candidacyId: candidacy.id } });

  return {
    candidacy,
    jury,
    convocationFile,
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

describe("jury - autorisation des resolvers", () => {
  describe("Candidacy.examInfo, Candidacy.jury et Jury.candidacy", () => {
    const CHAMPS = "{ examInfo { examResult } jury { id candidacy { id } } }";

    test("l'admin : autorisé", async () => {
      const { candidacy, jury } = await creerCandidatureAvecJury();
      const resp = await lireCandidature(candidacy.id, CHAMPS, asRole("admin"));
      expect(resp.json()).not.toHaveProperty("errors");
      expect(resp.json().data.getCandidacyById.jury.id).toBe(jury.id);
    });

    test("l'AAP accompagnateur : autorisé", async () => {
      const { candidacy, jury, aapKeycloakId } =
        await creerCandidatureAvecJury();
      const resp = await lireCandidature(
        candidacy.id,
        CHAMPS,
        asRole("manage_candidacy", aapKeycloakId),
      );
      expect(resp.json()).not.toHaveProperty("errors");
      expect(resp.json().data.getCandidacyById.jury.id).toBe(jury.id);
    });

    test("le candidat propriétaire : autorisé", async () => {
      const { candidacy, jury, candidatKeycloakId } =
        await creerCandidatureAvecJury();
      const resp = await lireCandidature(
        candidacy.id,
        CHAMPS,
        asRole("candidate", candidatKeycloakId),
      );
      expect(resp.json()).not.toHaveProperty("errors");
      expect(resp.json().data.getCandidacyById.jury.id).toBe(jury.id);
    });

    test("le certificateur compétent sur la candidature : autorisé", async () => {
      const { candidacy, jury, certificateurKeycloakId } =
        await creerCandidatureAvecJury();
      const resp = await lireCandidature(
        candidacy.id,
        CHAMPS,
        asRole("manage_feasibility", certificateurKeycloakId),
      );
      expect(resp.json()).not.toHaveProperty("errors");
      expect(resp.json().data.getCandidacyById.jury.id).toBe(jury.id);
    });

    // Le refus vient de la candidature elle-même : elle est le seul point d'entrée vers ces
    // champs, et elle est déjà réservée aux acteurs de la candidature.
    test("un AAP d'un autre organisme : refusé", async () => {
      const { candidacy } = await creerCandidatureAvecJury();
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
      const { candidacy } = await creerCandidatureAvecJury();
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
  });

  describe("Candidacy.historyJury, Jury.convocationFile, Jury.juryResultByCompetenceBlocs et Jury.previouslyValidatedBlocks", () => {
    const CHAMPS = `{
      historyJury { id }
      jury {
        convocationFile { name }
        juryResultByCompetenceBlocs { id }
        previouslyValidatedBlocks { id }
      }
    }`;

    test("l'admin : autorisé", async () => {
      const { candidacy, convocationFile } = await creerCandidatureAvecJury();
      const resp = await lireCandidature(candidacy.id, CHAMPS, asRole("admin"));
      expect(resp.json()).not.toHaveProperty("errors");
      expect(resp.json().data.getCandidacyById.jury.convocationFile.name).toBe(
        convocationFile.name,
      );
    });

    test("l'AAP accompagnateur : autorisé", async () => {
      const { candidacy, convocationFile, aapKeycloakId } =
        await creerCandidatureAvecJury();
      const resp = await lireCandidature(
        candidacy.id,
        CHAMPS,
        asRole("manage_candidacy", aapKeycloakId),
      );
      expect(resp.json()).not.toHaveProperty("errors");
      expect(resp.json().data.getCandidacyById.jury.convocationFile.name).toBe(
        convocationFile.name,
      );
    });

    test("le candidat propriétaire : autorisé", async () => {
      const { candidacy, convocationFile, candidatKeycloakId } =
        await creerCandidatureAvecJury();
      const resp = await lireCandidature(
        candidacy.id,
        CHAMPS,
        asRole("candidate", candidatKeycloakId),
      );
      expect(resp.json()).not.toHaveProperty("errors");
      expect(resp.json().data.getCandidacyById.jury.convocationFile.name).toBe(
        convocationFile.name,
      );
    });

    test("le certificateur compétent sur la candidature : autorisé", async () => {
      const { candidacy, convocationFile, certificateurKeycloakId } =
        await creerCandidatureAvecJury();
      const resp = await lireCandidature(
        candidacy.id,
        CHAMPS,
        asRole("manage_feasibility", certificateurKeycloakId),
      );
      expect(resp.json()).not.toHaveProperty("errors");
      expect(resp.json().data.getCandidacyById.jury.convocationFile.name).toBe(
        convocationFile.name,
      );
    });
  });

  describe("jury_getJuries et jury_juryCountByCategory", () => {
    const listerJurys = (authorization?: string) =>
      injectGraphql({
        fastify: global.testApp,
        authorization,
        payload: {
          requestType: "query",
          endpoint: "jury_getJuries",
          returnFields: "{ rows { id convocationFile { name previewUrl } } }",
        },
      });

    const compterJurys = (authorization?: string) =>
      injectGraphql({
        fastify: global.testApp,
        authorization,
        payload: {
          requestType: "query",
          endpoint: "jury_juryCountByCategory",
          returnFields: "{ SCHEDULED PASSED }",
        },
      });

    // Ces deux requêtes ne sont pas rattachées à une candidature : sans contrôle de rôle,
    // n'importe quel compte authentifié listerait les jurys de toute la plateforme, avec la
    // convocation de chaque candidat et la recherche par nom ou email.
    test("un candidat ne liste pas les jurys des autres candidats", async () => {
      await creerCandidatureAvecJury();
      const autreCandidat = await createCandidateHelper();
      const resp = await listerJurys(
        asRole("candidate", autreCandidat.keycloakId),
      );
      expect(resp.json().errors[0].message).toBe(NOT_AUTHORIZED);
    });

    test("un candidat ne compte pas les jurys des autres candidats", async () => {
      await creerCandidatureAvecJury();
      const autreCandidat = await createCandidateHelper();
      const resp = await compterJurys(
        asRole("candidate", autreCandidat.keycloakId),
      );
      expect(resp.json().errors[0].message).toBe(NOT_AUTHORIZED);
    });

    test("un AAP : refusé sur les deux requêtes", async () => {
      await creerCandidatureAvecJury();
      const aap = await createOrganismHelper();
      const authorization = asRole(
        "manage_candidacy",
        aap.organismOnAccounts[0].account.keycloakId,
      );
      expect((await listerJurys(authorization)).json().errors[0].message).toBe(
        NOT_AUTHORIZED,
      );
      expect((await compterJurys(authorization)).json().errors[0].message).toBe(
        NOT_AUTHORIZED,
      );
    });

    test("un gestionnaire de maison mère : refusé sur les deux requêtes", async () => {
      await creerCandidatureAvecJury();
      const organisme = await createOrganismHelper();
      const authorization = asRole(
        "gestion_maison_mere_aap",
        organisme.maisonMereAAP?.gestionnaire.keycloakId,
      );
      expect((await listerJurys(authorization)).json().errors[0].message).toBe(
        NOT_AUTHORIZED,
      );
      expect((await compterJurys(authorization)).json().errors[0].message).toBe(
        NOT_AUTHORIZED,
      );
    });

    test("l'admin : autorisé, liste tous les jurys actifs", async () => {
      const { jury } = await creerCandidatureAvecJury();
      const resp = await listerJurys(asRole("admin"));
      expect(resp.json()).not.toHaveProperty("errors");
      expect(resp.json().data.jury_getJuries.rows).toHaveLength(1);
      expect(resp.json().data.jury_getJuries.rows[0].id).toBe(jury.id);
    });

    test("le certificateur : autorisé, mais ne voit que les jurys de son périmètre", async () => {
      const { jury, certificateurKeycloakId } =
        await creerCandidatureAvecJury();
      const horsPerimetre = await creerCandidatureAvecJury();
      const resp = await listerJurys(
        asRole("manage_feasibility", certificateurKeycloakId),
      );
      expect(resp.json()).not.toHaveProperty("errors");
      const ids = resp
        .json()
        .data.jury_getJuries.rows.map((row: { id: string }) => row.id);
      expect(ids).toEqual([jury.id]);
      expect(ids).not.toContain(horsPerimetre.jury.id);
    });

    test("non authentifié : refusé", async () => {
      expect((await listerJurys()).json().errors[0].message).toBe(
        SESSION_EXPIRED,
      );
      expect((await listerJurys()).json().errors[0].extensions.code).toBe(
        "UNAUTHENTICATED",
      );
      expect((await compterJurys()).json().errors[0].message).toBe(
        SESSION_EXPIRED,
      );
    });
  });

  describe("jury_updateExamInfo", () => {
    const call = (candidacyId: string, authorization?: string) =>
      injectGraphql({
        fastify: global.testApp,
        authorization,
        payload: {
          requestType: "mutation",
          endpoint: "jury_updateExamInfo",
          arguments: { candidacyId, examInfo: { examResult: "SUCCESS" } },
          enumFields: ["examResult"],
          returnFields: "{ examResult }",
        },
      });

    test("l'admin : autorisé", async () => {
      const { candidacy } = await creerCandidatureAvecJury();
      const resp = await call(candidacy.id, asRole("admin"));
      expect(resp.json()).not.toHaveProperty("errors");
      expect(resp.json().data.jury_updateExamInfo.examResult).toBe("SUCCESS");
    });

    test("l'AAP accompagnateur : autorisé", async () => {
      const { candidacy, aapKeycloakId } = await creerCandidatureAvecJury();
      const resp = await call(
        candidacy.id,
        asRole("manage_candidacy", aapKeycloakId),
      );
      expect(resp.json()).not.toHaveProperty("errors");
    });

    test("le candidat propriétaire : refusé", async () => {
      const { candidacy, candidatKeycloakId } =
        await creerCandidatureAvecJury();
      const resp = await call(
        candidacy.id,
        asRole("candidate", candidatKeycloakId),
      );
      expect(resp.json().errors[0].message).toBe(NOT_AUTHORIZED);
    });

    test("le certificateur : refusé", async () => {
      const { candidacy, certificateurKeycloakId } =
        await creerCandidatureAvecJury();
      const resp = await call(
        candidacy.id,
        asRole("manage_feasibility", certificateurKeycloakId),
      );
      expect(resp.json().errors[0].message).toBe(NOT_AUTHORIZED);
    });

    test("non authentifié : refusé", async () => {
      const { candidacy } = await creerCandidatureAvecJury();
      const resp = await call(candidacy.id);
      expect(resp.json().errors[0].message).toBe(SESSION_EXPIRED);
    });
  });

  describe("jury_updateResult", () => {
    const call = (juryId: string, authorization?: string) =>
      injectGraphql({
        fastify: global.testApp,
        authorization,
        payload: {
          requestType: "mutation",
          endpoint: "jury_updateResult",
          arguments: {
            juryId,
            input: { result: "FULL_SUCCESS_OF_FULL_CERTIFICATION" },
          },
          enumFields: ["result"],
          returnFields: "{ id result }",
        },
      });

    test("l'admin : autorisé", async () => {
      const { jury } = await creerCandidatureAvecJury();
      const resp = await call(jury.id, asRole("admin"));
      expect(resp.json()).not.toHaveProperty("errors");
      expect(resp.json().data.jury_updateResult.result).toBe(
        "FULL_SUCCESS_OF_FULL_CERTIFICATION",
      );
    });

    test("le certificateur compétent sur la candidature : autorisé", async () => {
      const { jury, certificateurKeycloakId } =
        await creerCandidatureAvecJury();
      const resp = await call(
        jury.id,
        asRole("manage_feasibility", certificateurKeycloakId),
      );
      expect(resp.json()).not.toHaveProperty("errors");
    });

    // Le refus doit tomber sur le rôle, avant que la mutation ne lise le jury : sinon un
    // appelant non autorisé sonde l'existence d'un jury et l'état de sa candidature.
    test("l'AAP accompagnateur : refusé sur le rôle", async () => {
      const { jury, aapKeycloakId } = await creerCandidatureAvecJury();
      const resp = await call(
        jury.id,
        asRole("manage_candidacy", aapKeycloakId),
      );
      expect(resp.json().errors[0].message).toBe(NOT_AUTHORIZED);
    });

    test("le candidat propriétaire : refusé sur le rôle", async () => {
      const { jury, candidatKeycloakId } = await creerCandidatureAvecJury();
      const resp = await call(jury.id, asRole("candidate", candidatKeycloakId));
      expect(resp.json().errors[0].message).toBe(NOT_AUTHORIZED);
    });

    // La policy ne porte que le rôle : toute autorité de certification la franchit, quelle
    // que soit la candidature. Le périmètre est tenu par canManageJury dans la feature, et
    // c'est ce refus-là que ce test verrouille : sans lui, un certificateur pourrait écrire
    // un résultat sur la candidature d'un autre, sans retour possible.
    test("le certificateur d'une autre candidature : refusé sur le périmètre", async () => {
      const { jury } = await creerCandidatureAvecJury();
      const autre = await creerCandidatureAvecJury();
      const resp = await call(
        jury.id,
        asRole("manage_feasibility", autre.certificateurKeycloakId),
      );
      expect(resp.json().errors[0].message).toBe(
        NOT_AUTHORIZED_CANDIDACY_MANAGE,
      );
    });

    test("non authentifié : refusé", async () => {
      const { jury } = await creerCandidatureAvecJury();
      const resp = await call(jury.id);
      expect(resp.json().errors[0].message).toBe(SESSION_EXPIRED);
    });
  });

  describe("jury_revokeDecision", () => {
    const call = (juryId: string, authorization?: string) =>
      injectGraphql({
        fastify: global.testApp,
        authorization,
        payload: {
          requestType: "mutation",
          endpoint: "jury_revokeDecision",
          arguments: { juryId, reason: "erreur de saisie" },
          returnFields: "{ id }",
        },
      });

    const creerJuryAvecResultat = () =>
      createJuryHelper({
        dateOfSession: startOfYesterday(),
        result: "FULL_SUCCESS_OF_FULL_CERTIFICATION",
        dateOfResult: new Date(),
      });

    test("l'admin : autorisé", async () => {
      const jury = await creerJuryAvecResultat();
      const resp = await call(jury.id, asRole("admin"));
      expect(resp.json()).not.toHaveProperty("errors");
    });

    test("le certificateur : refusé", async () => {
      const jury = await creerJuryAvecResultat();
      const resp = await call(jury.id, asRole("manage_feasibility"));
      expect(resp.json().errors[0].message).toBe(NOT_AUTHORIZED);
    });

    test("l'AAP : refusé", async () => {
      const jury = await creerJuryAvecResultat();
      const resp = await call(jury.id, asRole("manage_candidacy"));
      expect(resp.json().errors[0].message).toBe(NOT_AUTHORIZED);
    });

    test("non authentifié : refusé", async () => {
      const jury = await creerJuryAvecResultat();
      const resp = await call(jury.id);
      expect(resp.json().errors[0].message).toBe(SESSION_EXPIRED);
    });
  });
});
