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
} from "lucide-react";
import { cn } from "@/lib/utils";

export type FixErrorVerdict =
  | "idle"
  | "running"
  | "accepted"
  | "wrong_answer"
  | "runtime_error"
  | "compilation_error";

export interface FixErrorTestResult {
  id: number;
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
}

interface FixErrorResultPanelProps {
  verdict: FixErrorVerdict;
  error?: string;
  testResults: FixErrorTestResult[];
  successMessage?: string;
  failureMessage?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

function ErrorBlock({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const lineCount = content.split("\n").length;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
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
            <>
              <ChevronUp className="h-4 w-4" /> View less
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" /> View more
            </>
          )}
        </button>
      )}
    </div>
  );
}

export function FixErrorResultPanel({
  verdict,
  error,
  testResults,
  successMessage,
  failureMessage,
  isExpanded = false,
  onToggleExpand,
  isCollapsed = false,
  onToggleCollapse,
}: FixErrorResultPanelProps) {
  const [isHovered, setIsHovered] = useState(false);

  const passedCount = testResults.filter((r) => r.passed).length;
  const totalCount = testResults.length;
  const allPassed = verdict === "accepted";

  // Determine verdict display
  let verdictLabel = "";
  let verdictColor = "text-muted-foreground";
  let verdictBg = "bg-muted/50";

  switch (verdict) {
    case "accepted":
      verdictLabel = "Accepted";
      verdictColor = "text-green-600 dark:text-green-500";
      verdictBg = "bg-green-500/10";
      break;
    case "wrong_answer":
      verdictLabel = "Wrong Answer";
      verdictColor = "text-red-500";
      verdictBg = "bg-red-500/10";
      break;
    case "runtime_error":
      verdictLabel = "Runtime Error";
      verdictColor = "text-red-500";
      verdictBg = "bg-red-500/10";
      break;
    case "compilation_error":
      verdictLabel = "Compilation Error";
      verdictColor = "text-red-500";
      verdictBg = "bg-red-500/10";
      break;
  }

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
          {verdict !== "idle" && verdict !== "running" && (
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                allPassed ? "bg-green-500" : "bg-red-500"
              )}
            />
          )}
        </div>
        <div
          className={cn(
            "flex items-center gap-0.5 transition-opacity",
            isHovered || isExpanded ? "opacity-100" : "opacity-0"
          )}
        >
          {/* Collapse first */}
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onToggleCollapse}
              title={isCollapsed ? "Show result" : "Hide result"}
            >
              {isCollapsed ? (
                <PanelTopOpen className="h-4 w-4" />
              ) : (
                <PanelTopClose className="h-4 w-4" />
              )}
            </Button>
          )}
          {/* Expand second */}
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
        </div>
      </div>

      {/* Content - hidden when collapsed */}
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

            {/* Verdict banner */}
            {verdict !== "idle" && verdict !== "running" && (
              <>
                <div className={cn("p-4 rounded-lg", verdictBg)}>
                  <div className="flex flex-col items-center gap-1 text-center">
                    <span className={cn("text-xl font-semibold", verdictColor)}>
                      {verdictLabel}
                    </span>
                    {totalCount > 0 && (
                      <span
                        className={cn(
                          "text-sm",
                          allPassed
                            ? "text-green-600/80 dark:text-green-500/80"
                            : "text-muted-foreground"
                        )}
                      >
                        {passedCount} / {totalCount} test cases passed
                      </span>
                    )}
                  </div>
                </div>

                {/* Success message */}
                {allPassed && successMessage && (
                  <div className="flex items-start gap-2.5 p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground/90">{successMessage}</p>
                  </div>
                )}

                {/* Failure message */}
                {!allPassed && failureMessage && !error && (
                  <p className="text-sm text-muted-foreground">{failureMessage}</p>
                )}

                {/* Error output */}
                {error && <ErrorBlock content={error} />}

                {/* Test case results */}
                {testResults.length > 0 && !error && (
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
                          <span className="font-medium text-sm">Test Case {tr.id + 1}</span>
                        </div>
                        {!tr.passed && (
                          <div className="space-y-1.5 text-sm font-mono ml-6">
                            <div>
                              <span className="text-muted-foreground">Input: </span>
                              <span>{tr.input}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Expected: </span>
                              <span className="text-green-600 dark:text-green-500">
                                {tr.expected}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Output: </span>
                              <span className="text-red-600 dark:text-red-500">{tr.actual}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
