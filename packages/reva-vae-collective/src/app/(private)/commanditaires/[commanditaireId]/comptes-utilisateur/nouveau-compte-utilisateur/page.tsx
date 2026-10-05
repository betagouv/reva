"use client";

import { Button } from "@codegouvfr/react-dsfr/Button";
import { Input } from "@codegouvfr/react-dsfr/Input";
import { ToggleSwitch } from "@codegouvfr/react-dsfr/ToggleSwitch";
import { useParams } from "next/navigation";
import { useActionState } from "react";

import { FormOptionalFieldsDisclaimer } from "@/components/form-optional-fields-disclaimer/FormOptionalFieldsDisclaimer";
import { RoleDependentBreadcrumb } from "@/components/role-dependent-breadcrumb/RoleDependentBreadcrumb";

import { createSousCompteVaeCollective } from "./actions";

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
        <ToggleSwitch
          className="mt-8"
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
    </div>
  );
}
