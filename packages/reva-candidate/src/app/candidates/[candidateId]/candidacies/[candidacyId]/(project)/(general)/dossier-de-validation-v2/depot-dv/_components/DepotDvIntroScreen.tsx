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
              Quels documents doivent être préparer pour déposer le dossier ?
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
                Pour faire votre demande, préparez également les éléments
                suivants :
              </p>
              <ul>
                <li>
                  La description de l’aménagement souhaité, à renseigner sur la
                  plateforme
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
                Vous ne pourrez pas enregistrer la démarche en cours de saisie.
                Préparez tous les documents avant de commencer. Toute demande
                d’aménagement doit être déposée en même temps que le dossier de
                validation.
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
