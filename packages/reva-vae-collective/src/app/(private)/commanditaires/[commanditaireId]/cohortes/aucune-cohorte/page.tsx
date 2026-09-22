import { Button } from "@codegouvfr/react-dsfr/Button";
import Image from "next/image";

import { AapSelectionAdvice } from "@/components/aap-selection-advice/AapSelectionAdvice";
import { hasPermission } from "@/components/auth/actions";

import applicationPolygon from "./assets/application-polygon.svg";

export default async function AucuneCohortePage() {
  const canCreateCohorte = await hasPermission({
    permission: "CREER_COHORTE",
  });

  return (
    <div className="flex flex-col-reverse items-center md:flex-row md:justify-between gap-[50px]">
      <div>
        <h1>Bienvenue dans votre espace France VAE</h1>
        {canCreateCohorte ? (
          <CanCreateCohorteBlock />
        ) : (
          <CannotCreateCohorteBlock />
        )}
      </div>
      <Image src={applicationPolygon} alt="icône application" />
    </div>
  );
}

const CanCreateCohorteBlock = () => (
  <>
    <p className="text-xl leading-loose">
      Retrouvez ici toutes les cohortes que vous avez créées.
    </p>
    <p className="text-xl leading-loose">
      Commencez en créant votre première cohorte.
    </p>
    <AapSelectionAdvice />
    <Button className="mt-4" linkProps={{ href: "./nouvelle-cohorte" }}>
      Créer une cohorte
    </Button>
  </>
);

const CannotCreateCohorteBlock = () => (
  <>
    <p className="text-xl leading-loose">
      Retrouvez ici toutes les cohortes qui vous concernent.
    </p>
    <p className="text-sm">
      Vous n’avez pas la possibilité de créer de cohortes. Cette option est
      actionnable par votre administrateur à la création de votre compte.
    </p>
  </>
);
