"use client";
import { Button } from "@codegouvfr/react-dsfr/Button";
import { useEffect, useState } from "react";

export const RegistrationCodeDisplay = ({
  registrationCode,
}: {
  registrationCode: string;
}) => {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (isCopied) {
      setTimeout(() => {
        setIsCopied(false);
      }, 1000);
    }
  }, [isCopied]);

  return (
    <div
      className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-0"
      data-testid="registration-code-display"
    >
      <div className="flex px-4 items-center font-bold w-[218px] h-full border min-h-[40px]">
        {registrationCode}
      </div>
      <Button
        className="h-full min-w-[168px]"
        iconId="fr-icon-qr-code-line"
        onClick={() => {
          navigator.clipboard.writeText(registrationCode);
          setIsCopied(true);
        }}
        priority="tertiary"
      >
        {isCopied ? (
          <>
            Copié
            <span className="ml-auto fr-icon-check-line fr-icon--sm" />
          </>
        ) : (
          <>Copier le code</>
        )}
      </Button>
    </div>
  );
};
