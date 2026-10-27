import { createModal } from "@codegouvfr/react-dsfr/Modal";
import Link from "next/link";

const mistakeModal = createModal({
  id: "mistake-modal",
  isOpenedByDefault: false,
});

export const ReadOnlyDvResourcesSection = () => {
  return (
    <aside className="hidden lg:block w-full bg-dsfrBlue-200 px-4 pt-4 pb-8 self-start">
      <div className="fr-text--lead font-bold">Ressources :</div>
      <div className="flex flex-col space-y-6">
        <div>
          <Link
            href="#"
            className="fr-link fr-link--sm"
            onClick={(e) => {
              e.preventDefault();
              mistakeModal.open();
            }}
          >
            Vous remarquez une erreur ?
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
      <mistakeModal.Component
        title="Que faire en cas d’erreur ?"
        size="large"
        iconId="fr-icon-information-fill"
        titleProps={{
          className: "[&_span]:mr-2",
        }}
      >
        <p>
          Vous avez fait une erreur dans le dossier de validation, la demande
          d’aménagement ou une autre information transmise ? Contactez le
          certificateur pour lui signaler l’erreur. Il pourra alors faire une
          demande de correction sur le dossier afin que vous puissiez en déposer
          un nouveau.
        </p>
        <p>
          Vous devrez de nouveau déposer le dossier, l’ensemble des pièces
          jointes nécessaires et le cas échéant, la demande d’aménagement
          spécifique du jury.
        </p>
        <p>
          Les coordonnées du certificateur sont disponibles dans la rubrique «
          Mes contacts », accessible depuis l’accueil de la candidature.
        </p>
      </mistakeModal.Component>
    </aside>
  );
};
