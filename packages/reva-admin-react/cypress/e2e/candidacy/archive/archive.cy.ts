import { CandidacyStatusStep } from "@/graphql/generated/graphql";

import { stubMutation, stubQuery } from "../../../utils/graphql";

function visitArchive({
  userProfile,
  candidacyStatus,
}: {
  userProfile: "admin" | "aap";
  candidacyStatus?: CandidacyStatusStep;
}) {
  cy.fixture("candidacy/candidacy.json").then((candidacy) => {
    candidacy.data.getCandidacyById.status = candidacyStatus
      ? candidacyStatus
      : candidacy.data.getCandidacyById.status;
    cy.intercept("POST", "/api/graphql", (req) => {
      stubQuery(req, "activeFeaturesForConnectedUser", {
        data: {
          activeFeaturesForConnectedUser: [],
        },
      });

      stubQuery(req, "getAccountInfo", "account/admin-info.json");

      stubQuery(req, "candidacy_canAccessCandidacy", {
        data: {
          candidacy_canAccessCandidacy: true,
        },
      });

      stubQuery(req, "getCandidacyForArchivePage", candidacy);
      stubMutation(req, "archiveCandidacyById", {
        data: {
          candidacy_archiveById: {
            id: "c1e2e061-a901-4acb-bffe-5e1920ccf908",
          },
        },
      });
    });
  });

  if (userProfile === "admin") {
    cy.admin("/candidacies/46206f6b-0a59-4478-9338-45e3a8d968e4/archive");
  } else if (userProfile === "aap") {
    cy.collaborateur(
      "/candidacies/46206f6b-0a59-4478-9338-45e3a8d968e4/archive",
    );
  }
}

