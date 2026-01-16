import { CandidacyUseCandidateForDashboard } from "../dashboard.hooks";
import { CertificationTile } from "../tiles/CertificationTile";
import { DossierValidationTile } from "../tiles/DossierValidationTile";
import { FeasibilityTile } from "../tiles/FeasibilityTile";
import { TypeAccompagnementTile } from "../tiles/TypeAccompagnementTile";

import { DashboardTilesSection } from "./DashboardTilesSection";

export const DashboardAutonomeTilesGroup = ({
  candidacy,
  className,
}: {
  candidacy: CandidacyUseCandidateForDashboard;
  className?: string;
}) => {
  const feasibility = candidacy?.feasibility;

  return (
    <div
      className={`flex flex-col gap-y-8 ${className || ""}`}
      data-testid="dashboard-autonome"
    >
      <DashboardTilesSection
        title="Compléter ma candidature"
        icon="fr-icon-ball-pen-line"
      >
        <div className="grid md:grid-cols-2 grid-rows-1">
          <CertificationTile
            selectedCertificationId={candidacy?.certification?.id}
          />
          <TypeAccompagnementTile />
        </div>
      </DashboardTilesSection>

      <DashboardTilesSection
        title="Suivre mon parcours"
        icon="fr-icon-award-line"
      >
        <div className="grid grid-flow-row md:grid-flow-col md:grid-cols-2 grid-rows-1">
          <FeasibilityTile
            feasibility={feasibility}
            candidacyIsAutonome={true}
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
