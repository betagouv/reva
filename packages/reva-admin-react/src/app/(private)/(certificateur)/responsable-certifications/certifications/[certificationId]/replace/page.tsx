"use client";

import { Button } from "@codegouvfr/react-dsfr/Button";
import Input from "@codegouvfr/react-dsfr/Input";
import { createModal } from "@codegouvfr/react-dsfr/Modal";
import Tag from "@codegouvfr/react-dsfr/Tag";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { format } from "date-fns";
import { useParams, useRouter } from "next/navigation";
import { ReactNode } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { useAuth } from "@/components/auth/auth";
import { EnhancedSectionCard } from "@/components/card/enhanced-section-card/EnhancedSectionCard";
import { graphqlErrorToast, successToast } from "@/components/toast/toast";
import { sanitizedText } from "@/utils/input-sanitization";

import { useReplaceCertificationPage } from "./replaceCertification.hook";

const zodSchema = z.object({
  rncp: sanitizedText(),
});

type ReplaceCertificationFormSchema = z.infer<typeof zodSchema>;

const confirmationModal = createModal({
  id: "replacement-confirmation-modal",
  isOpenedByDefault: false,
});

export default function ReplaceCertificationPage() {
  const { certificationId } = useParams<{
    certificationId: string;
  }>();

  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
    watch,
  } = useForm<ReplaceCertificationFormSchema>({
    resolver: standardSchemaResolver(zodSchema),
    defaultValues: { rncp: "" },
  });

  const rncp = watch("rncp");

  const {
    certification,
    getCertificationQueryStatus,
    fcCertification,
    replaceCertification,
  } = useReplaceCertificationPage({
    rncp,
    certificationId,
  });

  const handleFormSubmit = handleSubmit(async (_data) => {
    confirmationModal.open();
  });

  const { isCertificationRegistryManager } = useAuth();

  const handleConfirmReplacement = async () => {
    try {
      const result = await replaceCertification.mutateAsync({
        certificationId,
        codeRncp: rncp,
      });

      const newCertificationId = result.referential_replaceCertification.id;

      successToast("La certification a bien été remplacée");
      if (isCertificationRegistryManager) {
        router.push(
          `/responsable-certifications/certifications/${newCertificationId}`,
        );
      } else {
        router.push(`/certifications/${newCertificationId}`);
      }
    } catch (error) {
      graphqlErrorToast(error);
    }
  };

  if (getCertificationQueryStatus === "error") {
    return (
      <span className="text-red-500 font-medium">
        Impossible de charger la certification à remplacer
      </span>
    );
  }

  if (!certification) {
    return (
      <div className="bg-neutral-200 rounded animate-pulse h-8 w-1/2"></div>
    );
  }

  return (
    <div data-testid="replace-certification-page">
      <h1>Remplacer une certification</h1>
      <p className="mb-12 text-xl">
        Pour remplacer une certification, saisissez son code RNCP afin de mettre
        à jour automatiquement les informations officielles issues de France
        Compétences et du Formacode.
        <br />
        Si vous rencontrez des difficultés pour remplacer une certification,
        contactez l'équipe support France VAE à contact@vae.gouv.fr
      </p>
      <div className="flex flex-col gap-8">
        <form
          id="replaceCertificationForm"
          onSubmit={handleFormSubmit}
          className="flex gap-8"
        >
          <Input
            data-testid="replace-certification-rncp-input"
            label="Code RNCP"
            nativeInputProps={{
              ...register("rncp"),
              required: true,
            }}
            className="md:w-1/4 mb-0"
            state={errors.rncp ? "error" : "default"}
            stateRelatedMessage={errors.rncp?.message}
          />
        </form>

        {fcCertification && (
          <EnhancedSectionCard
            data-testid="fc-certification-description-card"
            title={`Informations liées au code RNCP ${fcCertification?.NUMERO_FICHE.replace("RNCP", "") || ""}`}
            isEditable
          >
            <div className="flex flex-col gap-6">
              <h3
                data-testid="fc-certification-description-card-title"
                className="mb-0"
              >
                Descriptif de la certification avec France compétences
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Info className="col-span-1 md:col-span-2" title="Intitulé">
                  {fcCertification.INTITULE}
                </Info>

                <Info title="Niveau">
                  {fcCertification?.NOMENCLATURE_EUROPE?.INTITULE || "Inconnu"}
                </Info>
                <Info title="Type">
                  {fcCertification.ABREGE
                    ? `${fcCertification.ABREGE.LIBELLE} (${fcCertification.ABREGE.CODE})`
                    : "Inconnu"}
                </Info>
                <Info title="Date d'échéance">
                  {fcCertification.DATE_FIN_ENREGISTREMENT
                    ? format(
                        fcCertification.DATE_FIN_ENREGISTREMENT,
                        "dd/MM/yyyy",
                      )
                    : "Inconnue"}
                </Info>
                <Info title="Date de dernière delivrance">
                  {fcCertification.DATE_LIMITE_DELIVRANCE
                    ? format(
                        fcCertification.DATE_LIMITE_DELIVRANCE,
                        "dd/MM/yyyy",
                      )
                    : "Inconnue"}
                </Info>
              </div>

              <h3 className="mb-0">Domaines et sous-domaines du Formacode </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fcCertification.DOMAINS.length == 0 && (
                  <div>Aucun formacode associé</div>
                )}
                {fcCertification.DOMAINS.map((domain) => (
                  <div key={domain.id} className="flex flex-col gap-2">
                    <div>{domain.label}</div>
                    <div
                      key={domain.id}
                      className="flex flex-row flex-wrap gap-2"
                    >
                      {domain.children.map((subDomain) => (
                        <Tag key={subDomain.id}>
                          {`${subDomain.code} ${subDomain.label}`}
                        </Tag>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </EnhancedSectionCard>
        )}
      </div>

      <div className="flex flex-row justify-end mt-12 gap-2">
        <Button
          priority="secondary"
          linkProps={{
            href: `/responsable-certifications/certifications/${certificationId}`,
            target: "_self",
          }}
        >
          Retour
        </Button>

        <Button
          className="ml-auto"
          priority="tertiary no outline"
          onClick={() => reset()}
        >
          Réinitialiser
        </Button>
        <Button
          nativeButtonProps={{
            type: "submit",
            form: "replaceCertificationForm",
          }}
          disabled={isSubmitting || !fcCertification}
        >
          Suivant
        </Button>
      </div>

      <confirmationModal.Component
        title="Remplacer une certification"
        size="large"
        buttons={[
          {
            priority: "secondary",
            children: "Annuler",
          },
          {
            priority: "primary",
            onClick: handleConfirmReplacement,
            children: "Confirmer",
          },
        ]}
      >
        <p>
          Vous êtes sur le point de remplacer la certification
          <br />
          <br />
          <span className="font-semibold">
            RNCP {certification.codeRncp} - {certification.label}
          </span>
          <br />
          <br />
          En confirmant, vous allez récupérer informations issues de France
          Compétences et du Formacode du{" "}
          <span className="font-semibold">{fcCertification?.NUMERO_FICHE}</span>
          .
          <br />
          <br />
          Les candidats qui ont déjà choisi l'ancienne version pourront
          continuer le parcours qu'ils ont commencé.
          <br />
          <br />
          Si vous rencontrez des difficultés pour remplacer la certification,
          contactez{" "}
          <a className="fr-link" href="mailto:contact@vae.gouv.fr">
            contact@vae.gouv.fr
          </a>
          <br />
          <br />
          Voulez-vous confirmer le remplacement de cette certification ?
        </p>
      </confirmationModal.Component>
    </div>
  );
}

const Info = ({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) => (
  <dl className={`${className || ""}`}>
    <dt className="mb-1">{title}</dt>
    <dd className="font-medium">{children}</dd>
  </dl>
);
