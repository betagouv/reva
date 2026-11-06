import { createModal } from "@codegouvfr/react-dsfr/Modal";
import Tile from "@codegouvfr/react-dsfr/Tile";
import { useRouter } from "next/navigation";

import { DashboardSidebar } from "../dashboard-sidebar/DashboardSidebar";
import { CandidacyUseCandidateForDashboard } from "../dashboard.hooks";
import { DashboardAccompagneTilesGroup } from "../persona-tiles-group/DashboardAccompagneTilesGroup";
import { DashboardAutonomeTilesGroup } from "../persona-tiles-group/DashboardAutonomeTilesGroup";

const modalDistanceInfo = createModal({
  id: "abandon-candidature-info",
  isOpenedByDefault: false,
});

export const NonVaeCollectiveDashboard = ({
  candidacy,
  candidacyAlreadySubmitted,
  canSubmitCandidacy,
  hasSelectedOrganism,
  hasCompletedGoals,
  candidacyIsAutonome,
  candidacyIsAccompagne,
  isCandidateDropOutV2Enabled,
  handleCandidacyDropOut,
  hasFeasibilitySent,
}: {
  candidacy: CandidacyUseCandidateForDashboard;
  candidacyAlreadySubmitted: boolean;
  canSubmitCandidacy: boolean;
  hasSelectedOrganism: boolean;
  hasCompletedGoals: boolean;
  candidacyIsAutonome: boolean;
  candidacyIsAccompagne: boolean;
  isCandidateDropOutV2Enabled: boolean;
  handleCandidacyDropOut: () => void;
  hasFeasibilitySent: boolean;
}) => {
  const router = useRouter();

  return (
    <div className="flex flex-col-reverse lg:flex-row gap-8 mt-20">
      <div className="basis-2/3 flex flex-col gap-8">
        {candidacyIsAutonome && (
          <DashboardAutonomeTilesGroup
            candidacy={candidacy}
            hasCompletedGoals={hasCompletedGoals}
          />
        )}
        {candidacyIsAccompagne && (
          <DashboardAccompagneTilesGroup
            candidacy={candidacy}
            candidacyAlreadySubmitted={candidacyAlreadySubmitted}
            canSubmitCandidacy={canSubmitCandidacy}
            hasSelectedOrganism={hasSelectedOrganism}
            hasCompletedGoals={hasCompletedGoals}
          />
        )}

        {isCandidateDropOutV2Enabled ? (
          <>
            {candidacy.status === "PROJET" && (
              <Tile
                title="Suppression de la candidature"
                desc={
                  <div className="text-dsfr-light-text-mention-grey">
                    Informations, conséquences et confirmation d’abandon.
                  </div>
                }
                small
                className="md:h-24"
                orientation="horizontal"
                buttonProps={{
                  onClick: () => {
                    router.push(`./archive`);
                  },
                }}
              />
            )}

            {candidacy.status !== "PROJET" && !candidacy.candidacyDropOut && (
              <Tile
                title="Abandon de la candidature"
                desc={
                  <div className="text-dsfr-light-text-mention-grey">
                    Informations, conséquences et confirmation d’abandon.
                  </div>
                }
                small
                className="md:h-24"
                orientation="horizontal"
                buttonProps={{
                  onClick: () => {
                    router.push(`./dropout`);
                  },
                }}
              />
            )}
          </>
        ) : (
          <>
            {!hasFeasibilitySent && (
              <Tile
                title="Abandonner cette candidature"
                desc={
                  <div className="text-dsfr-light-text-mention-grey">
                    Voir les conséquences et valider la décision.
                  </div>
                }
                small
                className="md:h-24"
                orientation="horizontal"
                buttonProps={{
                  onClick: modalDistanceInfo.open,
                }}
              />
            )}
          </>
        )}
      </div>
      <DashboardSidebar candidacy={candidacy} className="basis-1/3" />

      <modalDistanceInfo.Component
        iconId="fr-icon-warning-fill"
        title={<span className="ml-2">Abandonner cette candidature ?</span>}
        buttons={[
          {
            priority: "secondary",
            children: "Annuler",
            nativeButtonProps: {
              "aria-label": "Annuler la suppression",
            },
          },
          {
            priority: "primary",
            onClick: handleCandidacyDropOut,
            children: "Confirmer",
            disabled: false,
            nativeButtonProps: {
              "aria-label": "Confirmer la suppression de la candidature",
            },
          },
        ]}
      >
        <p>
          Vous êtes sur le point d’abandonner votre candidature sur la
          certification{" "}
          <strong>RNCP {candidacy.certification?.codeRncp}</strong>:{" "}
          <strong>{candidacy.certification?.label}</strong>.
        </p>

        <p>Conséquences d’un abandon à ce stade :</p>

        <ul className="m-0 mb-6 font-bold">
          <li>vous perdrez les éléments renseignés dans cette candidature</li>
          <li>
            vous pourrez créer une nouvelle candidature sur la même
            certification
          </li>
          <li>
            si un financement a été validé, tournez-vous vers votre
            accompagnateur. La gestion du financement se fait hors plateforme
            France VAE.
          </li>
        </ul>

        <p>Confirmez vous l’abandon de cette candidature ? </p>
      </modalDistanceInfo.Component>
    </div>
  );
};
