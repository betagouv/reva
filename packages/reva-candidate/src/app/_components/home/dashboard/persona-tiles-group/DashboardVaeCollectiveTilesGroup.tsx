import Badge from "@codegouvfr/react-dsfr/Badge";

import { CandidacyUseCandidateForDashboard } from "../dashboard.hooks";
import { CertificationTile } from "../tiles/CertificationTile";
import { DossierValidationTile } from "../tiles/DossierValidationTile";
import { ExperiencesTile } from "../tiles/ExperiencesTile";
import { FeasibilityTile } from "../tiles/FeasibilityTile";
import { GoalsTile } from "../tiles/GoalsTile";
import { OrganismTile } from "../tiles/OrganismTile";
import { SubmitCandidacyTile } from "../tiles/SubmitCandidacyTile";
import { TrainingTile } from "../tiles/TrainingTile";
import { TypeAccompagnementTile } from "../tiles/TypeAccompagnementTile";

import { DashboardTilesSection } from "./DashboardTilesSection";

export const DashboardVaeCollectiveTilesGroup = ({
  candidacy,
  candidacyAlreadySubmitted,
  canSubmitCandidacy,
  hasSelectedOrganism,
  hasCompletedGoals,
  className,
}: {
  candidacy: CandidacyUseCandidateForDashboard;
  candidacyAlreadySubmitted: boolean;
  canSubmitCandidacy: boolean;
  hasSelectedOrganism: boolean;
  hasCompletedGoals: boolean;
  className?: string;
}) => {
  const feasibility = candidacy?.feasibility;
  const endAccompagnementConfirmed =
    candidacy.endAccompagnementStatus === "CONFIRMED_BY_CANDIDATE" ||
    candidacy.endAccompagnementStatus === "CONFIRMED_BY_ADMIN";

  return (
    <div className={`flex flex-col gap-y-8 ${className || ""}`}>
      <DashboardTilesSection
        title="Compléter ma candidature"
        icon="fr-icon-ball-pen-line"
      >
        <div className="grid md:grid-cols-3 grid-rows-2">
          <CertificationTile
            selectedCertificationId={candidacy?.certification?.id}
          />
          <TypeAccompagnementTile disabled />
          <GoalsTile
            hasCompletedGoals={hasCompletedGoals}
            readOnly={candidacyAlreadySubmitted}
          />
          <ExperiencesTile
            experiences={candidacy.experiences}
            readOnly={candidacyAlreadySubmitted}
          />
          <OrganismTile
            hasSelectedCertification={!!candidacy.certification?.id}
            hasSelectedOrganism={hasSelectedOrganism}
            candidacyStatus={candidacy.status}
            endAccompagnementConfirmed={endAccompagnementConfirmed}
          />
          <SubmitCandidacyTile
            candidacyAlreadySubmitted={candidacyAlreadySubmitted}
            canSubmitCandidacy={canSubmitCandidacy}
          />
        </div>
      </DashboardTilesSection>

      <DashboardTilesSection
        title="Suivre mon parcours"
        icon="fr-icon-award-line"
        badge={
          !candidacyAlreadySubmitted ? (
            <Badge severity="warning">Candidature non envoyée</Badge>
          ) : undefined
        }
      >
        <div className="grid grid-flow-row md:grid-flow-col grid-rows-1">
          <TrainingTile
            candidacyStatus={candidacy.status}
            firstAppointmentOccuredAt={candidacy.firstAppointmentOccuredAt}
          />
          <FeasibilityTile
            feasibility={feasibility}
            candidacyIsAutonome={false}
          />
          <DossierValidationTile
            feasibility={candidacy.feasibility}
            activeDossierDeValidation={candidacy.activeDossierDeValidation}
            jury={candidacy.jury}
          />
        </div>
      </DashboardTilesSection>
    </div>
  );
};
