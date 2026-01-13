import Button from "@codegouvfr/react-dsfr/Button";
import { ComponentProps, ReactNode } from "react";

import { GrayCard } from "@/components/card/gray-card/GrayCard";

type HasButton =
  | {
      hasButton: true;
      buttonTitle: string;
      buttonOnClick: () => void;
      buttonPriority: ComponentProps<typeof Button>["priority"];
      buttonIconId?: ComponentProps<typeof Button>["iconId"];
    }
  | {
      hasButton?: false;
      buttonTitle?: never;
      buttonOnClick?: never;
      buttonPriority?: never;
      buttonIconId?: never;
    };

interface CandidacySectionCardProps {
  children?: ReactNode;
  title: string;
  titleIconClass?: string;
  badge?: ReactNode;
  disabled?: boolean;
  "data-testid"?: string;
}

export const SectionCard = ({
  children,
  title,
  titleIconClass,
  hasButton,
  buttonOnClick,
  buttonTitle,
  buttonPriority,
  buttonIconId,
  badge,
  disabled = false,
  "data-testid": dataTest,
}: CandidacySectionCardProps & HasButton) => {
  return (
    <GrayCard data-testid={dataTest}>
      <div className="flex justify-between items-center w-full">
        <div className="flex items-center gap-4 w-full">
          <h2
            className={`mb-0 sm:whitespace-nowrap ${disabled ? "text-neutral-400" : ""}`}
          >
            {titleIconClass && (
              <span className={`fr-icon fr-icon--lg ${titleIconClass} mr-2`} />
            )}
            {title}
          </h2>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 sm:w-full">
            <div>{!disabled && badge}</div>
            {hasButton && (
              <Button
                data-testid="action-button"
                onClick={buttonOnClick}
                priority={buttonPriority}
                disabled={disabled}
                iconId={
                  buttonIconId as Exclude<
                    ComponentProps<typeof Button>["iconId"],
                    undefined
                  >
                }
              >
                {buttonTitle}
              </Button>
            )}
          </div>
        </div>
      </div>
      {children && <div className="flex flex-col mt-5">{children}</div>}
    </GrayCard>
  );
};
