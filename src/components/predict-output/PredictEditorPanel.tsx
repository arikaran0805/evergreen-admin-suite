/**
 * PredictEditorPanel
 * Right panel for the Predict workspace — mirrors the solve workspace's editor chrome.
 * Shows: read-only code, output textarea, reveal, submit.
 * Hints moved to description panel. Reveal output shown in Result panel.
 */
import { useState, useRef, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  Braces,
  Expand,
  Shrink,
  PanelTopClose,
  PanelTopOpen,
  Copy,
  Check,
  X,
  RotateCcw,
  Maximize,
} from "lucide-react";
import Editor from "@monaco-editor/react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import type { ImperativePanelHandle } from "react-resizable-panels";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { matchOutput, getLineDiff } from "@/lib/outputMatcher";
import { useSubmitPredictOutputAttempt } from "@/hooks/usePredictOutputAttempts";
import type { PredictOutputProblem } from "@/hooks/usePredictOutputProblems";
import type { PredictOutputAttempt } from "@/hooks/usePredictOutputAttempts";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PredictEditorPanelProps {
  problem: PredictOutputProblem;
  attempts: PredictOutputAttempt[];
  isExpanded?: boolean;
  onExpandEditor?: () => void;
  onExpandResult?: () => void;
  expandedPanel?: "editor" | "result" | null;
  onTabSwitchToAttempts?: () => void;
}

type ViewState = "answering" | "correct" | "incorrect";

