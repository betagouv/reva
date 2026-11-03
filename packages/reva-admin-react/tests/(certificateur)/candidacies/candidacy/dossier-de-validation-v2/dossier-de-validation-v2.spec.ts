import {
  expect,
  graphql,
  Page,
  test,
} from "next/experimental/testmode/playwright/msw";

import { DossierDeValidationDecision } from "@/graphql/generated/graphql";

import { login } from "../../../../shared/helpers/auth/login";
import { getCertificateurCommonHandlers } from "../../../../shared/helpers/common-handlers/certificateur/getCertificateurCommon.handlers";
import { graphQLResolver } from "../../../../shared/helpers/network/msw";
import { waitGraphQL } from "../../../../shared/helpers/network/requests";

const fvae = graphql.link("https://reva-api/api/graphql");

const CANDIDACY_ID = "42288593-2a6b-4606-aedd-0d76348b39f4";
const PAGE_PATH = `/admin2/candidacies/${CANDIDACY_ID}/dossier-de-validation-v2`;
// The DSFR Link adapter prepends the Next.js basePath ("/admin2") and adds
// a trailing slash to every internal href, so rendered attributes/URLs
// differ from the literal path strings used in the app's source code.
const CORRECTION_PAGE_HREF = `/admin2/candidacies/${CANDIDACY_ID}/dossier-de-validation-v2/problem/`;
const SENT_AT = 1716984000000; // 2024-05-29
const DECISION_SENT_AT = 1717588800000; // 2024-06-05
const READY_FOR_JURY_ESTIMATED_AT = "2024-08-15";

type DossierDeValidationFixture = {
  id: string;
  decision: DossierDeValidationDecision;
  decisionSentAt?: number | null;
  decisionComment?: string | null;
  dossierDeValidationSentAt: number;
  dossierDeValidationFile: {
    name: string;
    url: string;
    previewUrl?: string | null;
  };
  dossierDeValidationOtherFiles?: {
    name: string;
    url: string;
    previewUrl?: string | null;
  }[];
};

const file = (
  name: string,
  previewUrl: string | null = `https://files.example.com/${name}/preview`,
) => ({
  name,
  url: `https://files.example.com/${name}`,
  previewUrl,
});

function createDossierDeValidationHandler({
  readyForJuryEstimatedAt = null,
  activeDossierDeValidation = null,
  jury = null,
  historyDossierDeValidation = [],
}: {
  readyForJuryEstimatedAt?: string | null;
  activeDossierDeValidation?: DossierDeValidationFixture | null;
  jury?: { id: string } | null;
  historyDossierDeValidation?: DossierDeValidationFixture[];
}) {
  return fvae.query(
    "getCandidacyWithDossierDeValidation",
    graphQLResolver({
      getCandidacyById: {
        id: CANDIDACY_ID,
        readyForJuryEstimatedAt,
        status: "DOSSIER_DE_VALIDATION_ENVOYE",
        activeDossierDeValidation: activeDossierDeValidation && {
          dossierDeValidationOtherFiles: [],
          ...activeDossierDeValidation,
        },
        jury,
        historyDossierDeValidation: historyDossierDeValidation.map(
          (dossierDeValidation) => ({
            dossierDeValidationOtherFiles: [],
            ...dossierDeValidation,
          }),
        ),
      },
    }),
  );
}

async function openDossierDeValidationPage(page: Page) {
  await login({ page, role: "certificateur" });
  await page.goto(PAGE_PATH);
  await Promise.all([
    waitGraphQL(page, "activeFeaturesForConnectedUser"),
    waitGraphQL(page, "getCandidacyWithCandidateInfoForLayout"),
    waitGraphQL(page, "getCandidacyWithDossierDeValidation"),
  ]);
}

