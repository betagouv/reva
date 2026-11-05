import { Button } from "@codegouvfr/react-dsfr/Button";

import { Impersonate } from "@/components/impersonate/Impersonate.component";

import { Account } from "@/graphql/generated/types";

export const GestionnaireMaisonMereAAPSettingsSectionAccountList = ({
  maisonMereAAPId,
  gestionnaireAccountId,
  isAdmin,
  comptesCollaborateurs,
}: {
  maisonMereAAPId: string;
  gestionnaireAccountId: string;
  isAdmin?: boolean;
  comptesCollaborateurs: Pick<
    Account,
    "id" | "email" | "firstname" | "lastname" | "disabledAt"
  >[];
}) => {
  return (
    <ul className="ml-6 mb-8">
      {comptesCollaborateurs
        .filter((account) => account.id !== gestionnaireAccountId)
        .filter((account) => isAdmin || !account.disabledAt)
        .map((account) => (
          <li
            data-testid={account.id}
            key={account.id}
            className="flex justify-between items-center py-3 border-neutral-300 border-t last:border-b"
          >
            <div className="flex items-center gap-x-6">
              <div>
                <span className="font-bold">
                  {account.firstname} {account.lastname}
                </span>
                {" - "}
                {account.email}
              </div>
            </div>
            <div className="flex justify-between items-center">
              {!account.disabledAt && isAdmin && (
                <Impersonate accountId={account.id} size="small" />
              )}

              <Button
                linkProps={{
                  href: `/agencies-settings-v3/${maisonMereAAPId}/user-accounts/${account.id}`,
                }}
                priority="tertiary no outline"
                size="small"
              >
                {!account.disabledAt ? "Modifier" : "Visualiser"}
              </Button>
            </div>
          </li>
        ))}
    </ul>
  );
};
