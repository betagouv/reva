import { GenerateCohorteCodeInscriptionButton } from "./generate-cohorte-code-inscription-button/GenerateCohorteCodeInscriptionButton";
import { RegistrationCodeDisplay } from "./registration-code-display/RegistrationCodeDisplay";
import { RegistrationCodeNotGeneratedWarning } from "./registration-code-not-generated-warning/RegistrationCodeNotGeneratedWarning";

export const RegistrationCodeCard = ({
  codeInscription,
  commanditaireId,
  cohorteVaeCollectiveId,
  nomCohorte,
  aapLabel,
  disabled,
  readonly,
}: {
  codeInscription?: string | null;
  commanditaireId: string;
  cohorteVaeCollectiveId: string;
  nomCohorte: string;
  aapLabel: string;
  disabled?: boolean;
  readonly?: boolean;
}) => {
  if (codeInscription || readonly) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-lg mb-0">
          Afin de permettre à vos candidats de s’inscrire à cette cohorte, nous
          vous invitons à leur transmettre ce code. Ils pourront le renseigner
          sur la page de création de candidature en VAE collective :
        </p>
        {codeInscription ? (
          <RegistrationCodeDisplay registrationCode={codeInscription || ""} />
        ) : (
          <RegistrationCodeNotGeneratedWarning />
        )}
        <p className="text-lg mb-0">
          Il sera alors orienté vers les certifications sélectionnées et l’AAP
          en charge de cette cohorte.
        </p>

        <p className="text-lg mt-4 mb-0">
          Vous pouvez aussi transmettre ce code à l'accompagnateur en charge de
          la cohorte. Il pourra l’utiliser afin de guider les candidats de cette
          cohorte dans leur création de candidature en VAE collective.
          <br />
          Des{" "}
          <a
            className="fr-link text-lg"
            href="https://www.notion.so/francevae/Comment-transmettre-le-code-d-inscription-d-une-cohorte-2ea100b69ece81a3992ee4a6998c4bb3?source=copy_link"
            target="_blank"
            rel="noopener noreferrer"
          >
            modèles de mails
          </a>{" "}
          sont mis à votre disposition pour informer votre accompagnateur et les
          candidats concernés.
        </p>
      </div>
    );
  } else {
    return (
      <GenerateCohorteCodeInscriptionButton
        commanditaireId={commanditaireId}
        cohorteVaeCollectiveId={cohorteVaeCollectiveId}
        nomCohorte={nomCohorte}
        aapLabel={aapLabel}
        disabled={disabled}
      />
    );
  }
};
