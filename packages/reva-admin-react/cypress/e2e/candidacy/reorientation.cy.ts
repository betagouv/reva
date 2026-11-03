import { stubMutation, stubQuery } from "../../utils/graphql";

const candidacyId = "46206f6b-0a59-4478-9338-45e3a8d968e4";

function visitReorientation({
  userProfile,
  candidacyFixture,
}: {
  userProfile: "admin" | "aap";
  candidacyFixture: string;
}) {
  cy.intercept("POST", "/api/graphql", (req) => {
    stubQuery(req, "activeFeaturesForConnectedUser", {
      data: {
        activeFeaturesForConnectedUser: [],
      },
    });
    if (userProfile === "aap") {
      stubQuery(req, "getAccountInfo", "account/aap-info.json");
    } else {
      stubQuery(req, "getAccountInfo", "account/admin-info.json");
    }

    stubQuery(req, "candidacy_canAccessCandidacy", {
      data: {
        candidacy_canAccessCandidacy: true,
      },
    });

    stubQuery(req, "getCandidacyForReorientation", candidacyFixture);
    stubQuery(
      req,
      "getCertificationsForCandidate",
      "candidacy/reorientation/certifications-list.json",
    );
    stubMutation(
      req,
      "updateCertificationWithinOrganismScope",
      "candidacy/reorientation/update-certification-success.json",
    );
    stubMutation(
      req,
      "updateCertification",
      "candidacy/reorientation/update-certification-success.json",
    );
  });

  if (userProfile === "admin") {
    cy.admin(`/candidacies/${candidacyId}/reorientation`);
  } else {
    cy.collaborateur(`/candidacies/${candidacyId}/reorientation`);
  }
}

const candidacyScenarios = [
  {
    description: "Candidacy with AAP",
    userProfile: "aap" as const,
    candidacyFixture: "candidacy/reorientation/candidacy-with-aap.json",
  },
  {
    description: "Candidacy without AAP",
    userProfile: "admin" as const,
    candidacyFixture: "candidacy/reorientation/candidacy-without-aap.json",
  },
  {
    description: "Candidacy with AUTONOME type",
    userProfile: "admin" as const,
    candidacyFixture: "candidacy/reorientation/candidacy-autonome.json",
  },
];

describe("Certification reorientation page", () => {
  candidacyScenarios.forEach((scenario) => {
    context(scenario.description, () => {
      it(`should display selected certification and search result ${scenario.description}`, () => {
        visitReorientation({
          userProfile: scenario.userProfile,
          candidacyFixture: scenario.candidacyFixture,
        });

        cy.wait("@candidacy_canAccessCandidacy");
        cy.wait("@getCandidacyForReorientation");
        cy.wait("@getCertificationsForCandidate");

        cy.contains("label", "Certification choisie par le candidat")
          .parent()
          .within(() => {
            cy.contains("Titre professionnel").should("exist");
            cy.contains("RNCP37780").should("exist");
            cy.contains(
              "Titre à finalité professionnelle Assistant de vie dépendance (ADVD)",
            ).should("exist");
          });

        cy.get('[data-testid="results"] > div').should("have.length", 2);

        [
          {
            label: "Titre professionnel Agent de restauration",
            codeRncp: "RNCP35650",
            typeDiplome: "Titre professionnel",
          },
          {
            label: "Diplôme d'État d'aide-soignant",
            codeRncp: "RNCP35830",
            typeDiplome: "Diplôme d'État",
          },
        ].forEach((certification) => {
          cy.contains(
            '[data-testid="results"] > div',
            certification.label,
          ).within(() => {
            cy.contains(certification.typeDiplome).should("exist");
            cy.contains(certification.codeRncp).should("exist");
          });
        });
      });

      it("should allow selecting a new certification", () => {
        visitReorientation({
          userProfile: scenario.userProfile,
          candidacyFixture: scenario.candidacyFixture,
        });

        cy.wait("@getCandidacyForReorientation");
        cy.wait("@getCertificationsForCandidate");

        cy.contains(
          '[data-testid="results"] > div',
          "Titre professionnel Agent de restauration",
        )
          .find("button")
          .click();

        cy.get("#confirm-reorientation").should("be.visible");
        cy.contains("Titre professionnel Agent de restauration").should(
          "exist",
        );
      });
    });
  });
});
