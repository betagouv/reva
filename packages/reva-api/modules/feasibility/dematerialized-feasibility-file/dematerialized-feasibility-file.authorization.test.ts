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
import { createFeasibilityDematerializedHelper } from "@/test/helpers/entities/create-feasibility-dematerialized-helper";
import { createFeasibilityUploadedPdfHelper } from "@/test/helpers/entities/create-feasibility-uploaded-pdf-helper";
import { createOrganismHelper } from "@/test/helpers/entities/create-organism-helper";
import { injectGraphql } from "@/test/helpers/graphql-helper";

// Autorisation des resolvers du dossier dématérialisé et du dossier PDF.
//
// Les champs enfants (`DematerializedFeasibilityFile.*`, `FeasibilityUploadedPdf.*`,
// `DFFCertificationCompetenceBloc.*`, `CertificationCompetenceDetails.*`) sont volontairement
// ouverts : leur racine ne porte pas d'identifiant de candidature, un middleware d'ownership y
// retomberait sur `root.id` et refuserait tout le monde. En lecture, ils ne sont atteignables que
// par leur parent, `Feasibility.dematerializedFeasibilityFile` et `Feasibility.feasibilityUploadedPdf` :
// ce sont ces deux points d'étranglement que ce fichier verrouille, avec les 12 mutations.
//
// Réserve : les mutations ne sont pas un étranglement complet. `confirmCandidate`,
// `sendToCandidate` et `createOrUpdateCertificationCompetenceDetails` agissent sur le
// `dematerializedFeasibilityFileId` fourni par l'appelant sans vérifier qu'il appartient au
// `candidacyId` que la policy contrôle. Le trou est antérieur à cette migration et non couvert
// ici : il se ferme dans les features, pas dans la policy map.
//
// Limite connue : `..._createOrUpdateAttachments` et `..._createOrUpdateSwornStatement` prennent
// un scalaire `Upload`, qui exige une requête multipart que `injectGraphql` ne construit pas. Ces
// deux mutations portent la même policy que les quatre autres de leur famille, couvertes ici.

const asRole = (role: KeyCloakUserRole, keycloakId?: string) =>
  authorizationHeaderForUser({
    role,
    keycloakId: keycloakId ?? faker.string.uuid(),
  });

