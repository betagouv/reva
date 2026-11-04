import Input from "@codegouvfr/react-dsfr/Input";
import { createModal } from "@codegouvfr/react-dsfr/Modal";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import z from "zod";

import { sanitizedOptionalTextAllowSpecialCharacters } from "@/utils/input-sanitization";

const schema = z.object({
  reason: sanitizedOptionalTextAllowSpecialCharacters(),
});

type Form = z.infer<typeof schema>;

export const useRevokeFeasibilityDecisionModal = () => {
  const revokeFeasibilityDecisionModal = useMemo(
    () =>
      createModal({
        id: "revoke-feasibility-decision",
        isOpenedByDefault: false,
      }),
    [],
  );

  const RevokeFeasibilityDecisionModal = useMemo(
    () => createRevokeFeasibilityDecisionModal(revokeFeasibilityDecisionModal),
    [revokeFeasibilityDecisionModal],
  );

  return {
    Component: RevokeFeasibilityDecisionModal,
    open: revokeFeasibilityDecisionModal.open,
    close: revokeFeasibilityDecisionModal.close,
  };
};

const createRevokeFeasibilityDecisionModal = (
  modal: ReturnType<typeof createModal>,
) => {
  const Component = ({
    onConfirmButtonClick,
  }: {
    onConfirmButtonClick: (data: Form) => Promise<void>;
  }) => {
    const {
      register,
      handleSubmit,
      reset,
      formState: { isSubmitting, errors },
    } = useForm<Form>({ resolver: standardSchemaResolver(schema) });

    const handleConfirmButtonClick = handleSubmit(async (data) => {
      await onConfirmButtonClick(data);
      modal.close();
      reset();
    });

    return (
      <modal.Component
        title={
          <div className="flex gap-2">
            <span
              className="fr-icon-warning-fill fr-icon--lg"
              aria-hidden="true"
            />
            Annuler une décision prise par un certificateur.
          </div>
        }
        size="large"
        buttons={[
          {
            priority: "secondary",
            children: "Retour",
            disabled: isSubmitting,
          },
          {
            priority: "primary",
            children: "Confirmer",
            doClosesModal: false,
            onClick: handleConfirmButtonClick,
            type: "submit",
            disabled: isSubmitting,
          },
        ]}
      >
        <form>
          <div className="flex flex-col">
            <p className="mb-6">
              Vous êtes sur le point d’annuler une décision prise par un
              certificateur. Cette action l'obligera à prononcer sa décision de
              nouveau. Vous ne pourrez pas prendre de décision définitive à sa
              place.
            </p>
            <Input
              className="mb-4"
              label="Commentaire : (Optionnel)"
              textArea
              nativeTextAreaProps={{
                rows: 3,
                ...register("reason"),
              }}
              state={errors.reason ? "error" : "default"}
              stateRelatedMessage={errors.reason?.message}
            />
            <p className="mb-2">
              Voulez vous confirmer l'annulation de cette décision ?
            </p>
          </div>
        </form>
      </modal.Component>
    );
  };
  Component.displayName = "RevokeFeasibilityDecisionModal";
  return Component;
};
