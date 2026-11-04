export const AapSelectionAdvice = ({
  className = "",
}: {
  className?: string;
}) => (
  <p className={className}>
    Vous n’avez pas encore identifié d’Architecte Accompagnateur de Parcours ?
    Nous vous invitons à consulter{" "}
    <a
      className="fr-link"
      style={{ fontSize: "inherit" }}
      href={`${process.env.NEXT_PUBLIC_METABASE_BASE_URL}/public/dashboard/a8c95110-94d7-4add-8eaa-4931ca6214fb`}
      target="_blank"
    >
      la liste des AAP référencés sur France VAE
    </a>
  </p>
);
