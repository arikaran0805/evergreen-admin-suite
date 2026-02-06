/**
 * PredictDescriptionPanel
 * Left panel for the Predict workspace — visually matches ProblemDescriptionPanel.
 * Shows: title, difficulty, prompt, code snippet, explanation (after solve), step-by-step.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  BookOpen,
  History,
  Expand,
  Shrink,
  PanelLeftClose,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from "lucide-react";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import type { PredictOutputProblem } from "@/hooks/usePredictOutputProblems";
import type { PredictOutputAttempt } from "@/hooks/usePredictOutputAttempts";

interface PredictDescriptionPanelProps {
  problem: PredictOutputProblem;
  attempts: PredictOutputAttempt[];
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const difficultyColors: Record<string, string> = {
  easy: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
  medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  hard: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
};

export function PredictDescriptionPanel({
  problem,
  attempts,
  isExpanded = false,
  onToggleExpand,
  isCollapsed = false,
  onToggleCollapse,
  activeTab: controlledActiveTab,
  onTabChange,
}: PredictDescriptionPanelProps) {
  const [internalActiveTab, setInternalActiveTab] = useState("description");
  const activeTab = controlledActiveTab ?? internalActiveTab;
  const setActiveTab = onTabChange ?? setInternalActiveTab;
  const [isHovered, setIsHovered] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [copied, setCopied] = useState(false);

  const alreadySolved = attempts.some((a) => a.is_correct);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(problem.code);
    setCopied(true);
    toast.success("Code copied");
    setTimeout(() => setCopied(false), 2000);
  }, [problem.code]);

  // Collapsed state: vertical tabs
  if (isCollapsed && !isExpanded) {
    return (
      <div
        className="h-full w-7 flex flex-col bg-card group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex-1 flex flex-col py-1">
          <button
            onClick={() => setActiveTab("description")}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 transition-colors border-l-2",
              activeTab === "description"
                ? "border-primary text-foreground bg-muted/50"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span
              className="font-medium text-xs"
              style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
            >
              Description
            </span>
          </button>

          <button
            onClick={() => setActiveTab("explanation")}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 transition-colors border-l-2",
              activeTab === "explanation"
                ? "border-primary text-foreground bg-muted/50"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            <BookOpen className="h-4 w-4 shrink-0" />
            <span
              className="font-medium text-xs"
              style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
            >
              Explanation
            </span>
          </button>

          <button
            onClick={() => setActiveTab("attempts")}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 transition-colors border-l-2",
              activeTab === "attempts"
                ? "border-primary text-foreground bg-muted/50"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            <History className="h-4 w-4 shrink-0" />
            <span
              className="font-medium text-xs"
              style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
            >
              Attempts
            </span>
          </button>
        </div>

        <div className="flex flex-col items-center gap-0.5 py-2 border-t border-border/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {onToggleExpand && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onToggleExpand} title="Fullscreen">
              <Expand className="h-3 w-3" />
            </Button>
          )}
          {onToggleCollapse && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onToggleCollapse} title="Expand panel">
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
      {/* Tab Header */}
      <div className="border-b border-border/50 px-4 shrink-0">
        <div className="flex items-center justify-between">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="h-11 bg-transparent p-0 gap-4">
              <TabsTrigger
                value="description"
                className="h-11 px-0 pb-3 pt-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground flex items-center gap-1.5"
              >
                <FileText className="h-4 w-4" />
                Description
              </TabsTrigger>
              <TabsTrigger
                value="explanation"
                className="h-11 px-0 pb-3 pt-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground flex items-center gap-1.5"
              >
                <BookOpen className="h-4 w-4" />
                Explanation
              </TabsTrigger>
              <TabsTrigger
                value="attempts"
                className="h-11 px-0 pb-3 pt-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground flex items-center gap-1.5"
              >
                <History className="h-4 w-4" />
                Attempts
                {attempts.length > 0 && (
                  <span className="text-xs text-muted-foreground">({attempts.length})</span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div
            className={cn(
              "flex items-center gap-0.5 shrink-0 transition-opacity",
              isHovered || isExpanded || isCollapsed ? "opacity-100" : "opacity-0"
            )}
          >
            {onToggleCollapse && !isExpanded && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onToggleCollapse}
                title={isCollapsed ? "Show panel" : "Hide panel"}
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            )}
            {onToggleExpand && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onToggleExpand}
                title={isExpanded ? "Exit fullscreen" : "Fullscreen"}
              >
                {isExpanded ? <Shrink className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <ScrollArea className="flex-1">
        {activeTab === "description" && (
          <div className="p-4 space-y-6">
            {/* Title and Difficulty */}
            <div className="space-y-3">
              <h1 className="text-xl font-semibold">{problem.title}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className={cn(
                    "capitalize font-medium",
                    difficultyColors[problem.difficulty?.toLowerCase()] || difficultyColors.medium
                  )}
                >
                  {problem.difficulty}
                </Badge>
                <Badge variant="outline" className="text-xs capitalize">
                  {problem.language}
                </Badge>
                {problem.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs font-normal">
                    {tag}
                  </Badge>
                ))}
                {problem.tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs font-normal">
                    +{problem.tags.length - 3}
                  </Badge>
                )}
              </div>
            </div>

            {/* Prompt */}
            {problem.prompt && (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="text-sm text-foreground/90">{problem.prompt}</p>
              </div>
            )}

            {/* Code Block */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Code:</h3>
              <div className="relative group rounded-lg border border-border overflow-hidden">
                <div className="flex items-center justify-between bg-muted/50 px-3 py-1.5 border-b border-border">
                  <span className="text-xs font-medium text-muted-foreground capitalize">
                    {problem.language}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    {copied ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="p-4 overflow-x-auto bg-background">
                  <code className="text-sm font-mono text-foreground whitespace-pre">
                    {problem.code}
                  </code>
                </pre>
              </div>
            </div>

            {/* XP Info */}
            {problem.xp_value > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>🏆</span>
                <span>{problem.xp_value} XP</span>
                {problem.reveal_allowed && problem.reveal_penalty !== "no_xp" && (
                  <span className="text-xs">
                    (Reveal penalty: {problem.reveal_penalty === "half_xp" ? "½ XP" : "Viewed"})
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "explanation" && (
          <div className="p-4 space-y-6">
            {!alreadySolved && !attempts.some((a) => a.revealed) ? (
              <div className="py-12 text-center">
                <BookOpen className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Solve or reveal the problem to view the explanation.
                </p>
              </div>
            ) : (
              <>
                {problem.explanation && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Explanation</h3>
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap">
                      {problem.explanation}
                    </p>
                  </div>
                )}

                {problem.step_by_step.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Step-by-Step</h3>
                    <ol className="list-decimal list-inside space-y-1.5">
                      {problem.step_by_step.map((s, i) => (
                        <li key={i} className="text-sm text-foreground/80">
                          {s}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {problem.common_mistakes.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Common Mistakes</h3>
                    <ul className="list-disc list-inside space-y-1.5">
                      {problem.common_mistakes.map((m, i) => (
                        <li key={i} className="text-sm text-muted-foreground">
                          {m}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {!problem.explanation &&
                  problem.step_by_step.length === 0 &&
                  problem.common_mistakes.length === 0 && (
                    <div className="py-12 text-center">
                      <p className="text-muted-foreground">
                        No explanation available for this problem.
                      </p>
                    </div>
                  )}
              </>
            )}
          </div>
        )}

        {activeTab === "attempts" && (
          <div className="p-4 space-y-3">
            {attempts.length === 0 ? (
              <div className="py-12 text-center">
                <History className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">No attempts yet.</p>
              </div>
            ) : (
              attempts
                .slice()
                .reverse()
                .map((attempt) => (
                  <div
                    key={attempt.id}
                    className={cn(
                      "rounded-lg border p-3 space-y-1",
                      attempt.is_correct
                        ? "border-green-500/30 bg-green-500/5"
                        : attempt.revealed && !attempt.user_output
                        ? "border-amber-500/30 bg-amber-500/5"
                        : "border-red-500/30 bg-red-500/5"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          attempt.is_correct
                            ? "text-green-600 dark:text-green-400"
                            : attempt.revealed && !attempt.user_output
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-red-600 dark:text-red-400"
                        )}
                      >
                        {attempt.is_correct
                          ? "✓ Correct"
                          : attempt.revealed && !attempt.user_output
                          ? "👁 Revealed"
                          : "✗ Incorrect"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Attempt #{attempt.attempt_no}
                      </span>
                    </div>
                    {attempt.user_output && (
                      <pre className="text-xs font-mono bg-muted/50 rounded p-2 whitespace-pre-wrap">
                        {attempt.user_output}
                      </pre>
                    )}
                    {attempt.score_awarded > 0 && (
                      <span className="text-xs text-green-600 dark:text-green-400">
                        +{attempt.score_awarded} XP
                      </span>
                    )}
                  </div>
                ))
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
