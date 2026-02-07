import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Lightbulb, ChevronDown, ChevronUp, Bug, Expand, Shrink, PanelLeftClose, FileText } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { FixErrorProblem } from "@/hooks/useFixErrorProblems";

const difficultyColors: Record<string, string> = {
  Easy: "bg-green-500/10 text-green-600 dark:text-green-500 border-green-500/20",
  Medium: "bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20",
  Hard: "bg-red-500/10 text-red-600 dark:text-red-500 border-red-500/20",
};

interface FixErrorDescriptionPanelProps {
  problem: FixErrorProblem;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function FixErrorDescriptionPanel({
  problem,
  isExpanded = false,
  onToggleExpand,
  isCollapsed = false,
  onToggleCollapse,
}: FixErrorDescriptionPanelProps) {
  const [showHints, setShowHints] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Collapsed state: vertical icon sidebar like solve layout
  if (isCollapsed && !isExpanded) {
    return (
      <div
        className="h-full w-7 flex flex-col bg-card group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Vertical label */}
        <div className="flex-1 flex flex-col py-1">
          <button
            onClick={onToggleCollapse}
            className="flex flex-col items-center gap-1 py-2.5 transition-colors border-l-2 border-primary text-foreground bg-muted/50"
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span
              className="font-medium text-xs"
              style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
            >
              Problem
            </span>
          </button>
        </div>

        {/* Bottom buttons - Show on hover only */}
        <div className="flex flex-col items-center gap-0.5 py-2 border-t border-border/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {onToggleExpand && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onToggleExpand}
              title="Fullscreen"
            >
              <Expand className="h-3 w-3" />
            </Button>
          )}
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onToggleCollapse}
              title="Expand panel"
            >
              <PanelLeftClose className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col bg-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-11 border-b border-border/50 bg-muted/40 shrink-0">
        <div className="flex items-center gap-2">
          <Bug className="h-4 w-4 text-orange-500" />
          <span className="text-sm font-medium">Problem</span>
        </div>
        <div
          className={cn(
            "flex items-center gap-0.5 transition-opacity",
            isHovered || isExpanded ? "opacity-100" : "opacity-0"
          )}
        >
          {onToggleExpand && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onToggleExpand}
              title={isExpanded ? "Exit fullscreen" : "Fullscreen"}
            >
              {isExpanded ? <Shrink className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
            </Button>
          )}
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onToggleCollapse}
              title="Collapse panel"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-5 space-y-5">
          {/* Title + Difficulty + Tags */}
          <div>
            <h1 className="text-lg font-semibold text-foreground mb-2.5">{problem.title}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className={cn("text-xs font-medium", difficultyColors[problem.difficulty] || "")}
              >
                {problem.difficulty}
              </Badge>
              <Badge variant="outline" className="text-xs font-mono">
                {problem.language}
              </Badge>
              {problem.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Description */}
          {problem.description && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {problem.description.split("\n").map((line, i) => {
                if (!line.trim()) return <br key={i} />;
                if (line.startsWith("- ")) {
                  return (
                    <li key={i} className="text-sm text-foreground/90">
                      {line.slice(2)}
                    </li>
                  );
                }
                // Handle inline code
                if (line.includes("`")) {
                  const parts = line.split(/(`[^`]+`)/g);
                  return (
                    <p key={i} className="text-sm text-foreground/90 mb-2">
                      {parts.map((part, j) =>
                        part.startsWith("`") ? (
                          <code
                            key={j}
                            className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono"
                          >
                            {part.slice(1, -1)}
                          </code>
                        ) : (
                          part
                        )
                      )}
                    </p>
                  );
                }
                return (
                  <p key={i} className="text-sm text-foreground/90 mb-2">
                    {line}
                  </p>
                );
              })}
            </div>
          )}

          {/* Validation Info */}
          {problem.validation_type === "output_comparison" && problem.expected_output && (
            <div>
              <h3 className="text-sm font-medium text-foreground mb-2">Expected Output:</h3>
              <div className="bg-muted/50 rounded-lg p-3 font-mono text-sm">
                <pre className="whitespace-pre-wrap">{problem.expected_output}</pre>
              </div>
            </div>
          )}

          {problem.validation_type === "test_cases" && problem.test_cases.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-foreground mb-2">Test Cases:</h3>
              <div className="space-y-2">
                {problem.test_cases
                  .filter((tc) => !tc.is_hidden)
                  .map((tc, i) => (
                    <div key={i} className="bg-muted/50 rounded-lg p-3 font-mono text-sm space-y-1">
                      <div>
                        <span className="text-muted-foreground">Input: </span>
                        <span>{tc.input}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Expected: </span>
                        <span>{tc.expected_output}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Hints */}
          {problem.hints.length > 0 && (
            <div className="space-y-3">
              <button
                onClick={() => setShowHints(!showHints)}
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
                  showHints
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Lightbulb className={cn("h-4 w-4", showHints && "text-amber-500")} />
                {showHints ? "Hide" : "Show"} Hints ({problem.hints.length})
                {showHints ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {showHints && (
                <div className="space-y-2">
                  {problem.hints.map((hint, i) => (
                    <div
                      key={i}
                      className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3"
                    >
                      <p className="text-sm text-foreground/80">
                        <span className="font-medium text-amber-600 dark:text-amber-500">
                          Hint {i + 1}:{" "}
                        </span>
                        {hint}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}