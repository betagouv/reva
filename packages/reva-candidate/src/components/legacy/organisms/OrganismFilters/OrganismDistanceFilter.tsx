import { Checkbox } from "@codegouvfr/react-dsfr/Checkbox";

import { AutocompleteAddress } from "@/components/autocomplete-address/AutocompleteAddress";

interface filters {
  organismSearchZip: string;
  organismSearchPmr: boolean;
}

interface OrganismDistanceFilterProps {
  onChangeSearchZip: (zip: string) => void;
  onChangeSearchPmr: (pmr: boolean) => void;
  filters: filters;
  disabled: boolean;
}

export const OrganismDistanceFilter = ({
  onChangeSearchZip,
  onChangeSearchPmr,
  filters,
  disabled,
}: OrganismDistanceFilterProps) => {
  const handleChangePmr = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeSearchPmr(e.target.checked);
  };

  return (
    <div className="flex flex-col gap-6 mt-6">
      <fieldset>
        <AutocompleteAddress
          label="Où souhaitez-vous réaliser votre accompagnement ?"
          disabled={disabled}
          onOptionSelection={(selectedOption) => {
            onChangeSearchZip(selectedOption?.zip ?? "");
          }}
          onClearSelection={() => {
            onChangeSearchZip("");
          }}
          className="w-full mb-0"
          displayMode="birthPlace"
          nativeInputProps={{
            placeholder: "Indiquez un code postal",
          }}
        />
        <Checkbox
          className="mt-8"
          options={[
            {
              label:
                "Afficher uniquement les sites pouvant recevoir des personnes à mobilité réduite (PMR)",
              nativeInputProps: {
                ...{ "data-testid": "checkbox-wrapper-pmr-input" },
                disabled,
                onChange: handleChangePmr,
                checked: filters.organismSearchPmr,
              },
            },
          ]}
        />
      </fieldset>
    </div>
  );
};