export function PredictEditorPanel({
  problem,
  attempts,
  isExpanded,
  onExpandEditor,
  onExpandResult,
  expandedPanel,
  onTabSwitchToAttempts,
}: PredictEditorPanelProps) {
  const [userOutput, setUserOutput] = useState("");
  const [viewState, setViewState] = useState<ViewState>("answering");
  const [revealed, setRevealed] = useState(false);
  const [startTime] = useState(Date.now());
  const [copied, setCopied] = useState(false);
  const [isEditorHovered, setIsEditorHovered] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorPanelRef = useRef<ImperativePanelHandle>(null);
  const resultPanelRef = useRef<ImperativePanelHandle>(null);
  const [isEditorPanelCollapsed, setIsEditorPanelCollapsed] = useState(false);
  const [isResultPanelCollapsed, setIsResultPanelCollapsed] = useState(false);

  const submitMutation = useSubmitPredictOutputAttempt();
  const attemptCount = attempts.length;

  const canReveal = useMemo(() => {
    if (!problem.reveal_allowed) return false;
    if (problem.reveal_timing === "anytime") return true;
    if (problem.reveal_timing === "after_1") return attemptCount >= 1;
    if (problem.reveal_timing === "after_2") return attemptCount >= 2;
    return false;
  }, [problem, attemptCount]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(problem.code);
    setCopied(true);
    toast.success("Code copied");
    setTimeout(() => setCopied(false), 2000);
  }, [problem.code]);

  const handleSubmit = useCallback(async () => {
    if (!userOutput.trim()) return;

    const result = matchOutput(
      userOutput,
      problem.expected_output,
      problem.accepted_outputs,
      problem.match_mode,
      problem.output_type
    );

    const timeTaken = Math.round((Date.now() - startTime) / 1000);
    let score = 0;
    if (result.isCorrect) {
      score = revealed
        ? problem.reveal_penalty === "half_xp"
          ? Math.floor(problem.xp_value / 2)
          : 0
        : problem.xp_value;
    }

    try {
      await submitMutation.mutateAsync({
        problem_id: problem.id,
        user_output: userOutput,
        is_correct: result.isCorrect,
        revealed,
        attempt_no: attemptCount + 1,
        score_awarded: score,
        time_taken: timeTaken,
      });
    } catch {
      // Continue showing result even if save fails
    }

    setViewState(result.isCorrect ? "correct" : "incorrect");

    // Expand result panel
    resultPanelRef.current?.expand();
    resultPanelRef.current?.resize(45);

    if (result.isCorrect) {
      onTabSwitchToAttempts?.();
    }
  }, [userOutput, problem, revealed, attemptCount, startTime, submitMutation, onTabSwitchToAttempts]);

  const handleReveal = useCallback(() => {
    setRevealed(true);
    // Expand result panel to show revealed output
    resultPanelRef.current?.expand();
    resultPanelRef.current?.resize(45);
    submitMutation.mutate({
      problem_id: problem.id,
      user_output: "",
      is_correct: false,
      revealed: true,
      attempt_no: attemptCount + 1,
      score_awarded: 0,
    });
  }, [problem, attemptCount, submitMutation]);

  const handleTryAgain = useCallback(() => {
    setUserOutput("");
    setViewState("answering");
    textareaRef.current?.focus();
  }, []);

  const lineDiff = useMemo(() => {
    if (viewState !== "incorrect") return null;
    return getLineDiff(userOutput, problem.expected_output);
  }, [viewState, userOutput, problem.expected_output]);

  const handleToggleEditorPanelCollapse = () => {
    if (isEditorPanelCollapsed) {
      editorPanelRef.current?.expand();
    } else {
      editorPanelRef.current?.collapse();
    }
  };

  const handleToggleResultPanelCollapse = () => {
    if (isResultPanelCollapsed) {
      resultPanelRef.current?.expand();
    } else {
      resultPanelRef.current?.collapse();
    }
  };

  const monacoLanguageMap: Record<string, string> = {
    python: "python",
    javascript: "javascript",
    java: "java",
    c: "c",
    cpp: "cpp",
    sql: "sql",
  };

  const lineCount = problem.code.split("\n").length;
  const monacoHeight = Math.max(80, Math.min(lineCount * 20 + 16, 400));

  // Expanded editor only
  if (expandedPanel === "editor") {
    return (
      <div className="h-full flex flex-col gap-1.5">
        <div
          className="h-full flex flex-col bg-card rounded-lg border border-border shadow-sm overflow-hidden"
          onMouseEnter={() => setIsEditorHovered(true)}
          onMouseLeave={() => setIsEditorHovered(false)}
        >
          <div className="flex items-center justify-between px-4 h-11 border-b border-border/50 bg-muted/40">
            <div className="flex items-center gap-2">
              <Braces className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Predict the Output</span>
            </div>
            <div className={cn("flex items-center gap-0.5 transition-opacity", isEditorHovered ? "opacity-100" : "opacity-0")}>
              {onExpandEditor && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onExpandEditor} title="Collapse panel">
                  <Shrink className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-4">
              <div style={{ height: monacoHeight }} className="border-b border-border">
                <Editor
                  value={problem.code}
                  language={monacoLanguageMap[problem.language] || problem.language}
                  theme="vs-dark"
                  options={{
                    readOnly: true,
                    domReadOnly: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    lineNumbers: "on",
                    lineNumbersMinChars: 2,
                    lineDecorationsWidth: 8,
                    renderLineHighlight: "none",
                    folding: false,
                    contextmenu: false,
                    fontSize: 14,
                    padding: { top: 12, bottom: 12 },
                    scrollbar: { vertical: "hidden", horizontal: "auto" },
                    wordWrap: "on",
                    dragAndDrop: false,
                  }}
                />
              </div>
              <div className="px-4 pb-4">
                {renderAnswerArea()}
              </div>
            </div>
          </ScrollArea>
          {renderFooter()}
        </div>
      </div>
    );
  }

  // Expanded result only
  if (expandedPanel === "result") {
    return (
      <div className="h-full flex flex-col gap-1.5">
        <div className="h-full bg-card rounded-lg border border-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 h-11 border-b border-border/50 bg-muted/40">
            <span className="text-sm font-medium">Result</span>
            {onExpandResult && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onExpandResult}>
                <Shrink className="h-4 w-4" />
              </Button>
            )}
          </div>
          <ScrollArea className="flex-1 h-[calc(100%-44px)]">
            <div className="p-4">{renderResultContent()}</div>
          </ScrollArea>
        </div>
      </div>
    );
  }

  function renderAnswerArea() {
    if (viewState !== "answering") return null;

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Your Output</label>
          <Textarea
            ref={textareaRef}
            value={userOutput}
            onChange={(e) => setUserOutput(e.target.value)}
            placeholder="Type the exact output of the above code"
            className="font-mono text-sm min-h-[100px]"
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            Match line breaks and spacing as shown in output
          </p>
        </div>
      </div>
    );
  }

  function renderResultContent() {
    // Show revealed output in result panel
    if (revealed && viewState === "answering") {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30">
            <Eye className="h-5 w-5 text-amber-600" />
            <span className="font-semibold text-amber-800 dark:text-amber-300">Expected Output (Revealed)</span>
            {problem.reveal_penalty === "half_xp" && (
              <Badge className="ml-auto bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                ½ XP penalty
              </Badge>
            )}
          </div>
          <pre className="font-mono text-sm bg-muted/50 p-4 rounded-lg border border-border whitespace-pre-wrap">
            {problem.expected_output}
          </pre>
        </div>
      );
    }

    if (viewState === "correct") {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-4 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30">
            <Check className="h-5 w-5 text-green-600" />
            <span className="font-semibold text-green-800 dark:text-green-300">Correct 🎉</span>
            {problem.xp_value > 0 && (
              <Badge className="ml-auto bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                +{revealed && problem.reveal_penalty === "half_xp" ? Math.floor(problem.xp_value / 2) : problem.xp_value} XP
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Your Output</p>
              <pre className="font-mono text-sm bg-green-50 dark:bg-green-900/10 p-3 rounded border border-green-200 dark:border-green-800/30 whitespace-pre-wrap">
                {userOutput}
              </pre>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Expected Output</p>
              <pre className="font-mono text-sm bg-muted/50 p-3 rounded border border-border whitespace-pre-wrap">
                {problem.expected_output}
              </pre>
            </div>
          </div>
        </div>
      );
    }

    if (viewState === "incorrect") {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30">
            <X className="h-5 w-5 text-red-600" />
            <span className="font-semibold text-red-800 dark:text-red-300">Not quite</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Your Output</p>
              <pre className="font-mono text-sm bg-red-50 dark:bg-red-900/10 p-3 rounded border border-red-200 dark:border-red-800/30 whitespace-pre-wrap">
                {lineDiff
                  ? lineDiff.userLines.map((line: string, i: number) => (
                      <span key={i} className={cn(lineDiff.mismatches.includes(i) && "bg-red-200 dark:bg-red-800/40")}>
                        {line}
                        {i < lineDiff.userLines.length - 1 ? "\n" : ""}
                      </span>
                    ))
                  : userOutput}
              </pre>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Expected Output</p>
              <pre
                className={cn(
                  "font-mono text-sm p-3 rounded border whitespace-pre-wrap",
                  revealed ? "bg-muted/50 border-border" : "bg-muted/50 border-border blur-sm select-none"
                )}
              >
                {lineDiff
                  ? lineDiff.expectedLines.map((line: string, i: number) => (
                      <span
                        key={i}
                        className={cn(revealed && lineDiff.mismatches.includes(i) && "bg-amber-200 dark:bg-amber-800/40")}
                      >
                        {line}
                        {i < lineDiff.expectedLines.length - 1 ? "\n" : ""}
                      </span>
                    ))
                  : problem.expected_output}
              </pre>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleTryAgain} className="flex-1 gap-1.5">
              <RotateCcw className="h-4 w-4" />
              Try Again
            </Button>
            {canReveal && !revealed && (
              <Button variant="outline" onClick={handleReveal} className="flex-1 gap-1.5">
                <Eye className="h-4 w-4" />
                Reveal Output
              </Button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="py-12 text-center text-muted-foreground">
        <p>Submit your answer to see results.</p>
      </div>
    );
  }

  function renderFooter() {
    return (
      <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/40">
        <span className="text-xs text-muted-foreground">
          {viewState === "answering"
            ? "Type the output and submit"
            : viewState === "correct"
            ? "Great job! 🎉"
            : "Try again or reveal"}
        </span>
        <div className="flex items-center gap-2">
          {canReveal && !revealed && viewState === "answering" && (
            <Button variant="outline" size="sm" onClick={handleReveal} className="gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              Reveal
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!userOutput.trim() || submitMutation.isPending || viewState !== "answering"}
          >
            {submitMutation.isPending ? "Checking..." : "Submit Answer"}
          </Button>
        </div>
      </div>
    );
  }

  // Default: two vertical panels (code+input / result)
  return (
    <div className="h-full min-h-0 flex flex-col gap-1.5">
      <ResizablePanelGroup direction="vertical" className="flex-1 min-h-0">
        {/* Code + Input Panel */}
        <ResizablePanel
          ref={editorPanelRef}
          defaultSize={65}
          minSize={30}
          collapsible
          collapsedSize={8}
          className="min-h-0"
          onCollapse={() => setIsEditorPanelCollapsed(true)}
          onExpand={() => setIsEditorPanelCollapsed(false)}
        >
          <div
            className="h-full flex flex-col bg-card rounded-lg border border-border shadow-sm overflow-hidden"
            onMouseEnter={() => setIsEditorHovered(true)}
            onMouseLeave={() => setIsEditorHovered(false)}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-11 border-b border-border/50 bg-muted/40">
              <div className="flex items-center gap-2">
                <Braces className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Predict the Output</span>
              </div>
              <div
                className={cn(
                  "flex items-center gap-0.5 transition-opacity",
                  isEditorHovered ? "opacity-100" : "opacity-0"
                )}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleToggleEditorPanelCollapse}
                  title={isEditorPanelCollapsed ? "Show" : "Hide"}
                >
                  {isEditorPanelCollapsed ? <PanelTopOpen className="h-4 w-4" /> : <PanelTopClose className="h-4 w-4" />}
                </Button>
                {onExpandEditor && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onExpandEditor} title="Expand">
                    <Expand className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Language bar */}
            {!isEditorPanelCollapsed && (
              <>
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-background">
                  <Badge variant="outline" className="text-xs capitalize h-7">
                    {problem.language}
                  </Badge>
                  <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy} title="Copy code">
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => document.documentElement.requestFullscreen()}
                      title="Fullscreen"
                    >
                      <Maximize className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Monaco read-only code + answer area */}
                <ScrollArea className="flex-1">
                  <div className="space-y-4">
                    {/* Read-only Monaco editor */}
                    <div style={{ height: monacoHeight }} className="border-b border-border">
                      <Editor
                        value={problem.code}
                        language={monacoLanguageMap[problem.language] || problem.language}
                        theme="vs-dark"
                        options={{
                          readOnly: true,
                          domReadOnly: true,
                          minimap: { enabled: false },
                          scrollBeyondLastLine: false,
                          lineNumbers: "on",
                          lineNumbersMinChars: 2,
                          lineDecorationsWidth: 8,
                          renderLineHighlight: "none",
                          folding: false,
                          contextmenu: false,
                          overviewRulerBorder: false,
                          overviewRulerLanes: 0,
                          hideCursorInOverviewRuler: true,
                          fontSize: 14,
                          padding: { top: 12, bottom: 12 },
                          scrollbar: { vertical: "hidden", horizontal: "auto" },
                          wordWrap: "on",
                          cursorStyle: "line-thin",
                          cursorBlinking: "solid",
                          dragAndDrop: false,
                        }}
                      />
                    </div>

                    <div className="px-4 pb-4">
                      {renderAnswerArea()}
                    </div>
                  </div>
                </ScrollArea>

                {/* Footer */}
                {renderFooter()}
              </>
            )}
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Result Panel */}
        <ResizablePanel
          ref={resultPanelRef}
          defaultSize={35}
          minSize={10}
          collapsible
          collapsedSize={8}
          className="min-h-0"
          onCollapse={() => setIsResultPanelCollapsed(true)}
          onExpand={() => setIsResultPanelCollapsed(false)}
        >
          <div className="h-full bg-card rounded-lg border border-border shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 h-11 border-b border-border/50 bg-muted/40">
              <span className="text-sm font-medium">Result</span>
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleToggleResultPanelCollapse}
                  title={isResultPanelCollapsed ? "Show" : "Hide"}
                >
                  {isResultPanelCollapsed ? <PanelTopOpen className="h-4 w-4" /> : <PanelTopClose className="h-4 w-4" />}
                </Button>
                {onExpandResult && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onExpandResult}>
                    <Expand className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            {!isResultPanelCollapsed && (
              <ScrollArea className="flex-1">
                <div className="p-4">{renderResultContent()}</div>
              </ScrollArea>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}