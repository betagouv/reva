"use client";

import Alert from "@codegouvfr/react-dsfr/Alert";
import { Button } from "@codegouvfr/react-dsfr/Button";
import Checkbox from "@codegouvfr/react-dsfr/Checkbox";
import { Input } from "@codegouvfr/react-dsfr/Input";
import { createModal } from "@codegouvfr/react-dsfr/Modal";
import { ToggleSwitch } from "@codegouvfr/react-dsfr/ToggleSwitch";
import { useParams } from "next/navigation";
import { useActionState } from "react";

import { FormOptionalFieldsDisclaimer } from "@/components/form-optional-fields-disclaimer/FormOptionalFieldsDisclaimer";
import { RoleDependentBreadcrumb } from "@/components/role-dependent-breadcrumb/RoleDependentBreadcrumb";

import { createSousCompteVaeCollective } from "./actions";

const emailAddressTipsModal = createModal({
  isOpenedByDefault: false,
  id: "emailAddressTipsModal",
});

export default function NouveauCompteUtilisateurPage() {
  const [state, action, pending] = useActionState(
    createSousCompteVaeCollective,
    {},
  );

  const { commanditaireId } = useParams<{ commanditaireId: string }>();
  return (
    <div className="flex flex-col w-full">
      <RoleDependentBreadcrumb
        segments={[
          {
            label: "Gestion des comptes",
            linkProps: {
              href: `/commanditaires/${commanditaireId}/comptes-utilisateur/`,
            },
          },
        ]}
        currentPageLabel="Création d’un compte collaborateur"
      />
      <h1>Création d’un compte collaborateur</h1>
      <FormOptionalFieldsDisclaimer />
      <p className="text-xl">
        Le collaborateur ajouté recevra un courriel pour finaliser son compte et
        accéder à son espace.
      </p>
      <h2 className="mt-8">Informations de connexion</h2>
      <form action={action} className="flex flex-col">
        <div className="flex flex-col md:flex-row md:gap-6">
          <Input
            className="flex-grow basis-1/4"
            data-testid="account-lastname-input"
            label="Nom"
            nativeInputProps={{
              name: "accountLastname",
            }}
            state={state.errors?.accountLastname ? "error" : "default"}
            stateRelatedMessage={state.errors?.accountLastname?.message}
          />
          <Input
            className="flex-grow basis-1/4"
            data-testid="account-firstname-input"
            label="Prénom (Optionnel)"
            nativeInputProps={{
              name: "accountFirstname",
            }}
            state={state.errors?.accountFirstname ? "error" : "default"}
            stateRelatedMessage={state.errors?.accountFirstname?.message}
          />
          <Input
            className="flex-grow basis-1/2"
            data-testid="account-email-input"
            label="Adresse électronique de connexion"
            nativeInputProps={{
              name: "accountEmail",
              type: "email",
            }}
            state={state.errors?.accountEmail ? "error" : "default"}
            stateRelatedMessage={state.errors?.accountEmail?.message}
          />
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:gap-12">
          <Checkbox
            className="flex-grow basis-1/2"
            small
            id="isAAPAccount"
            options={[
              {
                hintText:
                  "Vérifiez l’adresse électronique de connexion avec l’AAP afin qu’elle soit différente de celle utilisée pour son compte AAP.",
                label:
                  "Compte destiné à un Architecte Accompagnateur de Parcours",
                nativeInputProps: {
                  defaultChecked: false,
                  name: "isAAPAccount",
                },
              },
            ]}
          />
          <Alert
            className="flex-grow basis-1/2"
            severity="info"
            small
            description={
              <>
                <p>
                  <b>Attention</b> : Vous ne pouvez pas renseigner une adresse
                  électronique déjà utilisée sur France VAE.
                </p>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    emailAddressTipsModal.open();
                  }}
                  className="fr-link [&:not(:hover)]:bg-none"
                >
                  Astuce : utiliser un alias d'adresse électronique
                </a>
              </>
            }
          />
        </div>
        <hr className="mt-6" />
        <ToggleSwitch
          className="mt-0"
          labelPosition="left"
          label="Activer la création de cohorte par ce collaborateur"
          inputTitle="Activer la création de cohorte par ce collaborateur"
          name="canCreateCohorteVaeCollective"
          defaultChecked={false}
        />
        <input type="hidden" name="commanditaireId" value={commanditaireId} />
        <hr className="mt-4" />
        <div className="flex justify-between mt-6">
          <Button
            priority="secondary"
            linkProps={{
              href: `/commanditaires/${commanditaireId}/comptes-utilisateur/`,
            }}
          >
            Annuler
          </Button>
          <Button disabled={pending}>Ajouter</Button>
        </div>
      </form>
      <emailAddressTipsModal.Component
        title="Astuce : utiliser un alias d'adresse électronique"
        size="large"
      >
        <p>
          Afin de ne pas créer de nouvelle adresse électronique, vous pouvez
          créer un alias.
        </p>
        <p className="font-bold">Qu'est-ce qu'un alias ?</p>
        <p>
          Un alias d'adresse électronique est une adresse secondaire qui
          redirige tous les messages vers votre boîte de réception principale
          sans nécessiter la création d'un nouveau compte.
        </p>
        <p>
          Vous pourrez ainsi l’utiliser pour créer un nouveau compte sur France
          VAE tout en recevant les courriels sur votre adresse principale.
        </p>
        <p className="font-bold">Comment ça fonctionne ?</p>
        <p>
          Sur des messageries comme Gmail, il suffit d'ajouter un signe + suivi
          d'un mot-clé (un tag) juste avant le symbole @ de votre adresse
          électronique.
        </p>
        <ul>
          <li>Votre adresse réelle : mon.nom@gmail.com</li>
          <li>
            Exemples d’alias : mon.nom+partenaire@gmail.com ou
            mon.nom+vaecollective@gmail.com
          </li>
        </ul>
        <p>
          Tous les messages envoyés à ces adresses avec « + » arrivent
          directement dans votre boîte principale.
        </p>
        <p>
          Cette méthode fonctionne sur les versions des messageries les plus
          courantes.
        </p>
      </emailAddressTipsModal.Component>
    </div>
  );
}
