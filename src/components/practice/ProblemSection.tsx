import { Problem } from "./types";
import { ProblemRow } from "./ProblemRow";

interface ProblemSectionProps {
  title: string;
  problems: Problem[];
  onProblemClick: (problem: Problem) => void;
  onSolutionClick: (problem: Problem) => void;
}

export function ProblemSection({ title, problems, onProblemClick, onSolutionClick }: ProblemSectionProps) {
  if (problems.length === 0) return null;

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden bg-card">
      {/* Section Header */}
      <div className="px-4 py-3 bg-muted/50 border-b border-border/50">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
      </div>

      {/* Problem Rows */}
      <div>
        {problems.map((problem) => (
          <ProblemRow
            key={problem.id}
            problem={problem}
            onClick={() => onProblemClick(problem)}
            onSolutionClick={() => onSolutionClick(problem)}
          />
        ))}
      </div>
    </div>
  );
}
