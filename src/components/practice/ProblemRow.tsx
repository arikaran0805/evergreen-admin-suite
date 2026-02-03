import { CheckCircle, Circle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Problem } from "./types";

interface ProblemRowProps {
  problem: Problem;
  onClick: () => void;
  onSolutionClick?: () => void;
}

const difficultyColors = {
  Easy: "text-green-600 dark:text-green-500",
  Medium: "text-amber-500 dark:text-amber-400",
  Hard: "text-red-500 dark:text-red-400",
};

export function ProblemRow({ problem, onClick }: ProblemRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 px-4 py-3.5 border-b border-border/30 transition-colors cursor-pointer group",
        "hover:bg-muted/50"
      )}
      onClick={onClick}
    >
      {/* Status Checkbox */}
      <div className="shrink-0">
        {problem.solved ? (
          <CheckCircle className="h-4 w-4 text-sidebar-primary" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground/50" />
        )}
      </div>

      {/* Problem Title */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className={cn(
          "text-sm font-medium truncate group-hover:text-primary transition-colors",
          problem.locked && "text-muted-foreground",
          problem.solved && "text-muted-foreground"
        )}>
          {problem.title}
        </span>
        {problem.locked && (
          <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
        )}
      </div>

      {/* Difficulty Tag */}
      <span className={cn(
        "text-sm font-medium shrink-0 w-16 text-right",
        difficultyColors[problem.difficulty]
      )}>
        {problem.difficulty}
      </span>
    </div>
  );
}
