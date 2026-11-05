import { ReactNode } from "react";

import { CertificationAuthorityLocalAccount } from "@/graphql/generated/types";

export const CertificationAuthorityLocalAccountCard = ({
  certificationAuthorityLocalAccount,
  buttonComponent,
}: {
  certificationAuthorityLocalAccount: CertificationAuthorityLocalAccount;
  buttonComponent?: ReactNode;
}) => {
  const { firstname, lastname, email } =
    certificationAuthorityLocalAccount.account;

  let label = lastname;
  if (firstname) {
    label = label ? `${label} ${firstname}` : label;
  }

  return (
    <div className="flex flex-col justify-between p-6 border-[1px] border-[#DDD]">
      <div>
        <h6>{label}</h6>
        <p>
          <span className="fr-icon-mail-line mr-2" />
          {email}
        </p>
      </div>
      {buttonComponent}
    </div>
  );
};
