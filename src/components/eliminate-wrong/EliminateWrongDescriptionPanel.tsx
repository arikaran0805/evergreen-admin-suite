/**
 * EliminateWrongDescriptionPanel
 * Shows the problem prompt/question with constraints.
 */
import { Maximize2, Minimize2, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { EliminateWrongProblem } from "@/hooks/useEliminateWrongProblems";

interface Props {
  problem: EliminateWrongProblem;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const difficultyColors: Record<string, string> = {
  Easy: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  Medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  Hard: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
};

export function EliminateWrongDescriptionPanel({
  problem,
  isExpanded,
  onToggleExpand,
  isCollapsed,
  onToggleCollapse,
}: Props) {
  if (isCollapsed) {
    return (
      <div className="h-full flex items-center justify-between px-4">
        <span className="text-sm font-medium text-muted-foreground truncate">Problem Description</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleCollapse}>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-11 flex items-center justify-between px-4 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Description</span>
          <Badge variant="outline" className={cn("text-xs", difficultyColors[problem.difficulty])}>
            {problem.difficulty}
          </Badge>
          {problem.selection_mode === "multiple" && (
            <Badge variant="secondary" className="text-xs">Multi-select</Badge>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity">
          {onToggleCollapse && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleCollapse}>
              <ChevronUp className="h-4 w-4" />
            </Button>
          )}
          {onToggleExpand && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleExpand}>
              {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-5 space-y-4">
          <h2 className="text-lg font-bold text-foreground">{problem.title}</h2>
          
          {problem.description && (
            <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {problem.description}
            </div>
          )}

          {problem.selection_mode === "multiple" && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
              <p className="text-xs font-medium text-muted-foreground">
                💡 Select <strong>all</strong> correct answers. There may be more than one.
              </p>
            </div>
          )}

          {problem.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {problem.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
