import Accordion from "@codegouvfr/react-dsfr/Accordion";
import { Button } from "@codegouvfr/react-dsfr/Button";
import Checkbox from "@codegouvfr/react-dsfr/Checkbox";
import { createModal } from "@codegouvfr/react-dsfr/Modal";
import { Tag } from "@codegouvfr/react-dsfr/Tag";
import { ToggleSwitch } from "@codegouvfr/react-dsfr/ToggleSwitch";
import { useState } from "react";

import { OrganismDistanceFilter } from "./OrganismDistanceFilter";

const tagFilledStyle = (isSelected: boolean) =>
  isSelected
    ? "bg-dsfrBlue-500 text-white"
    : "bg-dsfrBlue-300 text-dsfrBlue-500";

const modalDistanceInfo = createModal({
  id: "distance-organism-info",
  isOpenedByDefault: false,
});

const modalMcfInfo = createModal({
  id: "mcf-organism-info",
  isOpenedByDefault: false,
});

interface filters {
  organismSearchText: string;
  organismSearchRemote: boolean;
  organismSearchOnsite: boolean;
  organismSearchZip: string;
  organismSearchPmr: boolean;
  organismSearchMcf: boolean;
  organismSearchIsAvailable: boolean;
}

export const OrganismFilters = ({
  onSearch,
  filters,
}: {
  onSearch: (filters: filters) => void;
  filters: filters;
}) => {
  const {
    organismSearchRemote,
    organismSearchOnsite,
    organismSearchIsAvailable,
  } = filters;

  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="mt-8 lg:mt-0 w-full flex flex-col">
      <h2>Filtres :</h2>
      <ToggleSwitch
        labelPosition="left"
        label="Accompagnateurs disponibles uniquement"
        checked={organismSearchIsAvailable}
        onChange={(checked) =>
          onSearch({
            ...filters,
            organismSearchIsAvailable: checked,
          })
        }
        className="mb-2"
      />
      <hr className="py-1 my-2" />
      <div className="mb-6">
        <Accordion
          label={
            <span>
              Modalités
              <br />
              d’accompagnement
            </span>
          }
          defaultExpanded={isExpanded}
          className={
            isExpanded ? "[&_.fr-collapse--expanded]:overflow-visible" : ""
          }
          // expanded={isExpanded}
          onExpandedChange={(expanded) => {
            if (expanded) {
              setTimeout(() => {
                setIsExpanded(true);
              }, 300);
            } else {
              setIsExpanded(false);
            }
          }}
        >
          <div>
            <Button
              data-testid="button-open-modal-distance"
              priority="tertiary no outline"
              title="Quelle option à distance choisir ?"
              iconId="fr-icon-information-fill"
              onClick={() => modalDistanceInfo.open()}
            >
              <span className="text-dsfrBlue-500 text-sm font-bold">
                Quelle option choisir ?
              </span>
            </Button>
            <Button
              data-testid="button-select-onsite"
              aria-pressed={organismSearchOnsite}
              priority="tertiary no outline"
              title="Choisir sur site"
              onClick={() => {
                onSearch({
                  ...filters,
                  organismSearchOnsite: !organismSearchOnsite,
                  organismSearchRemote: false,
                  organismSearchZip: "",
                });
              }}
              className="px-2"
            >
              <Tag
                iconId="fr-icon-building-fill"
                className={tagFilledStyle(organismSearchOnsite)}
              >
                Sur site
              </Tag>
            </Button>
            <Button
              data-testid="button-select-remote"
              aria-pressed={organismSearchRemote}
              priority="tertiary no outline"
              title="Choisir à distance"
              onClick={() => {
                onSearch({
                  ...filters,
                  organismSearchOnsite: false,
                  organismSearchRemote: !organismSearchRemote,
                  organismSearchZip: "",
                });
              }}
              className="px-2"
            >
              <Tag
                iconId="fr-icon-customer-service-fill"
                className={tagFilledStyle(organismSearchRemote)}
              >
                À distance
              </Tag>
            </Button>

            <modalDistanceInfo.Component
              title="Comment bien choisir entre “sur site” et “à distance” ?"
              size="large"
            >
              <p className="my-4">
                Les accompagnements <strong>sur site </strong>
                sont réalisés directement dans les locaux de l’organisme
                sélectionné.
              </p>
              <p>
                Les accompagnements <strong>à distance</strong> se déroulent
                essentiellement par téléphone ou sur internet, via des outils de
                visio-conférence.
              </p>
            </modalDistanceInfo.Component>
            <OrganismDistanceFilter
              disabled={!organismSearchOnsite}
              onChangeSearchZip={(zip) => {
                onSearch({
                  ...filters,
                  organismSearchZip: zip,
                });
              }}
              onChangeSearchPmr={(pmr) => {
                onSearch({
                  ...filters,
                  organismSearchPmr: pmr,
                });
              }}
              filters={filters}
            />
          </div>
        </Accordion>
        <Accordion label="Référencement MCF" defaultExpanded>
          <div>
            <Button
              data-testid="button-open-modal-mcf"
              priority="tertiary no outline"
              title="Quelle option à distance choisir ?"
              iconId="fr-icon-information-fill"
              onClick={() => modalMcfInfo.open()}
              className="mb-2"
            >
              <span className="text-dsfrBlue-500 text-sm font-bold">
                Qu’est ce que MCF ?
              </span>
            </Button>
            <modalMcfInfo.Component
              title="Qu’est ce que MCF ?"
              size="medium"
              iconId="fr-icon-information-fill"
              className="[&_h1>span]:mr-2" // add space bewteen icon and title
            >
              <p className="my-4">
                Mon Compte Formation (MCF) est un service public français
                permettant de financer des formations professionnelles.
              </p>
            </modalMcfInfo.Component>
            <Checkbox
              small
              options={[
                {
                  label:
                    "Afficher les accompagnateurs référencés sur Mon Compte Formation (MCF)",
                  nativeInputProps: {
                    ...{ "data-testid": "checkbox-wrapper-mcf-input" },
                    checked: filters.organismSearchMcf,
                    onChange: (e) => {
                      onSearch({
                        ...filters,
                        organismSearchMcf: e.target.checked,
                      });
                    },
                  },
                },
              ]}
            />
          </div>
        </Accordion>
      </div>

      <div className="flex justify-center">
        <Button
          data-testid="sidebar-button-reset-filters"
          priority="tertiary no outline"
          disabled={
            !filters.organismSearchText &&
            !filters.organismSearchRemote &&
            !filters.organismSearchOnsite &&
            !filters.organismSearchPmr &&
            !filters.organismSearchZip &&
            !filters.organismSearchMcf &&
            !filters.organismSearchIsAvailable
          }
          onClick={() => {
            onSearch({
              organismSearchRemote: false,
              organismSearchOnsite: false,
              organismSearchPmr: false,
              organismSearchZip: "",
              organismSearchText: "",
              organismSearchMcf: false,
              organismSearchIsAvailable: false,
            });
          }}
        >
          Réinitialiser les filtres
        </Button>
      </div>
    </div>
  );
};
