import {
  stubQuery,
  stubCertificationAuthorityStructureCGUQueries,
} from "../../../utils/graphql";

import cguCertificateurFixture from "./fixtures/cgu-certificateur.json";

const SELECTORS = {
  CGU_FORM: '[data-testid="cgu-certificateur-form"]',
  CGU_ACCEPTANCE_CHECKBOX:
    '[data-testid="cgu-certificateur-cgu-acceptance-input"]',
  CHARTER_ACCEPTANCE_CHECKBOX:
    '[data-testid="cgu-certificateur-charter-acceptance-input"]',
  CGU_SUBMIT_BUTTON: '[data-testid="cgu-certificateur-submit"]',
  CGU_IGNORE_BUTTON: '[data-testid="cgu-certificateur-ignore"]',
  IGNORE_MODAL_IGNORE_BUTTON:
    '[data-testid="cgu-certificateur-ignore-modal-ignore-button"]',
  IGNORE_MODAL_RELIRE_BUTTON:
    '[data-testid="cgu-certificateur-ignore-modal-relire-button"]',
  TOAST_SUCCESS: '[data-testid="toast-success"]',
  TOAST_ERROR: '[data-testid="toast-error"]',
  AWAITING_MANAGER_VALIDATION:
    '[data-testid="cgu-awaiting-manager-validation"]',
  SHOW_CGU_BUTTON: '[data-testid="cgu-show-button"]',
  CGU: '[data-testid="cgu"]',
  MODAL_CONTAINER_SELECTOR: '[id="modal-ignore-cgu-certificateur"]',
};

interface VisitCguCertificateurParams {
  isRegistryManagerOrAuthorityAdmin?: boolean;
  cguStructure?: { isLatestVersion: boolean };
  acceptCguError?: boolean;
}

function visitCguCertificateur({
  isRegistryManagerOrAuthorityAdmin = true,
  cguStructure = { isLatestVersion: false },
  acceptCguError = false,
}: VisitCguCertificateurParams = {}) {
  cy.intercept("POST", "/graphql", (req) => {
    if (req.body.operationName === "getCguCertificateur") {
      req.alias = "getCguCertificateur";
      req.reply({ statusCode: 200, body: { data: cguCertificateurFixture } });
    }
  });

  cy.intercept("POST", "/api/graphql", (req) => {
    stubQuery(req, "activeFeaturesForConnectedUser", {
      data: {
        activeFeaturesForConnectedUser: [],
      },
    });

    stubCertificationAuthorityStructureCGUQueries(req, {
      data: {
        account_getAccountForConnectedUser: {
          certificationRegistryManager: isRegistryManagerOrAuthorityAdmin
            ? {
                certificationAuthorityStructure: {
                  cguAcceptanceRequired: true,
                  cgu: cguStructure,
                },
              }
            : null,
          certificationAuthority: isRegistryManagerOrAuthorityAdmin
            ? {
                certificationAuthorityStructures: [
                  { cguAcceptanceRequired: true, cgu: cguStructure },
                ],
              }
            : null,
          certificationAuthorityLocalAccount: !isRegistryManagerOrAuthorityAdmin
            ? {
                certificationAuthority: {
                  certificationAuthorityStructures: [
                    {
                      cguAcceptanceRequired: true,
                      cgu: cguStructure,
                    },
                  ],
                },
              }
            : null,
        },
      },
    });

    stubQuery(req, "getCertificationAuthorityStructureCGUInCguPageQuery", {
      data: {
        account_getAccountForConnectedUser: {
          certificationRegistryManager: isRegistryManagerOrAuthorityAdmin
            ? {
                certificationAuthorityStructure: {
                  cguAcceptanceRequired: true,
                  cgu: cguStructure,
                },
              }
            : null,
          certificationAuthority: isRegistryManagerOrAuthorityAdmin
            ? {
                certificationAuthorityStructures: [
                  { cguAcceptanceRequired: true, cgu: cguStructure },
                ],
              }
            : null,
          certificationAuthorityLocalAccount: !isRegistryManagerOrAuthorityAdmin
            ? {
                certificationAuthority: {
                  certificationAuthorityStructures: [
                    {
                      cguAcceptanceRequired: true,
                      cgu: cguStructure,
                    },
                  ],
                },
              }
            : null,
        },
      },
    });

    if (req.body.operationName === "acceptCertificateurCGUMutation") {
      req.alias = "acceptCertificateurCGUMutation";
      if (acceptCguError) {
        req.reply({
          statusCode: 500,
          body: { errors: [{ message: "Error accepting CGU" }] },
        });
      } else {
        req.reply({
          statusCode: 200,
          body: { data: { certification_authority_acceptCgu: true } },
        });
      }
    }

    stubQuery(req, "getMaisonMereCGUQuery", { data: {} });
    stubQuery(req, "getKeycloakConfig", {
      data: { getKeycloakConfig: { url: "", realm: "", clientId: "" } },
    });
    stubQuery(req, "getAuthenticatedUser", {
      data: { authenticatedUser: { id: "test", email: "test@test.test" } },
    });
  }).as("appGraphql");

  if (isRegistryManagerOrAuthorityAdmin) {
    cy.certificateurRegistryManager("/certificateur-cgu");
  } else {
    cy.certificateurLocalAccount("/certificateur-cgu");
  }

  cy.wait(["@activeFeaturesForConnectedUser"]);
}

