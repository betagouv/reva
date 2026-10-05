import { Button } from "@codegouvfr/react-dsfr/Button";
import Image from "next/image";

import { hasPermission } from "@/components/auth/actions";

import ecosystemPolygon from "./assets/ecosystem-polygon.svg";

export default async function AucunCompteUtilisateurPage() {
  const canCreateSousCompte = await hasPermission({
    permission: "CREER_SOUS_COMPTE",
  });

  const createSousCompteButtonProps = canCreateSousCompte
    ? {
        linkProps: {
          href: "./nouveau-compte-utilisateur",
        },
      }
    : { disabled: true };
  return (
    <div className="flex flex-col-reverse items-center md:flex-row md:justify-between gap-[50px]">
      <div>
        <h1>Gestion des comptes</h1>
        <p className="text-xl leading-loose">
          Vous souhaitez partager des droits avec vos collaborateurs ou des
          partenaires ? Créez leur un compte et partagez les informations
          nécessaires.
        </p>

        <Button
          priority="secondary"
          className="mt-4"
          {...createSousCompteButtonProps}
        >
          Ajouter un collaborateur
        </Button>
      </div>
      <Image src={ecosystemPolygon} alt="icône d'un groupe de personnes" />
    </div>
  );
}
