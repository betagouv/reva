import Button from "@codegouvfr/react-dsfr/Button";
import Input from "@codegouvfr/react-dsfr/Input";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { sanitizedTextAllowSpecialCharacters } from "@/utils/input-sanitization";

import { CertificationAuthorityLocalAccount } from "@/graphql/generated/types";

import { CertificationAuthorityLocalAccountCard } from "./CertificationAuthorityLocalAccountCard";

const schema = z.object({
  reason: sanitizedTextAllowSpecialCharacters(),
});

type CertificationAuthorityLocalAccountValidationData = z.infer<typeof schema>;

export const CertificationAuthorityLocalAccountValidation = ({
  certificationAuthorityLocalAccount,
  setCertificationAuthorityLocalAccountSelected,
  onTransferCandidacy,
}: {
  certificationAuthorityLocalAccount: CertificationAuthorityLocalAccount;
  setCertificationAuthorityLocalAccountSelected: (
    certificationAuthorityLocalAccount: CertificationAuthorityLocalAccount | null,
  ) => void;
  onTransferCandidacy(transferReason: string): void;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CertificationAuthorityLocalAccountValidationData>({
    resolver: standardSchemaResolver(schema),
    defaultValues: { reason: "" },
  });

  return (
    <>
      <div className="sm:w-1/2">
        <CertificationAuthorityLocalAccountCard
          certificationAuthorityLocalAccount={
            certificationAuthorityLocalAccount
          }
        />
      </div>
      <form onSubmit={handleSubmit((data) => onTransferCandidacy(data.reason))}>
        <Input
          label="Précisez les raisons de ce transfert :"
          textArea
          className="my-12"
          nativeTextAreaProps={register("reason")}
          state={errors.reason ? "error" : "default"}
          stateRelatedMessage={errors.reason?.message}
        />
        <p>
          L'accompagnateur en charge de la candidature sera notifié de ce
          transfert vers un nouveau service.
        </p>
        <div className="flex gap-2 justify-end">
          <Button
            priority="secondary"
            onClick={() => setCertificationAuthorityLocalAccountSelected(null)}
          >
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            Transférer
          </Button>
        </div>
      </form>
    </>
  );
};
