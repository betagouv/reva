import { Button } from "@codegouvfr/react-dsfr/Button";

import { hasPermission } from "@/components/auth/actions";
import { RoleDependentBreadcrumb } from "@/components/role-dependent-breadcrumb/RoleDependentBreadcrumb";
import { getAccessTokenFromCookie } from "@/helpers/auth/get-access-token-from-cookie/getAccessTokenFromCookie";
import { getActiveFeatures } from "@/helpers/get-actives-features";
import { throwUrqlErrors } from "@/helpers/graphql/throw-urql-errors/throwUrqlErrors";
import { client } from "@/helpers/graphql/urql-client/urqlClient";

import { graphql } from "@/graphql/generated";

import { AccessRightsCard } from "./_components/access-rights-card/AccessRightsCard";
import { CertificationsCard } from "./_components/certifications-card/CertificationsCard";
import { DeleteCohorteButton } from "./_components/delete-cohorte-button/DeleteCohorteButton";
import { OrganismCard } from "./_components/organism-card/OrganismCard";
import { RegistrationCodeCard } from "./_components/registration-code-card/RegistrationCodeCard";

const getCohorteById = async (
  commanditaireVaeCollectiveId: string,
  cohorteVaeCollectiveId: string,
) => {
  const accessToken = await getAccessTokenFromCookie();

  const result = throwUrqlErrors(
    await client.query(
      graphql(`
        query getCohorteByIdForCohortePage(
          $commanditaireVaeCollectiveId: ID!
          $cohorteVaeCollectiveId: ID!
        ) {
          vaeCollective_getCohorteVaeCollectiveById(
            commanditaireVaeCollectiveId: $commanditaireVaeCollectiveId
            cohorteVaeCollectiveId: $cohorteVaeCollectiveId
          ) {
            id
            nom
            status
            codeInscription

            certificationCohorteVaeCollectives {
              id
              certification {
                id
                label
                codeRncp
              }
            }
            organism {
              id
              label
              nomPublic
              adresseNumeroEtNomDeRue
              adresseCodePostal
              adresseVille
              emailContact
              telephone
            }
          }
        }
      `),
      {
        commanditaireVaeCollectiveId,
        cohorteVaeCollectiveId,
      },
      {
        fetchOptions: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      },
    ),
  );

  if (!result.data?.vaeCollective_getCohorteVaeCollectiveById) {
    throw new Error("Cohorte non trouvée");
  }

  return result.data.vaeCollective_getCohorteVaeCollectiveById;
};

export default async function CohortePage({
  params,
}: {
  params: Promise<{ commanditaireId: string; cohorteVaeCollectiveId: string }>;
}) {
  const { commanditaireId, cohorteVaeCollectiveId } = await params;

  const cohorte = await getCohorteById(commanditaireId, cohorteVaeCollectiveId);

  const certifications = (cohorte.certificationCohorteVaeCollectives || []).map(
    (certificationCohorte) => certificationCohorte.certification,
  );

  const organism = cohorte.organism;

  const certificationSelected = certifications.length > 0;
  const organismSelected = !!organism;

  const canModifyCohorte = await hasPermission({
    permission: "MODIFIER_COHORTE",
    cohorteVaeCollectiveId,
  });
  const canDeleteCohorte = await hasPermission({
    permission: "SUPPRIMER_COHORTE",
    cohorteVaeCollectiveId,
  });

  // carte certification readonly si la cohorte est publiée ou si l'utilisateur n'a pas la permission de modifier la cohorte
  const certificationCardreadonly =
    cohorte.status === "PUBLIE" || !canModifyCohorte;

  // carte organisme disabled si aucune certification n'est sélectionnée, si la cohorte est publiée et aucun organisme n'est sélectionnée
  //  (ce cas n'est pas sensé se produire aujourd'hui dans l'interface)
  const organismCardDisabled =
    !certificationSelected ||
    (cohorte.status === "PUBLIE" && !organismSelected);

  // carte organisme readonly si la cohorte est publiée ou si l'utilisateur n'a pas la permission de modifier la cohorte
  const organismCardreadonly = cohorte.status === "PUBLIE" || !canModifyCohorte;

  const registrationCodeCardreadonly =
    cohorte.status === "PUBLIE" || !canModifyCohorte;

  const { isFeatureActive } = await getActiveFeatures();

  const isVaeCollectiveAccountsFeatureActive = isFeatureActive(
    "VAE_COLLECTIVE_ACCOUNTS",
  );

  const hasAccessRightsPermission = await hasPermission({
    permission: "MODIFIER_DROITS_ACCES_COHORTE",
    cohorteVaeCollectiveId,
  });

  const showAccessRightsCard =
    isVaeCollectiveAccountsFeatureActive && hasAccessRightsPermission;

  return (
    <div className="flex flex-col w-full">
      <RoleDependentBreadcrumb
        className="mt-0 mb-4"
        currentPageLabel={cohorte.nom}
        segments={[
          {
            label: "Cohortes",
            linkProps: {
              href: `/commanditaires/${commanditaireId}/cohortes`,
            },
          },
        ]}
      />
      <div className="flex justify-between items-center">
        <h1>{cohorte.nom}</h1>
        {canModifyCohorte && (
          <Button
            className="mb-6"
            priority="tertiary no outline"
            iconId="fr-icon-edit-line"
            size="small"
            linkProps={{
              href: `/commanditaires/${commanditaireId}/cohortes/${cohorteVaeCollectiveId}/modifier-intitule`,
            }}
          >
            Modifier l’intitulé
          </Button>
        )}
      </div>
      <p className="text-xl mb-12">
        Paramétrez votre cohorte, afin de générer un code unique à transmettre
        aux candidats devant intégrer cette cohorte.
      </p>
      <CertificationsCard
        numberOfCertifications={certifications.length}
        readonly={certificationCardreadonly}
        certificationsSelectionneesHref={`/commanditaires/${commanditaireId}/cohortes/${cohorteVaeCollectiveId}/certifications-selectionnees`}
        selectCertificationsHref={`/commanditaires/${commanditaireId}/cohortes/${cohorteVaeCollectiveId}/selection-certifications`}
      />
      <OrganismCard
        className="mt-8"
        commanditaireId={commanditaireId}
        cohorteVaeCollectiveId={cohorteVaeCollectiveId}
        organism={organism}
        disabled={organismCardDisabled}
        readonly={organismCardreadonly}
        certificationSelected={certificationSelected}
      />
      {showAccessRightsCard && (
        <AccessRightsCard
          className="mt-8"
          accessRightsPageHref={`/commanditaires/${commanditaireId}/cohortes/${cohorteVaeCollectiveId}/droits-acces`}
        />
      )}
      <hr className="mt-8 mb-2" />
      <RegistrationCodeCard
        codeInscription={cohorte.codeInscription}
        commanditaireId={commanditaireId}
        cohorteVaeCollectiveId={cohorteVaeCollectiveId}
        nomCohorte={cohorte.nom}
        aapLabel={organism?.label ?? ""}
        disabled={!organismSelected}
        readonly={registrationCodeCardreadonly}
      />
      {cohorte.status === "BROUILLON" && canDeleteCohorte && (
        <DeleteCohorteButton
          commanditaireId={commanditaireId}
          cohorteVaeCollectiveId={cohorteVaeCollectiveId}
          nomCohorte={cohorte.nom}
        />
      )}

      <Button
        className="mt-12"
        priority="secondary"
        linkProps={{
          href: `/commanditaires/${commanditaireId}/cohortes`,
        }}
      >
        Retour
      </Button>
    </div>
  );
}
