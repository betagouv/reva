import { Button } from "@codegouvfr/react-dsfr/Button";
import Checkbox from "@codegouvfr/react-dsfr/Checkbox";
import { useState } from "react";

import { DepotDvResourcesSection } from "./DepotDvResourcesSection";

export const DepotDvIntroScreen = ({
  certification,
  onClickStart,
}: {
  certification: {
    id: string;
    label: string;
  } | null;
  onClickStart: (needsAmenagement: boolean) => void;
}) => {
  const [needsAmenagement, setNeedsAmenagement] = useState(false);
  return (
    <div className="flex flex-col">
      <div className="flex flex-row gap-4">
        <div className="flex-1 flex-col grow basis-9/12">
          <div className="flex flex-col gap-6">
            <p className="font-bold mb-0">
              Quels documents doivent être préparer pour faire mon dépot ?
            </p>
            <ul>
              <li>Le dossier de validation complété et relu</li>
              <li>Les pièces supplémentaires requises (le cas échéant)</li>
            </ul>
            <div className="border border-gray-200 p-4 flex flex-col gap-4">
              <Checkbox
                small
                options={[
                  {
                    label:
                      "Intégrer une demande d’aménagement spécifique de jury",
                    nativeInputProps: {
                      value: "needs-amenagement",
                      checked: needsAmenagement,
                      onChange: (e) => setNeedsAmenagement(e.target.checked),
                    },
                  },
                ]}
              />
              <p className="font-bold mb-0">
                Pour faire votre demande, préparez également les documents
                suivants :
              </p>
              <ul>
                <li>
                  La description de l’aménagement spécifique pour le passage
                  devant le jury
                </li>
                <li>Le justificatif médical au format numérique</li>
              </ul>
            </div>
            <div>
              <p>
                <i
                  className="fr-icon-warning-fill fr-icon--sm mr-1"
                  aria-hidden="true"
                />
                Cette demande ne peux pas être enregistrée en cours d’édition
                mais vous pouvez l’annuler tant que vous n’avez pas finalisé la
                démarche. Faites votre demande dès maintenant : vous ne pourrez
                plus la faire une fois votre dossier de validation envoyé.
              </p>
            </div>
          </div>
        </div>
        <div className="basis-3/12">
          <DepotDvResourcesSection certification={certification} />
        </div>
      </div>
      <div className="flex flex-row justify-between">
        <Button
          priority="secondary"
          linkProps={{
            href: "../",
          }}
        >
          Retour
        </Button>
        <Button onClick={() => onClickStart(needsAmenagement)}>
          Commencer
        </Button>
      </div>
    </div>
  );
};
