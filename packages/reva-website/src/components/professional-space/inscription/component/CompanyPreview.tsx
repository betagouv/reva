import Alert from "@codegouvfr/react-dsfr/Alert";
import Badge from "@codegouvfr/react-dsfr/Badge";

import { LegalStatus } from "@/graphql/generated/graphql";

const CompanySummaryItem = ({
  title,
  description,
  descriptionClassName,
}: {
  title: string;
  description?: string;
  descriptionClassName?: string;
}) => {
  return description ? (
    <dl className="text-base text-neutral-900 pl-0 leading-tight">
      <dt className="font-semibold">{title}</dt>
      <dd className={`pl-0 ${descriptionClassName}`}>{description}</dd>
    </dl>
  ) : (
    <></>
  );
};

type EtablissementDiffusible = {
  siret: string;
  siegeSocial: boolean;
  raisonSociale: string;
  formeJuridique: {
    code: string;
    libelle: string;
    legalStatus: LegalStatus;
  };
  qualiopiStatus: boolean | null;
  dateFermeture: Date | null;
};

interface Props {
  siret: string;
  etablissement?: EtablissementDiffusible | null;
}

export const CompanyPreview = (props: Props) => {
  const { siret, etablissement } = props;

  const getFormattedSiret = (value: string) => {
    if (!value) return "";

    return value.replace(/(\d{3})(\d{3})(\d{3})(\d{4})/, "$1 $2 $3 $4");
  };

  return (
    <div className="flex flex-col justify-between">
      <div className="md:block bg-neutral-100 p-6 mb-5">
        <h2 className="mb-4">
          Informations liées au SIRET - {getFormattedSiret(siret)}
        </h2>

        {!etablissement && (
          <Alert
            severity="error"
            title=""
            description="Erreur : les données INSEE de l’organisation, nécessaires pour valider le rattachement, sont indisponibles ou inexistantes. Merci de réessayer ultérieurement."
            className="mb-5"
          />
        )}

        {etablissement &&
          (() => {
            const {
              siegeSocial,
              raisonSociale,
              formeJuridique,
              qualiopiStatus,
              dateFermeture,
            } = etablissement;

            return (
              <>
                <div className="flex flex-col md:flex-row gap-2">
                  {siegeSocial ? (
                    <Badge severity="success">Siège social</Badge>
                  ) : (
                    <Badge severity="error">Établissement secondaire</Badge>
                  )}
                  {!dateFermeture ? (
                    <Badge severity="success">En activité</Badge>
                  ) : (
                    (() => {
                      const date = new Date(dateFermeture);
                      let day: string | number = date.getDate() + 1;
                      if (day < 10) {
                        day = `0${day}`;
                      }

                      let month: string | number = date.getMonth() + 1;
                      if (month < 10) {
                        month = `0${month}`;
                      }

                      return (
                        <Badge severity="error">
                          Fermé le {`${day}/${month}/${date.getFullYear()}`}
                        </Badge>
                      );
                    })()
                  )}
                  {qualiopiStatus && (
                    <Badge severity="success">Qualiopi VAE Actif</Badge>
                  )}
                  {!qualiopiStatus && (
                    <Badge severity="warning">Qualiopi VAE Inactif</Badge>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <CompanySummaryItem
                    title="Raison sociale"
                    description={raisonSociale}
                  />
                  <CompanySummaryItem
                    title="Nature juridique"
                    description={formeJuridique.libelle}
                  />
                </div>
              </>
            );
          })()}
      </div>
    </div>
  );
};
