import { Input } from "@codegouvfr/react-dsfr/Input";
import { createModal } from "@codegouvfr/react-dsfr/Modal";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { sanitizedTextAllowSpecialCharacters } from "@/utils/input-sanitization";

const schema = z.object({
  reason: sanitizedTextAllowSpecialCharacters(),
});

type Form = z.infer<typeof schema>;

export const useConfirmFinanceModuleSwitchToHorsPlateformeModal = () => {
  const confirmFinanceModuleSwitchToHorsPlateformeModal = useMemo(
    () =>
      createModal({
        id: "confirm-finance-module-switch-to-hors-plateforme",
        isOpenedByDefault: false,
      }),
    [],
  );

  const ConfirmFinanceModuleSwitchToHorsPlateformeModal = useMemo(
    () =>
      createConfirmFinanceModuleSwitchToHorsPlateformeModal(
        confirmFinanceModuleSwitchToHorsPlateformeModal,
      ),
    [confirmFinanceModuleSwitchToHorsPlateformeModal],
  );

  return {
    Component: ConfirmFinanceModuleSwitchToHorsPlateformeModal,
    open: confirmFinanceModuleSwitchToHorsPlateformeModal.open,
  };
};

const createConfirmFinanceModuleSwitchToHorsPlateformeModal = (
  modal: ReturnType<typeof createModal>,
) => {
  const Component = ({
    onConfirmButtonClick,
  }: {
    onConfirmButtonClick: (data: { reason: string }) => void;
  }) => {
    const {
      register,
      handleSubmit,
      reset,
      formState: { errors },
    } = useForm<Form>({ resolver: standardSchemaResolver(schema) });

    const handleConfirmButtonClick = handleSubmit((data) => {
      onConfirmButtonClick(data);
      modal.close();
    });

    const handleCancelButtonClick = () => {
      reset({ reason: "" });
      modal.close();
    };

    return (
      <modal.Component
        title={
          <div className="flex gap-2">
            <span className="fr-icon-warning-fill" />
            Cette action est irréversible
          </div>
        }
        size="large"
        buttons={[
          {
            priority: "secondary",
            children: "Annuler",
            doClosesModal: false,
            onClick: handleCancelButtonClick,
          },
          {
            priority: "primary",
            children: "Confirmer",
            doClosesModal: false,
            onClick: handleConfirmButtonClick,
            type: "submit",
          },
        ]}
      >
        <form>
          <div className="flex flex-col gap-4">
            <p>
              Vous êtes sur le point de passer ce candidat en parcours hors
              financement. Cette action est définitive et ne pourra pas être
              annulée.
            </p>
            <Input
              label="Précisez la raison de cette action :"
              hintText="Seuls les administrateurs FVAE auront accès à cette information"
              nativeInputProps={{
                ...register("reason", { required: true }),
              }}
              state={errors.reason ? "error" : "default"}
              stateRelatedMessage={errors.reason ? errors.reason?.message : ""}
            />
            <p className="mb-0">Êtes vous sûr de vouloir continuer ?</p>
          </div>
        </form>
      </modal.Component>
    );
  };
  Component.displayName = "ConfirmFinanceModuleSwitchToHorsPlateformeModal";
  return Component;
};
