import Input from "@codegouvfr/react-dsfr/Input";
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

export const useConfirmTypeAccompagnementSwitchToAutonomeModal = () => {
  const confirmTypeAccompagnementSwitchToAutonomeModal = useMemo(
    () =>
      createModal({
        id: "confirm-type-accompagnement-switch-to-autonome",
        isOpenedByDefault: false,
      }),
    [],
  );

  const ConfirmFinanceModuleSwitchToHorsPlateformeModal = useMemo(
    () =>
      createConfirmFinanceModuleSwitchToHorsPlateformeModal(
        confirmTypeAccompagnementSwitchToAutonomeModal,
      ),
    [confirmTypeAccompagnementSwitchToAutonomeModal],
  );

  return {
    Component: ConfirmFinanceModuleSwitchToHorsPlateformeModal,
    open: confirmTypeAccompagnementSwitchToAutonomeModal.open,
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
          <div className="flex flex-col">
            <p>
              Passer ce candidat en parcours autonome est une action définitive.
              Cela supprimera certains éléments de son espace personnel :
            </p>
            <ul className="mb-6">
              <li>Objectifs</li>
              <li>Expériences</li>
              <li>Choix de l’accompagnateur</li>
            </ul>
            <p className="mb-8">
              Si une décision a déjà été prise sur le dossier de faisabilité,
              elle restera accessible dans la section concernée, sous le même
              format.
            </p>
            <Input
              className="mb-8"
              label="Précisez la raison de cette action :"
              hintText="Seuls les administrateurs FVAE auront accès à cette information"
              nativeInputProps={{
                ...register("reason", { required: true }),
              }}
              state={errors.reason ? "error" : "default"}
              stateRelatedMessage={errors.reason ? errors.reason?.message : ""}
            />
            <p className="mb-2">Êtes vous sûr de vouloir continuer ?</p>
          </div>
        </form>
      </modal.Component>
    );
  };
  Component.displayName = "ConfirmFinanceModuleSwitchToHorsPlateformeModal";
  return Component;
};
