import { Button } from "@codegouvfr/react-dsfr/Button";
import Image from "next/image";

import { AapSelectionAdvice } from "@/components/aap-selection-advice/AapSelectionAdvice";
import { hasPermission } from "@/components/auth/actions";

import applicationPolygon from "./assets/application-polygon.svg";

export default async function AucuneCohortePage() {
  const canCreateCohorte = await hasPermission({
    permission: "CREER_COHORTE",
  });

  const createCohorteButtonProps = canCreateCohorte
    ? {
        linkProps: {
          href: "./nouvelle-cohorte",
        },
      }
    : { disabled: true };
  return (
    <div className="flex flex-col-reverse items-center md:flex-row md:justify-between gap-[50px]">
      <div>
        <h1>Bienvenue dans votre espace France VAE</h1>
        <p className="text-xl leading-loose">
          Retrouvez ici toutes les cohortes que vous avez créées.
        </p>
        <p className="text-xl leading-loose">
          Commencez en créant votre première cohorte.
        </p>

        <AapSelectionAdvice />
        <Button className="mt-4" {...createCohorteButtonProps}>
          Créer une cohorte
        </Button>
      </div>
      <Image src={applicationPolygon} alt="icône application" />
    </div>
  );
}
