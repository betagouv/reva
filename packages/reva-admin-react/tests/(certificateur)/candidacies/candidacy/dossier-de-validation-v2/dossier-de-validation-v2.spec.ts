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
  amenagementSpecifique?: {
    id: string;
    justificationDescription: string;
    justificationFile: {
      name: string;
      url: string;
      previewUrl?: string | null;
    } | null;
  } | null;
};

const AMENAGEMENT_TITLE =
  "Demande d’aménagement pour le passage devant le jury :";
const AMENAGEMENT_DESCRIPTION = "Besoin d'un temps de passage majoré.";
const JUSTIFICATIF_TEST_ID = "feasibility-files-preview-Justificatif";

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
  jury?: { id: string; result?: string | null } | null;
  historyDossierDeValidation?: DossierDeValidationFixture[];
}) {
  return fvae.query(
    "getCandidacyWithDossierDeValidationV2",
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
    waitGraphQL(page, "getCandidacyWithDossierDeValidationV2"),
  ]);
}

test.describe("Dossier de validation v2 page", () => {
  const { certificateurCommonHandlers } = getCertificateurCommonHandlers({
    candidacyId: CANDIDACY_ID,
    candidateFirstname: "Camille",
    candidateLastname: "Durand",
  });

  test("shows the 'en attente' call-out when readyForJuryEstimatedAt is not set", async ({
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
    await expect(
      page.getByRole("link", { name: "Demande de correction" }),
    ).toHaveCount(0);
  });

  test("shows the estimated date and the 'en attente' call-out when readyForJuryEstimatedAt is set and no dossier de validation exists yet", async ({
    page,
    msw,
  }) => {
    msw.use(
      ...certificateurCommonHandlers,
      createDossierDeValidationHandler({
        readyForJuryEstimatedAt: READY_FOR_JURY_ESTIMATED_AT,
      }),
    );

    await openDossierDeValidationPage(page);

    await expect(
      page.getByText("Date prévisionnelle de dépôt du dossier de validation :"),
    ).toBeVisible();
    await expect(page.getByText("15/08/2024")).toBeVisible();
    await expect(
      page.getByText("Dossier de validation en attente"),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Une fois le dossier transmis par le candidat, vous devrez lui communiquer une date de passage devant le jury.",
        { exact: false },
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Demande de correction" }),
    ).toHaveCount(0);
  });

  test("shows the dossier card even when readyForJuryEstimatedAt is empty", async ({
    page,
    msw,
  }) => {
    msw.use(
      ...certificateurCommonHandlers,
      createDossierDeValidationHandler({
        readyForJuryEstimatedAt: null,
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

    await expect(page.getByText("Dossier déposé le :")).toBeVisible();
    await expect(page.getByText("29/05/2024")).toBeVisible();
    await expect(
      page.getByText("Dossier de validation en attente"),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Demande de correction" }),
    ).toHaveAttribute("href", CORRECTION_PAGE_HREF);
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

    await expect(page.getByText("Dossier déposé le :")).toBeVisible();
    await expect(page.getByText("29/05/2024")).toBeVisible();

    await expect(
      page.getByRole("link", { name: "Demande de correction" }),
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
      page.getByRole("link", { name: "Demande de correction" }),
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
    // "Dossier déposé le" shows the deposit date, "Dossier signalé le" shows
    // the decision date — they must not collapse onto the same value.
    await expect(page.getByText("29/05/2024")).toHaveCount(1);
    await expect(page.getByText("05/06/2024")).toHaveCount(1);
    // decision isn't PENDING, so no correction link should show.
    await expect(
      page.getByRole("link", { name: "Demande de correction" }),
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
      name: "Voir les anciens dossiers de validation",
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
      page.getByText("Voir les anciens dossiers de validation"),
    ).toHaveCount(0);
  });

  test("does not show the ready-for-jury estimated date once a dossier de validation exists", async ({
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

    await expect(page.getByText("15/08/2024")).toHaveCount(0);
  });

  test.describe("amenagement specifique block", () => {
    const dossierWithAmenagement = ({
      decision = "PENDING",
      justificationDescription = AMENAGEMENT_DESCRIPTION,
      justificationFile = file("justificatif.pdf"),
    }: {
      decision?: DossierDeValidationDecision;
      justificationDescription?: string;
      justificationFile?: ReturnType<typeof file> | null;
    } = {}): DossierDeValidationFixture => ({
      id: "ddv-1",
      decision,
      dossierDeValidationSentAt: SENT_AT,
      dossierDeValidationFile: file("dossier.pdf"),
      amenagementSpecifique: {
        id: "amenagement-1",
        justificationDescription,
        justificationFile,
      },
    });

    test("is hidden when the dossier has no amenagement", async ({
      page,
      msw,
    }) => {
      msw.use(
        ...certificateurCommonHandlers,
        createDossierDeValidationHandler({
          activeDossierDeValidation: {
            ...dossierWithAmenagement(),
            amenagementSpecifique: null,
          },
        }),
      );

      await openDossierDeValidationPage(page);

      await expect(page.getByText("Dossier déposé le :")).toBeVisible();
      await expect(page.getByText(AMENAGEMENT_TITLE)).toHaveCount(0);
    });

    test("shows the description and the justificatif for a pending dossier", async ({
      page,
      msw,
    }) => {
      msw.use(
        ...certificateurCommonHandlers,
        createDossierDeValidationHandler({
          activeDossierDeValidation: dossierWithAmenagement(),
        }),
      );

      await openDossierDeValidationPage(page);

      await expect(page.getByText(AMENAGEMENT_TITLE)).toBeVisible();
      await expect(page.getByText(AMENAGEMENT_DESCRIPTION)).toBeVisible();
      await expect(page.getByTestId(JUSTIFICATIF_TEST_ID)).toBeVisible();
    });

    test("is placed before the correction tile", async ({ page, msw }) => {
      msw.use(
        ...certificateurCommonHandlers,
        createDossierDeValidationHandler({
          activeDossierDeValidation: dossierWithAmenagement(),
        }),
      );

      await openDossierDeValidationPage(page);

      const blockBox = await page
        .getByTestId("amenagement-specifique-block")
        .boundingBox();
      const tileBox = await page
        .getByRole("link", { name: "Demande de correction" })
        .boundingBox();

      expect(blockBox!.y).toBeLessThan(tileBox!.y);
    });

    test("shows the description and the justificatif when the decision is INCOMPLETE", async ({
      page,
      msw,
    }) => {
      msw.use(
        ...certificateurCommonHandlers,
        createDossierDeValidationHandler({
          activeDossierDeValidation: {
            ...dossierWithAmenagement({ decision: "INCOMPLETE" }),
            decisionSentAt: DECISION_SENT_AT,
            decisionComment: "Pièce manquante",
          },
        }),
      );

      await openDossierDeValidationPage(page);

      await expect(page.getByText(AMENAGEMENT_DESCRIPTION)).toBeVisible();
      await expect(page.getByTestId(JUSTIFICATIF_TEST_ID)).toBeVisible();
    });

    test("shows the description without a justificatif when there is no file", async ({
      page,
      msw,
    }) => {
      msw.use(
        ...certificateurCommonHandlers,
        createDossierDeValidationHandler({
          activeDossierDeValidation: dossierWithAmenagement({
            justificationFile: null,
          }),
        }),
      );

      await openDossierDeValidationPage(page);

      await expect(page.getByText(AMENAGEMENT_DESCRIPTION)).toBeVisible();
      await expect(page.getByTestId(JUSTIFICATIF_TEST_ID)).toHaveCount(0);
    });

    test("shows the description without a justificatif when the file has no previewUrl", async ({
      page,
      msw,
    }) => {
      msw.use(
        ...certificateurCommonHandlers,
        createDossierDeValidationHandler({
          activeDossierDeValidation: dossierWithAmenagement({
            justificationFile: file("justificatif.pdf", null),
          }),
        }),
      );

      await openDossierDeValidationPage(page);

      await expect(page.getByText(AMENAGEMENT_DESCRIPTION)).toBeVisible();
      await expect(page.getByTestId(JUSTIFICATIF_TEST_ID)).toHaveCount(0);
    });

    test("is entirely hidden, including the justificatif, when a jury result exists", async ({
      page,
      msw,
    }) => {
      msw.use(
        ...certificateurCommonHandlers,
        createDossierDeValidationHandler({
          activeDossierDeValidation: dossierWithAmenagement(),
          jury: { id: "jury-1", result: "FULL_SUCCESS_OF_FULL_CERTIFICATION" },
        }),
      );

      await openDossierDeValidationPage(page);

      await expect(page.getByText("Dossier déposé le :")).toBeVisible();
      await expect(page.getByText(AMENAGEMENT_TITLE)).toHaveCount(0);
      await expect(page.getByText(AMENAGEMENT_DESCRIPTION)).toHaveCount(0);
      await expect(page.getByTestId(JUSTIFICATIF_TEST_ID)).toHaveCount(0);
    });

    test("is still shown when a jury exists without a result", async ({
      page,
      msw,
    }) => {
      msw.use(
        ...certificateurCommonHandlers,
        createDossierDeValidationHandler({
          activeDossierDeValidation: dossierWithAmenagement(),
          jury: { id: "jury-1", result: null },
        }),
      );

      await openDossierDeValidationPage(page);

      await expect(page.getByText(AMENAGEMENT_DESCRIPTION)).toBeVisible();
      await expect(page.getByTestId(JUSTIFICATIF_TEST_ID)).toBeVisible();
    });

    test("expands and collapses a long description", async ({ page, msw }) => {
      msw.use(
        ...certificateurCommonHandlers,
        createDossierDeValidationHandler({
          activeDossierDeValidation: dossierWithAmenagement({
            justificationDescription: "Besoin d'un aménagement. ".repeat(100),
          }),
        }),
      );

      await openDossierDeValidationPage(page);

      await page.getByRole("button", { name: "En voir plus" }).click();

      const collapseButton = page.getByRole("button", {
        name: "En voir moins",
      });
      await expect(collapseButton).toHaveAttribute("aria-expanded", "true");

      await collapseButton.click();

      await expect(
        page.getByRole("button", { name: "En voir plus" }),
      ).toHaveAttribute("aria-expanded", "false");
    });

    test("does not show the toggle for a short description", async ({
      page,
      msw,
    }) => {
      msw.use(
        ...certificateurCommonHandlers,
        createDossierDeValidationHandler({
          activeDossierDeValidation: dossierWithAmenagement(),
        }),
      );

      await openDossierDeValidationPage(page);

      await expect(page.getByText(AMENAGEMENT_DESCRIPTION)).toBeVisible();
      await expect(
        page.getByRole("button", { name: "En voir plus" }),
      ).toHaveCount(0);
    });
  });

  test("the 'Retour' back link points to the candidacies directory", async ({
    page,
    msw,
  }) => {
    msw.use(
      ...certificateurCommonHandlers,
      createDossierDeValidationHandler({}),
    );

    await openDossierDeValidationPage(page);

    await expect(page.getByRole("link", { name: "Retour" })).toHaveAttribute(
      "href",
      "/admin2/candidacies/annuaire/",
    );
  });
});
