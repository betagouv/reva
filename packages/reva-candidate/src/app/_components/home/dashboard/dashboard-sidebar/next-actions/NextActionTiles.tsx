import { createModal } from "@codegouvfr/react-dsfr/Modal";
import Tile from "@codegouvfr/react-dsfr/Tile";
import { useRouter } from "next/navigation";

import { candidateCanSubmitCandidacyToAap } from "@/utils/candidateCanSubmitCandidacyToAap.util";
import { formatIso8601Date } from "@/utils/formatIso8601Date";

import { CandidacyUseCandidateForDashboard } from "../../dashboard.hooks";
import TileGroup from "../../tiles/TileGroup";

import { NoActionTile } from "./NoContactTile";

interface NextActionTile {
  title: string;
  description?: string;
  link?: string;
  action?: () => void;
}

const ROUTES = {
  DOSSIER_DE_VALIDATION: "./dossier-de-validation",
  EXPERIENCES: "./experiences",
  FEASIBILITY: "./feasibility",
  SET_GOALS: "./set-goals",
  SET_FORMATIONS: "./set-formations",
  SET_ORGANISM: "./set-organism",
  SUBMIT_CANDIDACY: "./submit-candidacy",
  VALIDATE_FEASIBILITY: "./validate-feasibility",
  VALIDATE_TRAINING: "./validate-training",
} as const;

const sendSwornStatementModal = createModal({
  id: "send-sworn-statement",
  isOpenedByDefault: false,
});

const SendSwornStatementModal = () => {
  return (
    <sendSwornStatementModal.Component
      title="Envoi de l'attestation sur l'honneur"
      iconId="fr-icon-send-plane-fill"
    >
      <p>
        Vous avez validé votre dossier de faisabilité sans avoir envoyé votre
        attestation sur l'honneur ?
      </p>
      <p>
        Afin de permettre à votre accompagnateur d'envoyer votre dossier au
        certificateur, vous devez lui faire parvenir votre attestation par
        courriel, par courrier ou en main propre afin qu'il puisse l'envoyer à
        votre place.
      </p>
      <p>Si vous rencontrez des problèmes, n'hésitez pas à le contacter.</p>
    </sendSwornStatementModal.Component>
  );
};