context("Admin", () => {
  it("display the page when i access it", function () {
    visitArchive({ userProfile: "admin" });
    cy.wait("@candidacy_canAccessCandidacy");
    cy.wait("@getCandidacyForArchivePage");
    cy.get('[data-testid="archive-candidacy-title"]').should(
      "have.text",
      "Archivage de la candidature",
    );
  });

  const statusesBeforeFeasibilityResultsAreKnown: CandidacyStatusStep[] = [
    "PRISE_EN_CHARGE",
    "PARCOURS_ENVOYE",
    "PARCOURS_CONFIRME",
    "DOSSIER_FAISABILITE_COMPLET",
    "DOSSIER_FAISABILITE_INCOMPLET",
  ];
  statusesBeforeFeasibilityResultsAreKnown.forEach(
    (status: CandidacyStatusStep) => {
      it(`shows the correct archival reasons when the feasibility result is not known and the candidacy status is ${status}`, function () {
        visitArchive({ userProfile: "admin", candidacyStatus: status });
        cy.wait("@candidacy_canAccessCandidacy");
        cy.wait("@getCandidacyForArchivePage");
        cy.get('[data-testid="archiving-reason-radio-buttons"]').should(
          "exist",
        );
        cy.get(
          '[data-testid="archiving-reason-radio-button-INACTIVITE_CANDIDAT"]',
        ).should("exist");
        cy.get(
          '[data-testid="archiving-reason-radio-button-REORIENTATION_HORS_FRANCE_VAE"]',
        ).should("exist");
        cy.get(
          '[data-testid="archiving-reason-radio-button-PROBLEME_FINANCEMENT"]',
        ).should("exist");
        cy.get('[data-testid="archiving-reason-radio-button-AUTRE"]').should(
          "exist",
        );

        cy.get(
          '[data-testid="archiving-reason-radio-button-MULTI_CANDIDATURES"]',
        ).should("not.exist");
        cy.get(
          '[data-testid="archiving-reason-radio-button-PASSAGE_AUTONOME_A_ACCOMPAGNE"]',
        ).should("not.exist");
      });
    },
  );

  const statusesAfterFeasibilityResultsAreKnown: CandidacyStatusStep[] = [
    "DOSSIER_FAISABILITE_RECEVABLE",
    "DOSSIER_FAISABILITE_NON_RECEVABLE",
    "DOSSIER_DE_VALIDATION_ENVOYE",
    "DOSSIER_DE_VALIDATION_SIGNALE",
  ];

  statusesAfterFeasibilityResultsAreKnown.forEach(
    (status: CandidacyStatusStep) => {
      it(`shows the correct archival reasons when the feasibility result is known and the candidacy status is ${status}`, function () {
        visitArchive({ userProfile: "admin", candidacyStatus: status });
        cy.wait("@candidacy_canAccessCandidacy");
        cy.wait("@getCandidacyForArchivePage");
        cy.get('[data-testid="archiving-reason-radio-buttons"]').should(
          "exist",
        );
        cy.get(
          '[data-testid="archiving-reason-radio-button-MULTI_CANDIDATURES"]',
        ).should("exist");
        cy.get(
          '[data-testid="archiving-reason-radio-button-PASSAGE_AUTONOME_A_ACCOMPAGNE"]',
        ).should("exist");
        cy.get('[data-testid="archiving-reason-radio-button-AUTRE"]').should(
          "exist",
        );

        cy.get(
          '[data-testid="archiving-reason-radio-button-INACTIVITE_CANDIDAT"]',
        ).should("not.exist");
        cy.get(
          '[data-testid="archiving-reason-radio-button-REORIENTATION_HORS_FRANCE_VAE"]',
        ).should("not.exist");
        cy.get(
          '[data-testid="archiving-reason-radio-button-PROBLEME_FINANCEMENT"]',
        ).should("not.exist");
      });
    },
  );
  it.skip("does not let me validate the form when the archiving reason is not selected", function () {
    visitArchive({
      userProfile: "admin",
      candidacyStatus: "PARCOURS_CONFIRME",
    });
    cy.wait("@candidacy_canAccessCandidacy");
    cy.wait("@getCandidacyForArchivePage");
    cy.get("button").contains("Enregistrer").click({ force: true });
    cy.get("p.fr-message--error").contains("Merci de remplir ce champ");
  });

  it("let me validate the form when the archiving reason is  selected", function () {
    visitArchive({
      userProfile: "admin",
      candidacyStatus: "PARCOURS_CONFIRME",
    });
    cy.wait("@candidacy_canAccessCandidacy");
    cy.wait("@getCandidacyForArchivePage");
    cy.get(
      '[data-testid="archiving-reason-radio-button-INACTIVITE_CANDIDAT"]',
    ).click({ force: true });
    cy.get("button").contains("Enregistrer").click();
    cy.get("button").contains("Confirmer").click();
    cy.wait("@archiveCandidacyById");
    cy.url().should(
      "eq",
      Cypress.config().baseUrl +
        "/candidacies/46206f6b-0a59-4478-9338-45e3a8d968e4/summary/",
    );
  });

  it("blocks archiving when the feasibility file has been sent", function () {
    visitArchive({
      userProfile: "admin",
      candidacyStatus: "DOSSIER_FAISABILITE_ENVOYE",
    });
    cy.wait("@candidacy_canAccessCandidacy");
    cy.wait("@getCandidacyForArchivePage");
    cy.get('[data-testid="candidacy-cannot-be-archived-alert"]').should(
      "exist",
    );
    cy.get('[data-testid="archiving-reason-radio-buttons"]').should(
      "not.exist",
    );
  });
});

