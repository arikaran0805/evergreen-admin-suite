import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Check,
  X,
  Clock,
  Terminal,
  Expand,
  Shrink,
  Copy,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  PanelTopClose,
  PanelTopOpen,
  AlertTriangle,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  FixErrorJudgeResult,
  FixErrorVerdict,
  DiffLine,
  FixErrorTestResult,
} from "@/hooks/useFixErrorJudge";

interface FixErrorResultPanelProps {
  verdict: FixErrorVerdict;
  result: FixErrorJudgeResult | null;
  successMessage?: string;
  failureMessage?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

// ── Error Block ─────────────────────────────────────────────────────────────

function ErrorBlock({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const lineCount = content.split("\n").length;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <div className="relative rounded-lg bg-red-500/10 p-4">
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 p-1.5 rounded hover:bg-red-500/20 transition-colors text-red-400"
        title="Copy error"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
      <div
        className={cn(
          "font-mono text-sm text-red-500 pr-10 overflow-x-auto",
          !expanded && lineCount > 8 && "max-h-40 overflow-hidden"
        )}
      >
        <pre className="whitespace-pre-wrap break-words">{content}</pre>
      </div>
      {lineCount > 8 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 mx-auto mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <><ChevronUp className="h-4 w-4" /> View less</>
          ) : (
            <><ChevronDown className="h-4 w-4" /> View more</>
          )}
        </button>
      )}
    </div>
  );
}

// ── Diff Viewer ─────────────────────────────────────────────────────────────

