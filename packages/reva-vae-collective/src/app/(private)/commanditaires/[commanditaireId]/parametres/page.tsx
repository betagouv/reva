import { hasPermission } from "@/components/auth/actions";
import { RoleDependentBreadcrumb } from "@/components/role-dependent-breadcrumb/RoleDependentBreadcrumb";

import { getConnectedUserAccount } from "./actions";

export default async function ParametersPage() {
  const account = await getConnectedUserAccount();

  if (!account) {
    throw new Error("Compte non trouvé");
  }

  const canCreateCohorte = await hasPermission({
    permission: "CREER_COHORTE",
  });

  return (
    <div className="flex flex-col w-full">
      <RoleDependentBreadcrumb
        className="mt-0 mb-4"
        currentPageLabel="Paramètres"
        segments={[]}
      />
      <h1 className="mb-12">Paramètres</h1>

      <dl className="flex flex-col gap-2 m-0">
        <InfoLine label="Nom" value={account.lastname} />
        {account.firstname && (
          <InfoLine label="Prénom" value={account.firstname} />
        )}
        <InfoLine label="Email de connexion" value={account.email} />
        <InfoLine
          label="Création de cohorte"
          value={canCreateCohorte ? "Activé" : "Désactivé"}
          lastLine
        />
      </dl>
    </div>
  );
}

const InfoLine = ({
  label,
  value = "",
  lastLine = false,
}: {
  label: string;
  value?: string | null;
  lastLine?: boolean;
}) => (
  <div>
    <hr className="pb-3 -ml-4 -mr-4" />
    <div className="flex justify-between">
      <dt>{label}</dt>
      <dd className="m0 font-medium">{value}</dd>
    </div>
    {lastLine && <hr className="mt-2 -ml-4 -mr-4" />}
  </div>
);