// Candidature rattachée à une autorité de certification dont le compte dispose d'un compte local
// couvrant la certification et le département du candidat. Le compte local doit exister AVANT le
// helper de faisabilité, qui ne relie à la candidature que les comptes locaux déjà existants.
const creerCandidatureRattachee = async () => {
  const certification = await createCertificationHelper();
  const certificationAuthority = await createCertificationAuthorityHelper();
  const candidacy = await createCandidacyHelper({
    candidacyActiveStatus: "DOSSIER_FAISABILITE_ENVOYE",
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

  return {
    candidacy,
    certificationAuthorityId: certificationAuthority.id,
    certificateurKeycloakId: certificationAuthority.account.keycloakId,
    aapKeycloakId:
      candidacy.organism?.organismOnAccounts[0].account.keycloakId ?? "",
    candidatKeycloakId: candidacy.candidate?.keycloakId ?? "",
  };
};

// Même montage, avec un dossier dématérialisé envoyé au certificateur.
const creerCandidatureAvecDFF = async () => {
  const base = await creerCandidatureRattachee();
  const feasibility = await createFeasibilityDematerializedHelper({
    candidacyId: base.candidacy.id,
    certificationAuthorityId: base.certificationAuthorityId,
    decision: "PENDING",
    feasibilityFileSentAt: new Date(),
  });

  return {
    ...base,
    feasibility,
    dffId: feasibility.dematerializedFeasibilityFile!.id,
  };
};

// Même montage, avec un dossier au format PDF.
const creerCandidatureAvecDossierPdf = async () => {
  const base = await creerCandidatureRattachee();
  await createFeasibilityUploadedPdfHelper({
    candidacyId: base.candidacy.id,
    certificationAuthorityId: base.certificationAuthorityId,
  });
  return base;
};

type Contexte = Awaited<ReturnType<typeof creerCandidatureAvecDFF>>;

const muter = (
  endpoint: string,
  args: Record<string, unknown>,
  returnFields: string,
  authorization?: string,
  enumFields?: string[],
) =>
  injectGraphql({
    fastify: global.testApp,
    authorization,
    payload: {
      requestType: "mutation",
      endpoint,
      arguments: args,
      enumFields,
      returnFields,
    },
  });

// Une entrée par mutation appelable : de quoi rejouer chaque clé de resolver avec n'importe quel
// acteur. Le contrôle de rôle tombe avant le resolver, donc les entrées n'ont qu'à être valides
// vis-à-vis du schéma.
type CasMutation = {
  nom: string;
  // Un AAP tiers est écarté soit par le rôle (mutations qui n'admettent pas l'AAP), soit par le
  // périmètre de la candidature.
  refusAapTiers: string;
  appeler: (ctx: Contexte, authorization?: string) => ReturnType<typeof muter>;
};

const MUTATIONS: CasMutation[] = [
  {
    nom: "dematerialized_feasibility_file_createOrUpdateCertificationInfo",
    refusAapTiers: NOT_AUTHORIZED_CANDIDACY_MANAGE,
    appeler: (ctx, authorization) =>
      muter(
        "dematerialized_feasibility_file_createOrUpdateCertificationInfo",
        {
          candidacyId: ctx.candidacy.id,
          input: { blocDeCompetencesIds: [], completion: "PARTIAL" },
        },
        "{ id }",
        authorization,
        ["completion"],
      ),
  },
  {
    nom: "dematerialized_feasibility_file_createOrUpdateCertificationCompetenceDetails",
    refusAapTiers: NOT_AUTHORIZED_CANDIDACY_MANAGE,
    appeler: (ctx, authorization) =>
      muter(
        "dematerialized_feasibility_file_createOrUpdateCertificationCompetenceDetails",
        {
          candidacyId: ctx.candidacy.id,
          input: {
            dematerializedFeasibilityFileId: ctx.dffId,
            competenceBloc: { id: faker.string.uuid(), text: "bloc" },
            competenceDetails: [],
          },
        },
        "{ id }",
        authorization,
      ),
  },
  {
    nom: "dematerialized_feasibility_file_createOrUpdateComplementExperienceParcoursVise",
    refusAapTiers: NOT_AUTHORIZED_CANDIDACY_MANAGE,
    appeler: (ctx, authorization) =>
      muter(
        "dematerialized_feasibility_file_createOrUpdateComplementExperienceParcoursVise",
        {
          candidacyId: ctx.candidacy.id,
          input: { complementExperienceParcoursVise: "complément" },
        },
        "{ id }",
        authorization,
      ),
  },
  {
    nom: "dematerialized_feasibility_file_createOrUpdatePrerequisites",
    refusAapTiers: NOT_AUTHORIZED_CANDIDACY_MANAGE,
    appeler: (ctx, authorization) =>
      muter(
        "dematerialized_feasibility_file_createOrUpdatePrerequisites",
        {
          candidacyId: ctx.candidacy.id,
          input: { prerequisites: [] },
        },
        "{ id }",
        authorization,
      ),
  },
  {
    nom: "dematerialized_feasibility_file_createOrUpdateAapDecision",
    refusAapTiers: NOT_AUTHORIZED_CANDIDACY_MANAGE,
    appeler: (ctx, authorization) =>
      muter(
        "dematerialized_feasibility_file_createOrUpdateAapDecision",
        {
          candidacyId: ctx.candidacy.id,
          input: { aapDecision: "FAVORABLE", aapDecisionComment: "avis" },
        },
        "{ id }",
        authorization,
        ["aapDecision"],
      ),
  },
  {
    nom: "dematerialized_feasibility_file_sendToCandidate",
    refusAapTiers: NOT_AUTHORIZED_CANDIDACY_MANAGE,
    appeler: (ctx, authorization) =>
      muter(
        "dematerialized_feasibility_file_sendToCandidate",
        {
          candidacyId: ctx.candidacy.id,
          dematerializedFeasibilityFileId: ctx.dffId,
        },
        "",
        authorization,
      ),
  },
  {
    nom: "dematerialized_feasibility_file_sendToCertificationAuthority",
    refusAapTiers: NOT_AUTHORIZED_CANDIDACY_MANAGE,
    appeler: (ctx, authorization) =>
      muter(
        "dematerialized_feasibility_file_sendToCertificationAuthority",
        {
          candidacyId: ctx.candidacy.id,
          dematerializedFeasibilityFileId: ctx.dffId,
          certificationAuthorityId: ctx.certificationAuthorityId,
        },
        "",
        authorization,
      ),
  },
  {
    nom: "dematerialized_feasibility_file_confirmCandidate",
    refusAapTiers: NOT_AUTHORIZED,
    appeler: (ctx, authorization) =>
      muter(
        "dematerialized_feasibility_file_confirmCandidate",
        {
          candidacyId: ctx.candidacy.id,
          dematerializedFeasibilityFileId: ctx.dffId,
          input: { candidateDecisionComment: "ok" },
        },
        "{ id }",
        authorization,
      ),
  },
  {
    nom: "dematerialized_feasibility_file_createOrUpdateEligibilityRequirement",
    refusAapTiers: NOT_AUTHORIZED_CANDIDACY_MANAGE,
    appeler: (ctx, authorization) =>
      muter(
        "dematerialized_feasibility_file_createOrUpdateEligibilityRequirement",
        {
          candidacyId: ctx.candidacy.id,
          input: { eligibilityRequirement: "FULL_ELIGIBILITY_REQUIREMENT" },
        },
        "{ id }",
        authorization,
        ["eligibilityRequirement"],
      ),
  },
];

const mutation = (nom: string) => {
  const trouvee = MUTATIONS.find(
    (m) => m.nom === `dematerialized_feasibility_file_${nom}`,
  );
  if (!trouvee) {
    throw new Error(`Mutation ${nom} absente de la table`);
  }
  return trouvee.appeler;
};

const appelerDecisionCertificateur = (ctx: Contexte, authorization?: string) =>
  muter(
    "dematerialized_feasibility_file_createOrUpdateCertificationAuthorityDecision",
    {
      candidacyId: ctx.candidacy.id,
      input: { decision: "INCOMPLETE", decisionComment: "pièces manquantes" },
    },
    "{ id }",
    authorization,
    ["decision"],
  );

describe("dossier de faisabilité dématérialisé - autorisation des resolvers", () => {
  describe("aucune mutation n'est ouverte sans session", () => {
    test.each(MUTATIONS)("$nom : refusé", async ({ appeler }: CasMutation) => {
      const ctx = await creerCandidatureAvecDFF();
      const resp = await appeler(ctx);
      expect(resp.json().errors[0].message).toBe(SESSION_EXPIRED);
    });

    test("la décision du certificateur : refusée", async () => {
      const ctx = await creerCandidatureAvecDFF();
      const resp = await appelerDecisionCertificateur(ctx);
      expect(resp.json().errors[0].message).toBe(SESSION_EXPIRED);
    });
  });

  // Le certificateur n'intervient sur le dossier dématérialisé que par sa décision : toutes les
  // autres mutations sont l'édition du dossier, réservée à l'AAP, au candidat et à l'admin.
  describe("le certificateur est refusé sur toutes les mutations d'édition", () => {
    test.each(MUTATIONS)("$nom : refusé", async ({ appeler }: CasMutation) => {
      const ctx = await creerCandidatureAvecDFF();
      const resp = await appeler(
        ctx,
        asRole("manage_feasibility", ctx.certificateurKeycloakId),
      );
      expect(resp.json().errors[0].message).toBe(NOT_AUTHORIZED);
    });
  });

  describe("un AAP d'un autre organisme est refusé sur toutes les mutations", () => {
    test.each(MUTATIONS)(
      "$nom : refusé",
      async ({ appeler, refusAapTiers }: CasMutation) => {
        const ctx = await creerCandidatureAvecDFF();
        const autreOrganisme = await createOrganismHelper();
        const resp = await appeler(
          ctx,
          asRole(
            "manage_candidacy",
            autreOrganisme.organismOnAccounts[0].account.keycloakId,
          ),
        );
        expect(resp.json().errors[0].message).toBe(refusAapTiers);
      },
    );
  });

  describe("isOwnerOrCanManageCandidacy - édition du dossier", () => {
    const appelerEligibilite = mutation("createOrUpdateEligibilityRequirement");

    test("l'admin : autorisé", async () => {
      const ctx = await creerCandidatureAvecDFF();
      const resp = await appelerEligibilite(ctx, asRole("admin"));
      expect(resp.json()).not.toHaveProperty("errors");
      expect(
        resp.json().data
          .dematerialized_feasibility_file_createOrUpdateEligibilityRequirement
          .id,
      ).toBe(ctx.dffId);
    });

    test("l'AAP accompagnateur : autorisé", async () => {
      const ctx = await creerCandidatureAvecDFF();
      const resp = await appelerEligibilite(
        ctx,
        asRole("manage_candidacy", ctx.aapKeycloakId),
      );
      expect(resp.json()).not.toHaveProperty("errors");
      expect(
        resp.json().data
          .dematerialized_feasibility_file_createOrUpdateEligibilityRequirement
          .id,
      ).toBe(ctx.dffId);
    });

    // La VAE autonome : le candidat remplit lui-même son dossier dématérialisé.
    test("le candidat propriétaire : autorisé", async () => {
      const ctx = await creerCandidatureAvecDFF();
      const resp = await appelerEligibilite(
        ctx,
        asRole("candidate", ctx.candidatKeycloakId),
      );
      expect(resp.json()).not.toHaveProperty("errors");
      expect(
        resp.json().data
          .dematerialized_feasibility_file_createOrUpdateEligibilityRequirement
          .id,
      ).toBe(ctx.dffId);
    });

    test("un candidat qui n'est pas le propriétaire : refusé", async () => {
      const ctx = await creerCandidatureAvecDFF();
      const autreCandidat = await createCandidateHelper();
      const resp = await appelerEligibilite(
        ctx,
        asRole("candidate", autreCandidat.keycloakId),
      );
      expect(resp.json().errors[0].message).toBe(
        NOT_AUTHORIZED_CANDIDACY_ACCESS,
      );
    });
  });

  describe("isAdminOrCandidacyCompanion - avis de l'AAP", () => {
    const appelerAvisAap = mutation("createOrUpdateAapDecision");

    test("l'admin : autorisé", async () => {
      const ctx = await creerCandidatureAvecDFF();
      const resp = await appelerAvisAap(ctx, asRole("admin"));
      expect(resp.json()).not.toHaveProperty("errors");
      expect(
        resp.json().data
          .dematerialized_feasibility_file_createOrUpdateAapDecision.id,
      ).toBe(ctx.dffId);
    });

    test("l'AAP accompagnateur : autorisé", async () => {
      const ctx = await creerCandidatureAvecDFF();
      const resp = await appelerAvisAap(
        ctx,
        asRole("manage_candidacy", ctx.aapKeycloakId),
      );
      expect(resp.json()).not.toHaveProperty("errors");
      expect(
        resp.json().data
          .dematerialized_feasibility_file_createOrUpdateAapDecision.id,
      ).toBe(ctx.dffId);
    });

    // L'avis de l'AAP n'appartient pas au candidat, même sur son propre dossier.
    test("le candidat propriétaire : refusé sur le rôle", async () => {
      const ctx = await creerCandidatureAvecDFF();
      const resp = await appelerAvisAap(
        ctx,
        asRole("candidate", ctx.candidatKeycloakId),
      );
      expect(resp.json().errors[0].message).toBe(NOT_AUTHORIZED);
    });
  });

  // Le trou refermé : la policy ne portait que le rôle, et la feature ne vérifiait rien. Tout
  // compte `manage_feasibility` du pays pouvait prononcer une décision sur n'importe quelle
  // candidature à partir de son seul `candidacyId` - changement de statut, suppression de la
  // pièce d'identité du candidat et envoi des mails compris.
  describe("isAdminOrFeasibilityManager - décision du certificateur", () => {
    test("l'admin : autorisé", async () => {
      const ctx = await creerCandidatureAvecDFF();
      const resp = await appelerDecisionCertificateur(ctx, asRole("admin"));
      expect(resp.json()).not.toHaveProperty("errors");
      expect(
        resp.json().data
          .dematerialized_feasibility_file_createOrUpdateCertificationAuthorityDecision
          .id,
      ).toBe(ctx.dffId);
    });

    test("le certificateur compétent sur la candidature : autorisé", async () => {
      const ctx = await creerCandidatureAvecDFF();
      const resp = await appelerDecisionCertificateur(
        ctx,
        asRole("manage_feasibility", ctx.certificateurKeycloakId),
      );
      expect(resp.json()).not.toHaveProperty("errors");
      expect(
        resp.json().data
          .dematerialized_feasibility_file_createOrUpdateCertificationAuthorityDecision
          .id,
      ).toBe(ctx.dffId);
    });

    test("le certificateur d'une autre autorité : refusé sur le périmètre", async () => {
      const ctx = await creerCandidatureAvecDFF();
      const autre = await creerCandidatureAvecDFF();
      const resp = await appelerDecisionCertificateur(
        ctx,
        asRole("manage_feasibility", autre.certificateurKeycloakId),
      );
      expect(resp.json().errors[0].message).toBe(
        NOT_AUTHORIZED_CANDIDACY_MANAGE,
      );
    });

    test("l'AAP accompagnateur : refusé sur le rôle", async () => {
      const ctx = await creerCandidatureAvecDFF();
      const resp = await appelerDecisionCertificateur(
        ctx,
        asRole("manage_candidacy", ctx.aapKeycloakId),
      );
      expect(resp.json().errors[0].message).toBe(NOT_AUTHORIZED);
    });

    test("le candidat propriétaire : refusé sur le rôle", async () => {
      const ctx = await creerCandidatureAvecDFF();
      const resp = await appelerDecisionCertificateur(
        ctx,
        asRole("candidate", ctx.candidatKeycloakId),
      );
      expect(resp.json().errors[0].message).toBe(NOT_AUTHORIZED);
    });
  });

  // Point d'étranglement du sous-arbre DFF : c'est ici, et seulement ici, que le contrôle
  // d'ownership peut tourner pour protéger les pièces jointes, l'attestation sur l'honneur et le
  // dossier généré.
  describe("Feasibility.dematerializedFeasibilityFile", () => {
    const CHAMPS = `{
      feasibility {
        dematerializedFeasibilityFile {
          id
          attachments { id }
          swornStatementFile { name }
          dffFile { name }
        }
      }
    }`;

    const lire = (candidacyId: string, authorization?: string) =>
      injectGraphql({
        fastify: global.testApp,
        authorization,
        payload: {
          requestType: "query",
          endpoint: "getCandidacyById",
          arguments: { id: candidacyId },
          returnFields: CHAMPS,
        },
      });

    test("l'admin : autorisé", async () => {
      const ctx = await creerCandidatureAvecDFF();
      const resp = await lire(ctx.candidacy.id, asRole("admin"));
      expect(resp.json()).not.toHaveProperty("errors");
      expect(
        resp.json().data.getCandidacyById.feasibility
          .dematerializedFeasibilityFile.id,
      ).toBe(ctx.dffId);
    });

    test("l'AAP accompagnateur : autorisé", async () => {
      const ctx = await creerCandidatureAvecDFF();
      const resp = await lire(
        ctx.candidacy.id,
        asRole("manage_candidacy", ctx.aapKeycloakId),
      );
      expect(resp.json()).not.toHaveProperty("errors");
      expect(
        resp.json().data.getCandidacyById.feasibility
          .dematerializedFeasibilityFile.id,
      ).toBe(ctx.dffId);
    });

    test("le candidat propriétaire : autorisé", async () => {
      const ctx = await creerCandidatureAvecDFF();
      const resp = await lire(
        ctx.candidacy.id,
        asRole("candidate", ctx.candidatKeycloakId),
      );
      expect(resp.json()).not.toHaveProperty("errors");
      expect(
        resp.json().data.getCandidacyById.feasibility
          .dematerializedFeasibilityFile.id,
      ).toBe(ctx.dffId);
    });

    test("le certificateur compétent sur la candidature : autorisé", async () => {
      const ctx = await creerCandidatureAvecDFF();
      const resp = await lire(
        ctx.candidacy.id,
        asRole("manage_feasibility", ctx.certificateurKeycloakId),
      );
      expect(resp.json()).not.toHaveProperty("errors");
      expect(
        resp.json().data.getCandidacyById.feasibility
          .dematerializedFeasibilityFile.id,
      ).toBe(ctx.dffId);
    });

    test("un AAP d'un autre organisme : refusé", async () => {
      const ctx = await creerCandidatureAvecDFF();
      const autreOrganisme = await createOrganismHelper();
      const resp = await lire(
        ctx.candidacy.id,
        asRole(
          "manage_candidacy",
          autreOrganisme.organismOnAccounts[0].account.keycloakId,
        ),
      );
      expect(resp.json().errors[0].message).toBe(
        NOT_AUTHORIZED_CANDIDACY_ACCESS,
      );
    });

    test("un certificateur d'une autre autorité : refusé", async () => {
      const ctx = await creerCandidatureAvecDFF();
      const autre = await creerCandidatureAvecDFF();
      const resp = await lire(
        ctx.candidacy.id,
        asRole("manage_feasibility", autre.certificateurKeycloakId),
      );
      expect(resp.json().errors[0].message).toBe(
        NOT_AUTHORIZED_CANDIDACY_ACCESS,
      );
    });
  });

  // Même point d'étranglement, côté dossier PDF : le dossier, la pièce d'identité, les
  // justificatifs et l'attestation de présence remontent tous des URLs signées.
  describe("Feasibility.feasibilityUploadedPdf", () => {
    const CHAMPS = `{
      feasibility {
        feasibilityUploadedPdf {
          feasibilityFile { name }
          IDFile { name }
          documentaryProofFile { name }
          certificateOfAttendanceFile { name }
        }
      }
    }`;

    const lire = (candidacyId: string, authorization?: string) =>
      injectGraphql({
        fastify: global.testApp,
        authorization,
        payload: {
          requestType: "query",
          endpoint: "getCandidacyById",
          arguments: { id: candidacyId },
          returnFields: CHAMPS,
        },
      });

    test("l'admin : autorisé", async () => {
      const { candidacy } = await creerCandidatureAvecDossierPdf();
      const resp = await lire(candidacy.id, asRole("admin"));
      expect(resp.json()).not.toHaveProperty("errors");
      expect(
        resp.json().data.getCandidacyById.feasibility.feasibilityUploadedPdf
          .feasibilityFile.name,
      ).toBeTruthy();
    });

    test("le candidat propriétaire : autorisé", async () => {
      const { candidacy, candidatKeycloakId } =
        await creerCandidatureAvecDossierPdf();
      const resp = await lire(
        candidacy.id,
        asRole("candidate", candidatKeycloakId),
      );
      expect(resp.json()).not.toHaveProperty("errors");
      expect(
        resp.json().data.getCandidacyById.feasibility.feasibilityUploadedPdf
          .feasibilityFile.name,
      ).toBeTruthy();
    });

    test("le certificateur compétent sur la candidature : autorisé", async () => {
      const { candidacy, certificateurKeycloakId } =
        await creerCandidatureAvecDossierPdf();
      const resp = await lire(
        candidacy.id,
        asRole("manage_feasibility", certificateurKeycloakId),
      );
      expect(resp.json()).not.toHaveProperty("errors");
    });

    test("un AAP d'un autre organisme : refusé, aucune URL de fichier ne remonte", async () => {
      const { candidacy } = await creerCandidatureAvecDossierPdf();
      const autreOrganisme = await createOrganismHelper();
      const resp = await lire(
        candidacy.id,
        asRole(
          "manage_candidacy",
          autreOrganisme.organismOnAccounts[0].account.keycloakId,
        ),
      );
      expect(resp.json().errors[0].message).toBe(
        NOT_AUTHORIZED_CANDIDACY_ACCESS,
      );
    });

    test("un certificateur d'une autre autorité : refusé", async () => {
      const { candidacy } = await creerCandidatureAvecDossierPdf();
      const autre = await creerCandidatureAvecDossierPdf();
      const resp = await lire(
        candidacy.id,
        asRole("manage_feasibility", autre.certificateurKeycloakId),
      );
      expect(resp.json().errors[0].message).toBe(
        NOT_AUTHORIZED_CANDIDACY_ACCESS,
      );
    });
  });
});
