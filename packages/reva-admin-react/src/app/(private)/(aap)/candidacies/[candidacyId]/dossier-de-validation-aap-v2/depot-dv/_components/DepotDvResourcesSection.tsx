import { createModal } from "@codegouvfr/react-dsfr/Modal";
import Link from "next/link";

interface ResourcesSectionProps {
  certification: {
    id: string;
    label: string;
  } | null;
}

const amenagementSpecifiqueModal = createModal({
  id: "aap-dv-v2-amenagement-specifique-modal",
  isOpenedByDefault: false,
});

export const DepotDvResourcesSection = ({
  certification,
}: ResourcesSectionProps) => {
  if (!certification) {
    return null;
  }

  return (
    <aside className="hidden lg:block w-full bg-dsfrBlue-200 px-4 pt-4 pb-8 self-start bg-dsfr-light-decisions-background-background-alt-blue-france">
      <div className="fr-text--lead font-bold">Ressources :</div>
      <div className="flex flex-col space-y-6">
        <div>
          <Link
            href="#"
            className="fr-link fr-link--sm"
            onClick={(e) => {
              e.preventDefault();
              amenagementSpecifiqueModal.open();
            }}
          >
            Qui peut bénéficier d’un aménagement spécifique de jury ?
          </Link>
        </div>
        <div>
          <Link
            href={`/certification-details/${certification.id}`}
            className="fr-link fr-link--sm"
            target="_blank"
          >
            Fiche de la certification
          </Link>
        </div>
        <hr className="mb-0 pb-1" />
        <div>
          <Link
            href="https://scribehow.com/o/BKyFuGicTyWaF4_KfL-uQA/viewer/Parcours_du_candidat_accompagne__vp9k4YzATvmheao9kAoKjw"
            className="fr-link fr-link--sm"
            target="_blank"
          >
            Consultez le guide pas à pas
          </Link>
        </div>
      </div>
      <amenagementSpecifiqueModal.Component
        title="Qui peut bénéficier d’un aménagement spécifique de jury ?"
        size="large"
      >
        <p>
          Les candidats dont les raisons médicales nécessitent un aménagement
          spécifique pour leur passage devant le jury peuvent en faire la
          demande ici, en joignant les pièces justificatives. La demande sera
          étudiée par le certificateur, qui décidera si l’aménagement peut être
          accordé.
        </p>
      </amenagementSpecifiqueModal.Component>
    </aside>
  );
};
