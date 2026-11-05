import { ReactNode } from "react";

import { CertificationAuthority } from "@/graphql/generated/types";

export const CertificationAuthorityCard = ({
  certificationAuthority,
  buttonComponent,
}: {
  certificationAuthority: CertificationAuthority;
  buttonComponent?: ReactNode;
}) => (
  <div className="flex flex-col justify-between p-6 border-[1px] border-[#DDD]">
    <div>
      <h6>{certificationAuthority.label}</h6>
      <p>
        <span className="fr-icon-mail-line mr-2" />
        {certificationAuthority.contactEmail}
      </p>
    </div>
    {buttonComponent}
  </div>
);