const getNextActionTiles = ({
  candidacy,
  openSendSwornStatementModal,
}: {
  candidacy: CandidacyUseCandidateForDashboard;
  openSendSwornStatementModal: () => void;
}): NextActionTile[] => {
  if (!candidacy) return [];

  const isAutonome = candidacy.typeAccompagnement === "AUTONOME";
  const isAccompagne = candidacy.typeAccompagnement === "ACCOMPAGNE";
  const candidacyStatus = candidacy.status;
  const isProjectStatus = candidacyStatus === "PROJET";
  const isParcoursEnvoyeStatus = candidacyStatus === "PARCOURS_ENVOYE";

  const goalsCount = candidacy.goals?.length || 0;
  const hasCompletedFormations =
    !!candidacy.candidate.highestDegree &&
    !!candidacy.candidate.niveauDeFormationLePlusEleve;
  const experiencesCount = candidacy.experiences?.length || 0;
  const hasOrganism = !!candidacy.organism?.id;
  const hasSelectedCertification = !!candidacy.certification?.id;
  const candidacyAlreadySubmitted = !!candidacy.sentAt;

  const feasibilityDecision = candidacy.feasibility?.decision;
  const dossierValidation = candidacy.activeDossierDeValidation;
  const dossierValidationDecision = dossierValidation?.decision;

  const feasibility = candidacy.feasibility;
  const dematerializedFeasibilityFile =
    feasibility?.dematerializedFeasibilityFile;

  const canSubmitCandidacy = candidateCanSubmitCandidacyToAap({
    hasSelectedCertification,
    hasCompletedGoals: goalsCount > 0,
    hasSelectedOrganism: hasOrganism,
    hasCompletedExperience: experiencesCount > 0,
    candidacyAlreadySubmitted,
  });
  const canValidateFeasibility =
    !!dematerializedFeasibilityFile?.sentToCandidateAt &&
    !dematerializedFeasibilityFile?.candidateConfirmationAt;
  const needsSwornAttestationStatement =
    feasibility?.feasibilityFormat === "DEMATERIALIZED" &&
    isAccompagne &&
    !dematerializedFeasibilityFile?.swornStatementFileId &&
    !!dematerializedFeasibilityFile?.candidateConfirmationAt;

  const failedJuryResults = [
    "PARTIAL_SUCCESS_OF_FULL_CERTIFICATION",
    "PARTIAL_SUCCESS_OF_PARTIAL_CERTIFICATION",
    "PARTIAL_SUCCESS_PENDING_CONFIRMATION",
    "FAILURE",
    "CANDIDATE_EXCUSED",
    "CANDIDATE_ABSENT",
  ];

  const canSubmitAgainAfterJury = failedJuryResults.includes(
    candidacy.jury?.result || "",
  );

  let feasibilityUrlAutonome: string = ROUTES.FEASIBILITY;

  if (candidacy?.feasibilityFormat === "DEMATERIALIZED") {
    feasibilityUrlAutonome =
      candidacy.feasibilityFileDematAutonomeResourceHidden
        ? "./feasibility-demat-autonome"
        : "./feasibility-demat-autonome-resources";
  }

  const rules: { condition: boolean; tile: NextActionTile }[] = [
    // DF DEMATERIALIZED : Compléter mes objectifs
    {
      condition:
        candidacy?.feasibilityFormat === "DEMATERIALIZED" && goalsCount === 0,
      tile: { title: "Compléter mes objectifs", link: ROUTES.SET_GOALS },
    },
    // DF DEMATERIALIZED : Compléter mes formations
    {
      condition:
        isAutonome &&
        candidacy?.feasibilityFormat === "DEMATERIALIZED" &&
        !hasCompletedFormations,
      tile: { title: "Compléter mes formations", link: ROUTES.SET_FORMATIONS },
    },
    // DF DEMATERIALIZED : Compléter mes expériences
    {
      condition:
        candidacy?.feasibilityFormat === "DEMATERIALIZED" &&
        experiencesCount === 0,
      tile: { title: "Compléter mes expériences", link: ROUTES.EXPERIENCES },
    },
    // ACCOMPAGNE : Choisir mon accompagnateur
    {
      condition:
        isProjectStatus &&
        isAccompagne &&
        !hasOrganism &&
        hasSelectedCertification,
      tile: { title: "Choisir mon accompagnateur", link: ROUTES.SET_ORGANISM },
    },

    // ACCOMPAGNE : Envoyer ma candidature
    {
      condition: canSubmitCandidacy,
      tile: { title: "Envoyer ma candidature", link: ROUTES.SUBMIT_CANDIDACY },
    },

    // ACCOMPAGNE : Valider mon parcours et financement
    {
      condition: isParcoursEnvoyeStatus,
      tile: {
        title: "Valider mon parcours et financement",
        link: ROUTES.VALIDATE_TRAINING,
      },
    },

    // ACCOMPAGNE : Valider mon dossier de faisabilité
    {
      condition: canValidateFeasibility,
      tile: {
        title: "Valider mon dossier de faisabilité",
        link: ROUTES.VALIDATE_FEASIBILITY,
      },
    },

    // ACCOMPAGNE : Envoyer votre attestation
    {
      condition: needsSwornAttestationStatement,
      tile: {
        title: "Envoyer votre attestation",
        action: openSendSwornStatementModal,
      },
    },

    // AUTONOME Envoyer mon dossier de faisabilité
    {
      condition:
        isAutonome &&
        (!feasibility?.feasibilityFileSentAt ||
          feasibility?.decision === "INCOMPLETE"),
      tile: {
        title: "Envoyer mon dossier de faisabilité",
        link: feasibilityUrlAutonome,
      },
    },

    //! AUTONOME ET ACCOMPAGNE
    // ACCOMPAGNE et AUTONOME : Renseigner une date prévisionnelle de dépot de dossier de validation
    {
      condition:
        feasibilityDecision === "ADMISSIBLE" &&
        !candidacy.readyForJuryEstimatedAt &&
        (canSubmitAgainAfterJury || !dossierValidationDecision),
      tile: {
        title:
          "Renseigner une date prévisionnelle de dépot de dossier de validation",
        link: ROUTES.DOSSIER_DE_VALIDATION,
      },
    },

    // ACCOMPAGNE et AUTONOME : Envoyer mon dossier de validation
    {
      condition:
        feasibilityDecision === "ADMISSIBLE" &&
        (!dossierValidationDecision ||
          dossierValidationDecision === "INCOMPLETE" ||
          canSubmitAgainAfterJury),
      tile: {
        title: "Envoyer mon dossier de validation",
        description: candidacy.readyForJuryEstimatedAt
          ? `Date prévisionnelle de dépot le : ${formatIso8601Date(candidacy.readyForJuryEstimatedAt)}`
          : undefined,
        link: ROUTES.DOSSIER_DE_VALIDATION,
      },
    },
  ];

  return rules.filter((r) => r.condition).map((r) => r.tile);
};
export const NextActionTiles = ({
  candidacy,
}: {
  candidacy: CandidacyUseCandidateForDashboard;
}) => {
  const nextActionTiles: NextActionTile[] = getNextActionTiles({
    candidacy,
    openSendSwornStatementModal: sendSwornStatementModal.open,
  });

  const hasNextActionTiles = nextActionTiles.length > 0;
  const router = useRouter();

  return (
    <TileGroup icon="fr-icon-notification-3-line" title="Prochaines étapes">
      {hasNextActionTiles ? (
        nextActionTiles.map((tile) => (
          <Tile
            key={tile.title}
            title={tile.title}
            desc={tile.description}
            small
            orientation="horizontal"
            classes={{
              content: "pb-0",
            }}
            buttonProps={{
              onClick: tile.action || (() => router.push(tile.link || "")),
            }}
          />
        ))
      ) : (
        <NoActionTile />
      )}
      <SendSwornStatementModal />
    </TileGroup>
  );
};
