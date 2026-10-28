import Accordion from "@codegouvfr/react-dsfr/Accordion";
import { Button } from "@codegouvfr/react-dsfr/Button";

const label = "Complément d’expérience lié au parcours visé (optionnel)";

export const ComplementExperienceParcoursViseAccordion = ({
  complementExperienceParcoursVise,
  disabled,
  isEditable,
}: {
  complementExperienceParcoursVise?: string | null;
  disabled?: boolean;
  isEditable?: boolean;
}) => (
  <div
    className="flex flex-row justify-between items-start pb-0 gap-6 w-full"
    data-testid="complement-experience-parcours-vise-accordion"
  >
    {complementExperienceParcoursVise ? (
      <Accordion className="w-full" label={label}>
        <p>
          <span className="font-bold">
            Informations complémentaires ne pouvant pas figurer dans les autres
            blocs liés à la mention du diplôme :
          </span>
        </p>
        <p>
          <span>{complementExperienceParcoursVise}</span>
        </p>
      </Accordion>
    ) : (
      <div
        className={`px-4 py-3 font-medium border-b-[1px] border-neutral-200 flex-1`}
      >
        {label}
      </div>
    )}
    {!disabled && isEditable && (
      <Button
        className="w-[100px] flex-none mt-1 border-t-[1px]"
        priority={"secondary"}
        size="small"
        linkProps={{
          href: `./complement-experience-parcours-vise`,
        }}
        data-testid="complement-experience-parcours-vise-button"
      >
        <span className="mx-auto">
          {complementExperienceParcoursVise ? "Modifier" : "Compléter"}
        </span>
      </Button>
    )}
  </div>
);
