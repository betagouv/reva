"use client";

import Input from "@codegouvfr/react-dsfr/Input";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useAuth } from "@/components/auth/auth";
import { FormButtons } from "@/components/form/form-footer/FormButtons";
import { FormOptionalFieldsDisclaimer } from "@/components/form-optional-fields-disclaimer/FormOptionalFieldsDisclaimer";
import { graphqlErrorToast, successToast } from "@/components/toast/toast";
import { sanitizedEmail, sanitizedPhone } from "@/utils/input-sanitization";

import { useCandidateContactDetailsPageLogic } from "./candidateContactDetails.hook";

const schema = z.object({
  phone: sanitizedPhone(),
  email: sanitizedEmail(),
});

type FormData = z.infer<typeof schema>;

const CandidateContactDetailsPage = () => {
  const { candidacyId } = useParams<{
    candidacyId: string;
  }>();

  const { isAdmin } = useAuth();

  const router = useRouter();

  const { candidate, updateCandidateContactDetails } =
    useCandidateContactDetailsPageLogic({ candidacyId });

  if (!candidate) {
    return null;
  }

  const handleFormSubmit = async (data: FormData) => {
    try {
      await updateCandidateContactDetails.mutateAsync({
        candidacyId,
        candidateId: candidate.id,
        candidateContactDetails: data,
      });
      successToast("Modifications enregistrées");
      router.push(`/candidacies/${candidacyId}/summary`);
    } catch (error) {
      graphqlErrorToast(error);
    }
  };

  return candidate ? (
    <CandidateContactDetailsForm
      candidacyId={candidacyId}
      defaultValues={{ phone: candidate.phone, email: candidate.email }}
      emailInputDisabled={!isAdmin}
      onSubmit={handleFormSubmit}
    />
  ) : null;
};

const CandidateContactDetailsForm = ({
  candidacyId,
  defaultValues,
  emailInputDisabled,
  onSubmit,
}: {
  candidacyId: string;
  defaultValues: { phone: string; email: string };
  emailInputDisabled?: boolean;
  onSubmit: (data: FormData) => void;
}) => {
  const {
    register,
    reset,
    formState: { isDirty, isSubmitting, errors },
    handleSubmit,
  } = useForm<FormData>({
    resolver: standardSchemaResolver(schema),
    defaultValues,
  });

  const handleFormSubmit = handleSubmit(onSubmit);

  return (
    <div className="flex flex-col">
      <h1>Coordonnées du candidat</h1>
      <FormOptionalFieldsDisclaimer />
      <h2 className="mt-8 mb-4">Informations de contact</h2>
      <form
        onSubmit={handleFormSubmit}
        onReset={(e) => {
          e.preventDefault();
          reset();
        }}
        className="flex flex-col"
      >
        <div className="flex flex-col md:flex-row gap-6">
          <Input
            className="flex-1"
            data-testid="phone-input"
            label="Numéro de téléphone"
            nativeInputProps={{ ...register("phone") }}
            state={errors.phone ? "error" : "default"}
            stateRelatedMessage={errors.phone?.message}
          />
          <Input
            className="flex-1"
            data-testid="email-input"
            disabled={!!emailInputDisabled}
            label="Adresse électronique"
            nativeInputProps={{ ...register("email") }}
            state={errors.email ? "error" : "default"}
            stateRelatedMessage={errors.email?.message}
          />
        </div>
        <FormButtons
          backUrl={`/candidacies/${candidacyId}/summary`}
          formState={{ isDirty, isSubmitting }}
        />
      </form>
    </div>
  );
};

export default CandidateContactDetailsPage;