function DiffViewer({ diff }: { diff: DiffLine[] }) {
  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/50">
        <span className="text-xs font-medium text-muted-foreground">Output Diff</span>
      </div>
      <div className="font-mono text-sm overflow-x-auto">
        {diff.map((line, idx) => {
          let bgClass = "";
          let prefix = " ";
          let textColor = "text-foreground";

          switch (line.type) {
            case "match":
              bgClass = "";
              prefix = " ";
              break;
            case "missing":
              bgClass = "bg-green-500/10";
              prefix = "+";
              textColor = "text-green-600 dark:text-green-500";
              break;
            case "extra":
              bgClass = "bg-red-500/10";
              prefix = "-";
              textColor = "text-red-600 dark:text-red-500";
              break;
            case "incorrect":
              bgClass = "bg-amber-500/10";
              prefix = "~";
              textColor = "text-amber-600 dark:text-amber-500";
              break;
          }

          return (
            <div key={idx} className={cn("flex", bgClass)}>
              <span className="w-8 text-right pr-2 text-muted-foreground/60 select-none shrink-0 py-0.5">
                {line.lineNumber}
              </span>
              <span className={cn("w-4 text-center shrink-0 py-0.5", textColor)}>
                {prefix}
              </span>
              <div className="flex-1 py-0.5 pr-3">
                {line.type === "incorrect" ? (
                  <div className="space-y-0.5">
                    <div className="text-red-600 dark:text-red-500 line-through opacity-70">
                      {line.actual}
                    </div>
                    <div className="text-green-600 dark:text-green-500">
                      {line.expected}
                    </div>
                  </div>
                ) : (
                  <span className={textColor}>
                    {line.type === "missing" ? line.expected : line.actual ?? line.expected}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-3 py-1.5 bg-muted/20 border-t border-border/50 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" /> Expected (missing)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" /> Your output (extra)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" /> Mismatch
        </span>
      </div>
    </div>
  );
}

// ── Test Results List ───────────────────────────────────────────────────────

function TestResultsList({ testResults }: { testResults: FixErrorTestResult[] }) {
  return (
    <div className="space-y-2">
      {testResults.map((tr) => (
        <div
          key={tr.id}
          className="border border-border/50 rounded-lg p-3 bg-muted/20"
        >
          <div className="flex items-center gap-2 mb-2">
            {tr.passed ? (
              <Check className="h-4 w-4 text-green-600 dark:text-green-500 shrink-0" />
            ) : (
              <X className="h-4 w-4 text-red-600 dark:text-red-500 shrink-0" />
            )}
            <span className="font-medium text-sm">
              Test Case {tr.id + 1}
              {!tr.is_visible && (
                <span className="ml-1.5 text-xs text-muted-foreground font-normal">(hidden)</span>
              )}
            </span>
            {tr.runtime_ms !== undefined && tr.runtime_ms > 0 && (
              <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
                <Timer className="h-3 w-3" />
                {tr.runtime_ms}ms
              </span>
            )}
          </div>

          {!tr.passed && tr.is_visible && (
            <div className="space-y-1.5 text-sm font-mono ml-6">
              {tr.error ? (
                <div>
                  <span className="text-muted-foreground">Error: </span>
                  <span className="text-red-600 dark:text-red-500">{tr.error}</span>
                </div>
              ) : (
                <>
                  <div>
                    <span className="text-muted-foreground">Input: </span>
                    <span>{tr.input}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Expected: </span>
                    <span className="text-green-600 dark:text-green-500">{tr.expected}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Output: </span>
                    <span className="text-red-600 dark:text-red-500">{tr.actual}</span>
                  </div>
                </>
              )}
            </div>
          )}

          {!tr.passed && !tr.is_visible && (
            <div className="ml-6 text-xs text-muted-foreground italic">
              Details hidden for this test case.
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main Panel ──────────────────────────────────────────────────────────────

export function FixErrorResultPanel({
  verdict,
  result,
  successMessage,
  failureMessage,
  isExpanded = false,
  onToggleExpand,
  isCollapsed = false,
  onToggleCollapse,
}: FixErrorResultPanelProps) {
  const [isHovered, setIsHovered] = useState(false);

  const isPassed = result?.status === "PASS";
  const hasFailed = result?.status === "FAIL";
  const hasResult = verdict === "completed" && result !== null;

  // Verdict display mapping
  const verdictConfig: Record<string, { label: string; color: string; bg: string; icon?: React.ReactNode }> = {
    PASS: {
      label: "Accepted",
      color: "text-green-600 dark:text-green-500",
      bg: "bg-green-500/10",
    },
    COMPILE_ERROR: {
      label: "Compilation Error",
      color: "text-red-500",
      bg: "bg-red-500/10",
      icon: <AlertTriangle className="h-5 w-5" />,
    },
    RUNTIME_ERROR: {
      label: "Runtime Error",
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
    TIMEOUT: {
      label: "Time Limit Exceeded",
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      icon: <Timer className="h-5 w-5" />,
    },
    WRONG_ANSWER: {
      label: "Wrong Answer",
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
    VALIDATOR_ERROR: {
      label: "Validation Error",
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      icon: <AlertTriangle className="h-5 w-5" />,
    },
  };

  const config = isPassed
    ? verdictConfig.PASS
    : result?.failureType
      ? verdictConfig[result.failureType]
      : null;

  // Status dot for header
  const statusDot = hasResult
    ? isPassed
      ? "bg-green-500"
      : "bg-red-500"
    : null;

  return (
    <div
      className="h-full flex flex-col bg-card overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-11 border-b border-border/50 bg-muted/40 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Result</span>
          {statusDot && <span className={cn("w-2 h-2 rounded-full", statusDot)} />}
        </div>
        <div
          className={cn(
            "flex items-center gap-0.5 transition-opacity",
            isHovered || isExpanded ? "opacity-100" : "opacity-0"
          )}
        >
          {onToggleCollapse && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleCollapse}
              title={isCollapsed ? "Show result" : "Hide result"}>
              {isCollapsed ? <PanelTopOpen className="h-4 w-4" /> : <PanelTopClose className="h-4 w-4" />}
            </Button>
          )}
          {onToggleExpand && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleExpand}
              title={isExpanded ? "Exit fullscreen" : "Fullscreen"}>
              {isExpanded ? <Shrink className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-4">
            {/* Idle state */}
            {verdict === "idle" && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Terminal className="h-8 w-8 mb-3 opacity-40" />
                <p className="text-sm">Fix the code and click Run to see results.</p>
              </div>
            )}

            {/* Running state */}
            {verdict === "running" && (
              <div className="flex items-center justify-center py-12">
                <Clock className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
                <span className="text-muted-foreground text-sm">Running...</span>
              </div>
            )}

            {/* Completed with result */}
            {hasResult && config && (
              <>
                {/* Verdict banner */}
                <div className={cn("p-4 rounded-lg", config.bg)}>
                  <div className="flex flex-col items-center gap-1 text-center">
                    <span className={cn("text-xl font-semibold", config.color)}>
                      {config.label}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {result.summaryMessage}
                    </span>
                    {result.total_count > 0 && result.failureType !== "COMPILE_ERROR" && result.failureType !== "TIMEOUT" && (
                      <span className={cn(
                        "text-xs mt-1",
                        isPassed ? "text-green-600/80 dark:text-green-500/80" : "text-muted-foreground"
                      )}>
                        {result.passed_count} / {result.total_count} test cases passed
                      </span>
                    )}
                    {result.runtime_ms > 0 && (
                      <span className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Timer className="h-3 w-3" />
                        {result.runtime_ms}ms
                      </span>
                    )}
                  </div>
                </div>

                {/* Success message */}
                {isPassed && successMessage && (
                  <div className="flex items-start gap-2.5 p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground/90">{successMessage}</p>
                  </div>
                )}

                {/* Failure message */}
                {hasFailed && failureMessage && !result.stderr && (
                  <p className="text-sm text-muted-foreground">{failureMessage}</p>
                )}

                {/* Error output (stderr) */}
                {result.stderr && <ErrorBlock content={result.stderr} />}

                {/* Diff viewer (for output_comparison) */}
                {result.diff && result.diff.length > 0 && (
                  <DiffViewer diff={result.diff} />
                )}

                {/* Test case results */}
                {result.testResults && result.testResults.length > 0 && !result.stderr && (
                  <TestResultsList testResults={result.testResults} />
                )}
              </>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
