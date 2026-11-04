"use client";

import { Button } from "@codegouvfr/react-dsfr/Button";
import Checkbox from "@codegouvfr/react-dsfr/Checkbox";
import { createModal } from "@codegouvfr/react-dsfr/Modal";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useKeycloakContext } from "@/components/auth/keycloakContext";
import { graphqlErrorToast, successToast } from "@/components/toast/toast";

import { useCguCertificateur } from "../cgu-certificateur.hook";

import { IgnoreCguCertificateurModalContent } from "./IgnoreCguCertificateurModalContent";

const zodSchema = z.object({
  charterAcceptance: z.literal<boolean>(true),
  cguAcceptance: z.literal<boolean>(true),
});

type CguCertificateurFormSchema = z.infer<typeof zodSchema>;

const modalIgnoreCgu = createModal({
  id: "modal-ignore-cgu-certificateur",
  isOpenedByDefault: false,
});

export function CguCertificateurForm() {
  const {
    register,
    handleSubmit,
    formState: { isValid },
  } = useForm<CguCertificateurFormSchema>({
    resolver: standardSchemaResolver(zodSchema),
  });

  const { acceptCertificateurCgu } = useCguCertificateur();
  const { logout } = useKeycloakContext();

  const submitCgu = async () => {
    try {
      await acceptCertificateurCgu();
      successToast("CGU acceptées avec succès");
    } catch (e) {
      graphqlErrorToast(e);
    }
  };

  return (
    <>
      <form
        onSubmit={handleSubmit(submitCgu)}
        data-testid="cgu-certificateur-form"
      >
        <fieldset>
          <hr className="mt-6 mb-8" />
          <Checkbox
            id="cgu-certificateur-charter-acceptance"
            className="mb-3"
            options={[
              {
                label:
                  "Je reconnais avoir lu et pris connaissance de la charte certificateur.",
                nativeInputProps: {
                  ...{
                    "data-testid": "cgu-certificateur-charter-acceptance-input",
                  },
                  ...register("charterAcceptance"),
                },
              },
            ]}
          />
          <Checkbox
            data-testid="cgu-certificateur-cgu-acceptance"
            options={[
              {
                label:
                  "J'accepte les nouvelles conditions générales d'utilisation.",
                nativeInputProps: {
                  ...{
                    "data-testid": "cgu-certificateur-cgu-acceptance-input",
                  },
                  ...register("cguAcceptance"),
                },
              },
            ]}
          />
        </fieldset>
        <div className="flex gap-x-2 justify-end">
          <Button
            type="button"
            priority="tertiary no outline"
            onClick={modalIgnoreCgu.open}
            data-testid="cgu-certificateur-ignore"
          >
            Ignorer les CGU
          </Button>
          <Button
            type="submit"
            disabled={!isValid}
            data-testid="cgu-certificateur-submit"
          >
            Valider les CGU
          </Button>
        </div>
      </form>
      <modalIgnoreCgu.Component
        size="large"
        iconId="fr-icon-arrow-right-line"
        title=" Que se passe-t-il si vous ignorez les nouvelles CGU ?"
        buttons={[
          {
            children: "Ignorer les CGU",
            nativeButtonProps: {
              onClick: () => logout(),
              "data-testid": "cgu-certificateur-ignore-modal-ignore-button",
            },
          },

          {
            children: "Relire les CGU",
            nativeButtonProps: {
              "data-testid": "cgu-certificateur-ignore-modal-relire-button",
            },
          },
        ]}
      >
        <IgnoreCguCertificateurModalContent />
      </modalIgnoreCgu.Component>
    </>
  );
}
