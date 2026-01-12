import Accordion from "@codegouvfr/react-dsfr/Accordion";
import CallOut from "@codegouvfr/react-dsfr/CallOut";
import { useMemo } from "react";

import {
  CertificationCompetenceBloc,
  DffCertificationCompetenceBloc,
  Prerequisite,
} from "@/graphql/generated/graphql";

export default function CertificationSection({
  option,
  firstForeignLanguage,
  secondForeignLanguage,
  prerequisites,
  isCertificationPartial,
  certificationAuthorityStructureLabel,
  certificationCompetenceBlocs,
  blocsDeCompetencesDFF,
}: {
  option?: string | null;
  firstForeignLanguage?: string | null;
  secondForeignLanguage?: string | null;
  prerequisites?: Prerequisite[] | null;
  isCertificationPartial?: boolean | null;
  certificationAuthorityStructureLabel?: string | null;
  certificationCompetenceBlocs?: CertificationCompetenceBloc[];
  blocsDeCompetencesDFF: DffCertificationCompetenceBloc[];
}) {
  const prequisitesByStatus = useMemo(() => {
    return {
      acquired: prerequisites?.filter(
        (prerequisite) => prerequisite?.state === "ACQUIRED",
      ),
      inProgress: prerequisites?.filter(
        (prerequisite) => prerequisite?.state === "IN_PROGRESS",
      ),
      recommended: prerequisites?.filter(
        (prerequisite) => prerequisite?.state === "RECOMMENDED",
      ),
    };
  }, [prerequisites]);

  const noPrerequisites = !prerequisites?.length;

  const competenceBlocs = useMemo(
    () =>
      certificationCompetenceBlocs?.map((bloc) => ({
        competenceBlocId: bloc.id,
        label: bloc.code ? `${bloc.code} - ${bloc.label}` : bloc.label,
        checked: blocsDeCompetencesDFF.some(
          (bc) => bc.certificationCompetenceBloc.id === bloc.id,
        ),
      })) || [],
    [certificationCompetenceBlocs, blocsDeCompetencesDFF],
  );

  return (
    <div className="mt-6">
      {certificationAuthorityStructureLabel && (
        <dl className="my-4">
          <dt
            id="certification-authority-structure-label"
            className="font-normal mb-0"
          >
            Certificateur :
          </dt>
          <dd
            aria-labelledby="certification-authority-structure-label"
            className="font-medium"
          >
            {certificationAuthorityStructureLabel}
          </dd>
        </dl>
      )}
      {!!option && (
        <dl className="my-4">
          <dt id="certification-option-label" className="font-normal mb-0">
            Option ou parcours :
          </dt>
          <dd
            aria-labelledby="certification-option-label"
            className="font-medium"
          >
            {option}
          </dd>
        </dl>
      )}
      {(firstForeignLanguage || secondForeignLanguage) && (
        <div className="flex gap-2 mb-4">
          {firstForeignLanguage && (
            <dl className="flex flex-col flex-1">
              <dt id="certification-first-language-label">
                Langue vivante 1 :
              </dt>
              <dd
                aria-labelledby="certification-first-language-label"
                className="font-medium"
              >
                {firstForeignLanguage}
              </dd>
            </dl>
          )}
          {secondForeignLanguage && (
            <dl className="flex flex-col flex-1">
              <dt id="certification-second-language-label">
                Langue vivante 2 :
              </dt>
              <dd
                aria-labelledby="certification-second-language-label"
                className="font-medium"
              >
                {secondForeignLanguage}
              </dd>
            </dl>
          )}
        </div>
      )}
      <CallOut
        title="Le candidat vise"
        classes={{
          title: "text-xl",
        }}
      >
        {isCertificationPartial
          ? "Un ou plusieurs bloc(s) de compétences de la certification"
          : "La certification dans sa totalité"}
      </CallOut>
      {competenceBlocs.length > 0 && (
        <div className="mt-6">
          <Accordion
            label="Choix des blocs de compétences"
            defaultExpanded={false}
          >
            <div className="flex flex-col gap-4">
              {competenceBlocs.map((b) => {
                return (
                  <div key={b.competenceBlocId}>
                    <input
                      type="checkbox"
                      checked={b.checked}
                      disabled
                      name={b.competenceBlocId}
                    />
                    <label
                      className="ml-2 text-dsfrGray-labelGrey text-base"
                      htmlFor={b.competenceBlocId}
                    >
                      {b.label}
                    </label>
                  </div>
                );
              })}
            </div>
          </Accordion>
        </div>
      )}

      <h5 className="mb-0 mt-6">Prérequis obligatoires</h5>
      <div className="mt-4">
        {noPrerequisites && (
          <p className="mb-0">
            Il n&apos;y a pas de prérequis obligatoires pour cette certification
          </p>
        )}
        {!!prequisitesByStatus?.acquired?.length && (
          <Accordion label="Oui" defaultExpanded={false}>
            <ul>
              {prequisitesByStatus?.acquired?.map((prerequisite) => (
                <li key={prerequisite?.id}>{prerequisite?.label}</li>
              ))}
            </ul>
          </Accordion>
        )}
        {!!prequisitesByStatus?.inProgress?.length && (
          <Accordion label="Non" defaultExpanded={false}>
            <ul>
              {prequisitesByStatus?.inProgress?.map((prerequisite) => (
                <li key={prerequisite?.id}>{prerequisite?.label}</li>
              ))}
            </ul>
          </Accordion>
        )}
        {!!prequisitesByStatus?.recommended?.length && (
          <Accordion label="Préconisés" defaultExpanded={false}>
            <ul>
              {prequisitesByStatus?.recommended?.map((prerequisite) => (
                <li key={prerequisite?.id}>{prerequisite?.label}</li>
              ))}
            </ul>
          </Accordion>
        )}
      </div>
    </div>
  );
}
