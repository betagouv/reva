import { Tooltip } from "@codegouvfr/react-dsfr/Tooltip";

export const ParcoursTab = ({
  parcoursByCertificationAuthorities,
}: {
  parcoursByCertificationAuthorities?:
    | {
        certificationAuthority: {
          label: string;
          websiteUrl?: string | null;
        };
        parcours: {
          id: string;
          label: string;
        }[];
      }[]
    | null;
}) => {
  return (
    <div>
      <p className="mb-2">
        Cliquez sur les liens des établissements pour accéder aux prérequis,
        modalités de jury et documentation détaillés
      </p>
      <p className="mb-4">
        La liste ci-dessous présente tous les établissements proposant ce
        diplôme{" "}
        <span className="p-2">
          <Tooltip title="Vous choisissez le diplôme. Le choix de l'établissement (et du parcours si applicable) se fera à l'envoi du dossier de faisabilité." />
        </span>
      </p>
      <p className="text-xl font-bold leading-8">
        Établissements proposant ce diplôme sur la plateforme France VAE
      </p>
      {parcoursByCertificationAuthorities &&
      parcoursByCertificationAuthorities.length > 0 ? (
        parcoursByCertificationAuthorities
          .filter((pba) => pba.parcours.length > 0)
          .map((pba) => (
            <div
              key={pba.certificationAuthority.label}
              data-testid={`parcours-by-certification-authority-${pba.certificationAuthority.label}`}
            >
              {pba.certificationAuthority.websiteUrl ? (
                <a
                  href={pba.certificationAuthority.websiteUrl}
                  target="_blank"
                  className="fr-link"
                >
                  {pba.certificationAuthority.label}
                </a>
              ) : (
                <span>{pba.certificationAuthority.label}</span>
              )}

              <ul className="ml-2">
                {pba.parcours.map((p) => (
                  <li key={p.id}>{p.label}</li>
                ))}
              </ul>
            </div>
          ))
      ) : (
        <p>Il n'y a pas d'établissements pour ce diplôme.</p>
      )}
    </div>
  );
};
