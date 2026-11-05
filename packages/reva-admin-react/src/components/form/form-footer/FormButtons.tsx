import { Button } from "@codegouvfr/react-dsfr/Button";
import { createModal } from "@codegouvfr/react-dsfr/Modal";
import { useRouter } from "next/navigation";

const backConfirmationModal = createModal({
  id: "back-confirmation-modal",
  isOpenedByDefault: false,
});

const BackConfirmationModal = ({ onConfirm }: { onConfirm(): void }) => {
  return (
    <backConfirmationModal.Component
      title="Voulez-vous vraiment quitter la page ?"
      buttons={[
        {
          priority: "secondary",
          children: "Rester sur la page",
          nativeButtonProps: {
            type: "button",
            "data-testid": "stay-on-page-button",
            "aria-label":
              "Rester sur la page et continuer à éditer le formulaire",
          },
        },
        {
          priority: "primary",
          onClick: onConfirm,
          children: "Quitter",
          nativeButtonProps: {
            type: "button",
            "aria-label": "Quitter la page sans enregistrer les modifications",
            "data-testid": "leave-page-button",
          },
        },
      ]}
    >
      <p>
        La page en cours contient des modifications qui n'ont pas été
        enregistrées. Si vous quittez sans enregistrer, les modifications seront
        perdues.
      </p>
    </backConfirmationModal.Component>
  );
};

export const FormButtons = ({
  backUrl,
  submitButtonLabel = "Enregistrer",
  backButtonLabel = "Retour",
  formState: { isDirty = true, isSubmitting, canSubmit = true },
  className,
  disabled,
  hideResetButton,
  readonly,
}: {
  backUrl?: string;
  backButtonLabel?: string;
  formState: {
    isDirty?: boolean;
    isSubmitting: boolean;
    canSubmit?: boolean;
  };
  submitButtonLabel?: string;
  className?: string;
  disabled?: boolean;
  hideResetButton?: boolean;
  readonly?: boolean;
}) => {
  const router = useRouter();

  const navigateBack = () => {
    if (!backUrl) return;

    if (isDirty) {
      backConfirmationModal.open();
    } else {
      router.push(backUrl);
    }
  };

  return (
    <>
      <div
        className={`flex gap-4 items-center justify-between mt-10 ${className || ""}`}
        data-testid="form-buttons"
        role="group"
        aria-label="Actions du formulaire"
      >
        {backUrl && (
          <Button
            priority="secondary"
            onClick={navigateBack}
            type="button"
            aria-label="Retour à la page précédente"
            data-testid="back-button"
          >
            {backButtonLabel}
          </Button>
        )}
        {!readonly && (
          <div className="flex gap-x-2 ml-auto">
            {!hideResetButton && (
              <Button
                type="reset"
                priority="tertiary no outline"
                disabled={!isDirty || disabled}
                aria-label="Réinitialiser le formulaire"
              >
                Réinitialiser
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSubmitting || !isDirty || !canSubmit || disabled}
              aria-label={`${submitButtonLabel} le formulaire`}
            >
              {submitButtonLabel}
            </Button>
          </div>
        )}
      </div>
      {backUrl && (
        <BackConfirmationModal onConfirm={() => router.push(backUrl)} />
      )}
    </>
  );
};