context("AAP", () => {
  it("display the page when i access it", function () {
    visitArchive({ userProfile: "aap" });
    cy.wait("@candidacy_canAccessCandidacy");
    cy.wait("@getCandidacyForArchivePage");
    cy.get('[data-testid="archive-candidacy-title"]').should(
      "have.text",
      "Archivage de la candidature",
    );
  });

  const statusesBeforeFeasibilityHasBeenSent: CandidacyStatusStep[] = [
    "PRISE_EN_CHARGE",
    "PARCOURS_ENVOYE",
    "PARCOURS_CONFIRME",
  ];

  statusesBeforeFeasibilityHasBeenSent.forEach(
    (status: CandidacyStatusStep) => {
      it(`shows the correct archival reasons when the feasibility result is not known and the candidacy status is ${status}`, function () {
        visitArchive({ userProfile: "aap", candidacyStatus: status });
        cy.wait("@candidacy_canAccessCandidacy");
        cy.wait("@getCandidacyForArchivePage");
        cy.get('[data-testid="archiving-reason-radio-buttons"]').should(
          "exist",
        );
        cy.get(
          '[data-testid="archiving-reason-radio-button-INACTIVITE_CANDIDAT"]',
        ).should("exist");
        cy.get(
          '[data-testid="archiving-reason-radio-button-REORIENTATION_HORS_FRANCE_VAE"]',
        ).should("exist");
        cy.get(
          '[data-testid="archiving-reason-radio-button-PROBLEME_FINANCEMENT"]',
        ).should("exist");
        cy.get('[data-testid="archiving-reason-radio-button-AUTRE"]').should(
          "exist",
        );

        cy.get(
          '[data-testid="archiving-reason-radio-button-MULTI_CANDIDATURES"]',
        ).should("not.exist");
        cy.get(
          '[data-testid="archiving-reason-radio-button-PASSAGE_AUTONOME_A_ACCOMPAGNE"]',
        ).should("not.exist");
      });
    },
  );

  const statusesAfterFeasibilityHasBeenSent: CandidacyStatusStep[] = [
    "DOSSIER_FAISABILITE_ENVOYE",
    "DOSSIER_FAISABILITE_COMPLET",
    "DOSSIER_FAISABILITE_INCOMPLET",
    "DOSSIER_FAISABILITE_RECEVABLE",
    "DOSSIER_FAISABILITE_NON_RECEVABLE",
    "DOSSIER_DE_VALIDATION_ENVOYE",
    "DOSSIER_DE_VALIDATION_SIGNALE",
  ];

  statusesAfterFeasibilityHasBeenSent.forEach((status: CandidacyStatusStep) => {
    it(`shows me an alert when the feasibility result is known and the candidacy status is ${status}`, function () {
      visitArchive({ userProfile: "aap", candidacyStatus: status });
      cy.wait("@candidacy_canAccessCandidacy");
      cy.wait("@getCandidacyForArchivePage");
      cy.get('[data-testid="candidacy-cannot-be-archived-alert"]').should(
        "exist",
      );
      cy.get('[data-testid="archiving-reason-radio-buttons"]').should(
        "not.exist",
      );
    });
  });
  it.skip("does not let me validate the form when the archiving reason is not selected", function () {
    visitArchive({ userProfile: "aap", candidacyStatus: "PARCOURS_CONFIRME" });
    cy.wait("@candidacy_canAccessCandidacy");
    cy.wait("@getCandidacyForArchivePage");
    cy.get("button").contains("Enregistrer").click({ force: true });
    cy.get("p.fr-message--error").contains("Merci de remplir ce champ");
  });

  it("let me validate the form when the archiving reason is  selected", function () {
    visitArchive({ userProfile: "aap", candidacyStatus: "PARCOURS_CONFIRME" });
    cy.wait("@candidacy_canAccessCandidacy");
    cy.wait("@getCandidacyForArchivePage");
    cy.get(
      '[data-testid="archiving-reason-radio-button-INACTIVITE_CANDIDAT"]',
    ).click({ force: true });
    cy.get("button").contains("Enregistrer").click();
    cy.get("button").contains("Confirmer").click();
    cy.wait("@archiveCandidacyById");
    cy.url().should(
      "eq",
      Cypress.config().baseUrl +
        "/candidacies/46206f6b-0a59-4478-9338-45e3a8d968e4/summary/",
    );
  });
});
