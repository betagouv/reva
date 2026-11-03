import { BasicSkill, Training } from "@/graphql/generated/types";

export default function ParcoursSection({
  basicSkills,
  mandatoryTrainings,
  additionalHourCount,
  individualHourCount,
  collectiveHourCount,
}: {
  basicSkills: BasicSkill[];
  mandatoryTrainings: Training[];
  additionalHourCount?: number | null;
  individualHourCount?: number | null;
  collectiveHourCount?: number | null;
}) {
  return (
    <div>
      <div className="flex">
        <h3>Préconisation accompagnement méthodologique </h3>
      </div>
      <div className="ml-10 flex flex-col gap-2 mb-6">
        <dl>
          <dt id="parcours-individual-hours-label" className="inline">
            Accompagnement individuel :{" "}
          </dt>
          <dd
            aria-labelledby="parcours-individual-hours-label"
            className="inline font-medium"
          >
            {individualHourCount ?? 0}h
          </dd>
        </dl>
        <dl>
          <dt id="parcours-collective-hours-label" className="inline">
            Accompagnement collectif :{" "}
          </dt>
          <dd
            aria-labelledby="parcours-collective-hours-label"
            className="inline font-medium"
          >
            {collectiveHourCount ?? 0}h
          </dd>
        </dl>
        <dl>
          <dt id="parcours-training-hours-label" className="inline">
            Formation :{" "}
          </dt>
          <dd
            aria-labelledby="parcours-training-hours-label"
            className="inline font-medium"
          >
            {additionalHourCount ?? 0}h
          </dd>
        </dl>
      </div>

      <h3>Préconisation actes formatifs </h3>

      <div className="ml-10">
        {mandatoryTrainings.length > 0 && (
          <>
            <h4 className="mb-2">Formations obligatoires</h4>
            <div className="mb-4">
              {mandatoryTrainings.map((training) => (
                <p key={training.id} className="mb-2">
                  {training.label}
                </p>
              ))}
            </div>
          </>
        )}

        {basicSkills.length > 0 && (
          <>
            <h4 className="mb-2">Savoir de base</h4>
            {basicSkills.map((skill) => (
              <p key={skill.id} className="mb-2">
                {skill.label}
              </p>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