describe("CGU Certificateur Page", () => {
  beforeEach(() => {
    cy.on("uncaught:exception", (err) => {
      if (err.message.includes("NEXT_REDIRECT")) {
        return false;
      }
      return true;
    });
    cy.intercept("POST", "/graphql", (req) => {
      if (req.body.operationName === "getCguCertificateur") {
        req.alias = "getCguCertificateur";
        req.reply({
          statusCode: 200,
          body: { data: cguCertificateurFixture },
        });
      }
    });
  });

  context("Access Control", () => {
    it("should display CGU page for Registry Manager when CGU version not accepted", () => {
      visitCguCertificateur();
      cy.url().should("include", "/certificateur-cgu");
      cy.get("main").should("exist");
    });

    it("should display CGU page for standard Certificateur when CGU version not accepted", () => {
      visitCguCertificateur({ isRegistryManagerOrAuthorityAdmin: false });
      cy.url().should("include", "/certificateur-cgu");
      cy.get("main").should("exist");
    });
  });

  describe("Certification Authority Registry Manager", () => {
    beforeEach(() => {
      visitCguCertificateur();
    });

    it("should display CGU acceptance form", () => {
      cy.get(SELECTORS.CGU_FORM).should("exist");
    });

    it("should not display awaiting manager validation notice", () => {
      cy.get(SELECTORS.AWAITING_MANAGER_VALIDATION).should("not.exist");
    });

    context("CGU Acceptance Form", () => {
      beforeEach(() => {
        cy.get(SELECTORS.CGU_FORM).should("exist");
      });

      it("should have disabled submit button when checkbox is unchecked", () => {
        cy.get(SELECTORS.CGU_ACCEPTANCE_CHECKBOX).should("exist");
        cy.get(SELECTORS.CHARTER_ACCEPTANCE_CHECKBOX).should("exist");
        cy.get(SELECTORS.CGU_SUBMIT_BUTTON).should("be.disabled");
      });

      it("should enable submit button only when both acceptance checkboxes are checked", () => {
        cy.get(SELECTORS.CHARTER_ACCEPTANCE_CHECKBOX).click({ force: true });
        cy.get(SELECTORS.CGU_SUBMIT_BUTTON).should("be.disabled");
        cy.get(SELECTORS.CGU_ACCEPTANCE_CHECKBOX).click({ force: true });
        cy.get(SELECTORS.CGU_SUBMIT_BUTTON).should("not.be.disabled");
      });

      it("should show success toast notification when CGU are successfully accepted", () => {
        cy.get(SELECTORS.CHARTER_ACCEPTANCE_CHECKBOX).click({
          force: true,
        });
        cy.get(SELECTORS.CGU_ACCEPTANCE_CHECKBOX).click({
          force: true,
        });
        cy.get(SELECTORS.CGU_SUBMIT_BUTTON).click();
        cy.wait("@acceptCertificateurCGUMutation");
        cy.get(SELECTORS.TOAST_SUCCESS).should("exist");
      });

      it("should show error toast notification when CGU acceptance API call fails", () => {
        visitCguCertificateur({
          acceptCguError: true,
        });
        cy.get(SELECTORS.CGU_FORM).should("exist");

        cy.get(SELECTORS.CHARTER_ACCEPTANCE_CHECKBOX).click({
          force: true,
        });
        cy.get(SELECTORS.CGU_ACCEPTANCE_CHECKBOX).click({
          force: true,
        });
        cy.get(SELECTORS.CGU_SUBMIT_BUTTON).click();
        cy.wait("@acceptCertificateurCGUMutation");
        cy.get(SELECTORS.TOAST_ERROR).should("exist");
      });
    });

    context("Ignore CGU Modal", () => {
      beforeEach(() => {
        cy.get(SELECTORS.CGU_FORM).should("exist");
      });

      it("should display both ignore and relire buttons when ignore modal is opened", () => {
        cy.get(SELECTORS.CGU_IGNORE_BUTTON).click();
        cy.get(SELECTORS.IGNORE_MODAL_IGNORE_BUTTON).should("exist");
        cy.get(SELECTORS.IGNORE_MODAL_RELIRE_BUTTON).should("exist");
      });

      it("should close the modal when relire button is clicked", () => {
        cy.get(SELECTORS.CGU_IGNORE_BUTTON).should("be.visible");
        cy.get(SELECTORS.CGU_IGNORE_BUTTON).click();
        cy.get(SELECTORS.IGNORE_MODAL_RELIRE_BUTTON).click();
        cy.get(SELECTORS.CGU_IGNORE_BUTTON).should("be.visible");
        cy.get(SELECTORS.MODAL_CONTAINER_SELECTOR).should("not.be.visible");
      });

      it("should trigger appropriate action when modal ignore button is clicked", () => {
        cy.get(SELECTORS.CGU_FORM).should("be.visible");
        cy.get(SELECTORS.CGU_IGNORE_BUTTON).should("be.visible").click();
        cy.get(SELECTORS.IGNORE_MODAL_IGNORE_BUTTON)
          .should("be.visible")
          .click();
        cy.url().should("include", "/logout-confirmation");
      });
    });
  });

  describe("Local Account", () => {
    beforeEach(() => {
      visitCguCertificateur({ isRegistryManagerOrAuthorityAdmin: false });
    });

    it("should NOT display CGU acceptance form", () => {
      cy.get(SELECTORS.CGU_FORM).should("not.exist");
    });

    it("should display the awaiting manager validation notice", () => {
      cy.get(SELECTORS.AWAITING_MANAGER_VALIDATION).should("exist");
    });

    it("should have a functional button to show CGU content", () => {
      cy.get(SELECTORS.SHOW_CGU_BUTTON).should("exist");
      cy.get(SELECTORS.SHOW_CGU_BUTTON).click();
      cy.get(SELECTORS.CGU).should("be.visible");
    });
  });
});
