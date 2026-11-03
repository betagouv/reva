import { Goal } from "@/graphql/generated/types";

export default function GoalsSection({ goals }: { goals: Goal[] }) {
  return (
    <div className="flex flex-col gap-6 mt-6">
      <h3 className="mb-0">Objectifs</h3>
      <ul className="ml-10 my-0 text-lg" data-testid="goals-list">
        {goals.map((goal) => (
          <li key={goal.id}>{goal.label}</li>
        ))}
      </ul>
    </div>
  );
}