test.describe("Dossier de validation v2 page", () => {
  const { certificateurCommonHandlers } = getCertificateurCommonHandlers({
    candidacyId: CANDIDACY_ID,
    candidateFirstname: "Camille",
    candidateLastname: "Durand",
  });

  test("shows the 'en attente' call-out and no tabs when readyForJuryEstimatedAt is not set", async ({
    page,
    msw,
  }) => {
    msw.use(
      ...certificateurCommonHandlers,
      createDossierDeValidationHandler({}),
    );

    await openDossierDeValidationPage(page);

    await expect(
      page.getByRole("heading", { name: "Dossier de validation", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByText("Dossier de validation en attente"),
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: "Dossier" })).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Demander une correction" }),
    ).toHaveCount(0);
  });

  test("shows the dossier card and the correction link pointing to the v2 problem page when decision is PENDING and no jury", async ({
    page,
    msw,
  }) => {
    msw.use(
      ...certificateurCommonHandlers,
      createDossierDeValidationHandler({
        readyForJuryEstimatedAt: READY_FOR_JURY_ESTIMATED_AT,
        activeDossierDeValidation: {
          id: "ddv-1",
          decision: "PENDING",
          dossierDeValidationSentAt: SENT_AT,
          dossierDeValidationFile: file("dossier.pdf"),
        },
        jury: null,
      }),
    );

    await openDossierDeValidationPage(page);

    await expect(
      page.getByText(
        "Retrouvez ici les documents liés au dossier de validation du candidat.",
      ),
    ).toBeVisible();
    await expect(page.getByText("Dossier déposé le :")).toBeVisible();
    await expect(page.getByText("29/05/2024")).toBeVisible();

    // Regression for the v2 routing fix: the button must link to the
    // dossier-de-validation-v2 problem page, not the legacy folder.
    await expect(
      page.getByRole("link", { name: "Demander une correction" }),
    ).toHaveAttribute("href", CORRECTION_PAGE_HREF);
  });

  test("hides the correction link when decision is PENDING but a jury already exists", async ({
    page,
    msw,
  }) => {
    msw.use(
      ...certificateurCommonHandlers,
      createDossierDeValidationHandler({
        readyForJuryEstimatedAt: READY_FOR_JURY_ESTIMATED_AT,
        activeDossierDeValidation: {
          id: "ddv-1",
          decision: "PENDING",
          dossierDeValidationSentAt: SENT_AT,
          dossierDeValidationFile: file("dossier.pdf"),
        },
        jury: { id: "jury-1" },
      }),
    );

    await openDossierDeValidationPage(page);

    await expect(page.getByText("Dossier déposé le :")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Demander une correction" }),
    ).toHaveCount(0);
  });

  test("shows the signalé date and motif for an INCOMPLETE decision", async ({
    page,
    msw,
  }) => {
    msw.use(
      ...certificateurCommonHandlers,
      createDossierDeValidationHandler({
        readyForJuryEstimatedAt: READY_FOR_JURY_ESTIMATED_AT,
        activeDossierDeValidation: {
          id: "ddv-2",
          decision: "INCOMPLETE",
          dossierDeValidationSentAt: SENT_AT,
          decisionSentAt: DECISION_SENT_AT,
          decisionComment: "Pièce manquante : CV à jour.",
          dossierDeValidationFile: file("dossier.pdf"),
        },
        jury: null,
      }),
    );

    await openDossierDeValidationPage(page);

    await expect(page.getByText("Dossier signalé le :")).toBeVisible();
    await expect(page.getByText("Motif du signalement :")).toBeVisible();
    await expect(page.getByText("Pièce manquante : CV à jour.")).toBeVisible();
    // Existing behavior: the "signalé le" date is the deposit date
    // (sentAt), not decisionSentAt. Asserting the actual rendering.
    await expect(page.getByText("29/05/2024")).toHaveCount(2);
    // decision isn't PENDING, so no correction link should show.
    await expect(
      page.getByRole("link", { name: "Demander une correction" }),
    ).toHaveCount(0);
  });

  test("shows 'Non renseignée' when an INCOMPLETE decision has no comment", async ({
    page,
    msw,
  }) => {
    msw.use(
      ...certificateurCommonHandlers,
      createDossierDeValidationHandler({
        readyForJuryEstimatedAt: READY_FOR_JURY_ESTIMATED_AT,
        activeDossierDeValidation: {
          id: "ddv-2",
          decision: "INCOMPLETE",
          dossierDeValidationSentAt: SENT_AT,
          decisionSentAt: DECISION_SENT_AT,
          decisionComment: null,
          dossierDeValidationFile: file("dossier.pdf"),
        },
        jury: null,
      }),
    );

    await openDossierDeValidationPage(page);

    await expect(page.getByText("Non renseignée")).toBeVisible();
  });

  test("shows the vérifié date for a COMPLETE decision and no motif", async ({
    page,
    msw,
  }) => {
    msw.use(
      ...certificateurCommonHandlers,
      createDossierDeValidationHandler({
        readyForJuryEstimatedAt: READY_FOR_JURY_ESTIMATED_AT,
        activeDossierDeValidation: {
          id: "ddv-3",
          decision: "COMPLETE",
          dossierDeValidationSentAt: SENT_AT,
          decisionSentAt: DECISION_SENT_AT,
          decisionComment: null,
          dossierDeValidationFile: file("dossier.pdf"),
        },
        jury: null,
      }),
    );

    await openDossierDeValidationPage(page);

    await expect(page.getByText("Dossier vérifié le :")).toBeVisible();
    await expect(page.getByText("Motif du signalement :")).toHaveCount(0);
  });

  test("shows file previews for the main file and other files that have a previewUrl", async ({
    page,
    msw,
  }) => {
    msw.use(
      ...certificateurCommonHandlers,
      createDossierDeValidationHandler({
        readyForJuryEstimatedAt: READY_FOR_JURY_ESTIMATED_AT,
        activeDossierDeValidation: {
          id: "ddv-1",
          decision: "PENDING",
          dossierDeValidationSentAt: SENT_AT,
          dossierDeValidationFile: file("dossier.pdf"),
          dossierDeValidationOtherFiles: [file("annexe.pdf")],
        },
        jury: null,
      }),
    );

    await openDossierDeValidationPage(page);

    await expect(page.getByText("Contenu du dossier :")).toBeVisible();
    await expect(
      page.getByTestId("feasibility-files-preview-dossier.pdf"),
    ).toBeVisible();
    await expect(
      page.getByTestId("feasibility-files-preview-annexe.pdf"),
    ).toBeVisible();
  });

  test("does not render a preview block for a file without a previewUrl", async ({
    page,
    msw,
  }) => {
    msw.use(
      ...certificateurCommonHandlers,
      createDossierDeValidationHandler({
        readyForJuryEstimatedAt: READY_FOR_JURY_ESTIMATED_AT,
        activeDossierDeValidation: {
          id: "ddv-1",
          decision: "PENDING",
          dossierDeValidationSentAt: SENT_AT,
          dossierDeValidationFile: file("dossier.pdf", null),
          dossierDeValidationOtherFiles: [],
        },
        jury: null,
      }),
    );

    await openDossierDeValidationPage(page);

    await expect(
      page.getByTestId("feasibility-files-preview-dossier.pdf"),
    ).toHaveCount(0);
  });

  test("shows the history accordion with past dossiers when history is non-empty", async ({
    page,
    msw,
  }) => {
    msw.use(
      ...certificateurCommonHandlers,
      createDossierDeValidationHandler({
        readyForJuryEstimatedAt: READY_FOR_JURY_ESTIMATED_AT,
        activeDossierDeValidation: {
          id: "ddv-1",
          decision: "PENDING",
          dossierDeValidationSentAt: SENT_AT,
          dossierDeValidationFile: file("dossier.pdf"),
        },
        jury: null,
        historyDossierDeValidation: [
          {
            id: "ddv-history-1",
            decision: "INCOMPLETE",
            dossierDeValidationSentAt: 1700000000000,
            decisionSentAt: 1701000000000,
            decisionComment: "Ancien motif",
            dossierDeValidationFile: file("ancien.pdf"),
          },
        ],
      }),
    );

    await openDossierDeValidationPage(page);

    const accordionButton = page.getByRole("button", {
      name: "Voir les précédents dossiers de validation",
    });
    await expect(accordionButton).toBeVisible();

    await accordionButton.click();

    await expect(page.getByText("Ancien motif")).toBeVisible();
    await expect(page.getByText("Dossier déposé le :")).toHaveCount(2);
  });

  test("does not render the history accordion when history is empty", async ({
    page,
    msw,
  }) => {
    msw.use(
      ...certificateurCommonHandlers,
      createDossierDeValidationHandler({
        readyForJuryEstimatedAt: READY_FOR_JURY_ESTIMATED_AT,
        activeDossierDeValidation: {
          id: "ddv-1",
          decision: "PENDING",
          dossierDeValidationSentAt: SENT_AT,
          dossierDeValidationFile: file("dossier.pdf"),
        },
        jury: null,
        historyDossierDeValidation: [],
      }),
    );

    await openDossierDeValidationPage(page);

    await expect(
      page.getByText("Voir les précédents dossiers de validation"),
    ).toHaveCount(0);
  });

  // There is no test for the "Attente de la date prévisionnelle" alert
  // inside this tab: the tabs only render once readyForJuryEstimatedAt is
  // set (see pageStatus "SHOW_DV" in page.tsx), so that alert's branch is
  // currently unreachable through the page.

  test("'Date prévisionnelle' tab shows the formatted date when it is set", async ({
    page,
    msw,
  }) => {
    msw.use(
      ...certificateurCommonHandlers,
      createDossierDeValidationHandler({
        readyForJuryEstimatedAt: READY_FOR_JURY_ESTIMATED_AT,
        activeDossierDeValidation: {
          id: "ddv-1",
          decision: "PENDING",
          dossierDeValidationSentAt: SENT_AT,
          dossierDeValidationFile: file("dossier.pdf"),
        },
      }),
    );

    await openDossierDeValidationPage(page);

    await page.getByRole("tab", { name: "Date prévisionnelle" }).click();

    await expect(page.getByText("15/08/2024")).toBeVisible();
    await expect(
      page.getByText("Attente de la date prévisionnelle"),
    ).toHaveCount(0);
  });

  test("the 'Tous les dossiers' back link points to the candidacies directory", async ({
    page,
    msw,
  }) => {
    msw.use(
      ...certificateurCommonHandlers,
      createDossierDeValidationHandler({}),
    );

    await openDossierDeValidationPage(page);

    await expect(
      page.getByRole("link", { name: "Tous les dossiers" }),
    ).toHaveAttribute("href", "/admin2/candidacies/annuaire/");
  });
});
