/**
 * PredictEditorPanel
 * Right panel for the Predict workspace.
 * Shows: output textarea (top) + result (bottom).
 * Premium design: full-bleed textarea, console-like result view.
 */
import { useState, useRef, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  Expand,
  Shrink,
  Maximize,
  PanelTopClose,
  PanelTopOpen,
  X,
  Check,
  RotateCcw,
  Terminal,
} from "lucide-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import type { ImperativePanelHandle } from "react-resizable-panels";
import { cn } from "@/lib/utils";
import { matchOutput, getLineDiff } from "@/lib/outputMatcher";
import { useSubmitPredictOutputAttempt } from "@/hooks/usePredictOutputAttempts";
import type { PredictOutputProblem } from "@/hooks/usePredictOutputProblems";
import type { PredictOutputAttempt } from "@/hooks/usePredictOutputAttempts";

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
  const [isEditorHovered, setIsEditorHovered] = useState(false);
  const [isResultHovered, setIsResultHovered] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorPanelRef = useRef<ImperativePanelHandle>(null);
  const resultPanelRef = useRef<ImperativePanelHandle>(null);
  const [isEditorPanelCollapsed, setIsEditorPanelCollapsed] = useState(false);
  const [isResultPanelCollapsed, setIsResultPanelCollapsed] = useState(true);

  const submitMutation = useSubmitPredictOutputAttempt();
  const attemptCount = attempts.length;

  const canReveal = useMemo(() => {
    if (!problem.reveal_allowed) return false;
    if (problem.reveal_timing === "anytime") return true;
    if (problem.reveal_timing === "after_1") return attemptCount >= 1;
    if (problem.reveal_timing === "after_2") return attemptCount >= 2;
    return false;
  }, [problem, attemptCount]);

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

    resultPanelRef.current?.expand();
    resultPanelRef.current?.resize(50);

    if (result.isCorrect) {
      onTabSwitchToAttempts?.();
    }
  }, [userOutput, problem, revealed, attemptCount, startTime, submitMutation, onTabSwitchToAttempts]);

  const handleReveal = useCallback(() => {
    setRevealed(true);
    resultPanelRef.current?.expand();
    resultPanelRef.current?.resize(50);
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

  /* ─── Shared header builder ─── */
  function renderEditorHeader(opts: { shrinkable?: boolean }) {
    return (
      <div className="flex items-center justify-between px-4 h-11 border-b border-border/50 bg-muted/40 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Your Output</span>
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
            onClick={() => document.documentElement.requestFullscreen()}
            title="Fullscreen"
          >
            <Maximize className="h-4 w-4" />
          </Button>
          {!opts.shrinkable && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleToggleEditorPanelCollapse}
              title={isEditorPanelCollapsed ? "Show" : "Hide"}
            >
              {isEditorPanelCollapsed ? (
                <PanelTopOpen className="h-4 w-4" />
              ) : (
                <PanelTopClose className="h-4 w-4" />
              )}
            </Button>
          )}
          {opts.shrinkable && onExpandEditor && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onExpandEditor} title="Collapse panel">
              <Shrink className="h-4 w-4" />
            </Button>
          )}
          {!opts.shrinkable && onExpandEditor && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onExpandEditor} title="Expand">
              <Expand className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  /* ─── Editor body: full-bleed textarea or submitted output ─── */
  function renderEditorBody() {
    if (viewState !== "answering") {
      return (
        <div className="flex-1 min-h-0 flex flex-col">
          <pre className="flex-1 font-mono text-sm p-4 whitespace-pre-wrap text-foreground/90 overflow-auto">
            {userOutput || "(empty)"}
          </pre>
          {renderFooter()}
        </div>
      );
    }

    return (
      <div className="flex-1 min-h-0 flex flex-col relative">
        <textarea
          ref={textareaRef}
          value={userOutput}
          onChange={(e) => setUserOutput(e.target.value)}
          placeholder="Type the exact output of the code…"
          autoFocus
          className="flex-1 w-full resize-none bg-transparent font-mono text-sm p-4 text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
          spellCheck={false}
        />
        <div className="flex items-center justify-between px-4 py-2 shrink-0">
          <span className="text-[11px] text-muted-foreground/60 tracking-wide">
            Whitespace and line breaks matter
          </span>
          <div className="flex items-center gap-2">
            {canReveal && !revealed && (
              <Button variant="ghost" size="sm" onClick={handleReveal} className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                <Eye className="h-3.5 w-3.5" />
                Reveal
              </Button>
            )}
            <Button
              size="sm"
              className="h-7"
              onClick={handleSubmit}
              disabled={!userOutput.trim() || submitMutation.isPending}
            >
              {submitMutation.isPending ? "Checking…" : "Submit"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Footer for post-submit states ─── */
  function renderFooter() {
    return (
      <div className="flex items-center justify-end px-4 py-2 shrink-0">
        <div className="flex items-center gap-2">
          {canReveal && !revealed && viewState !== "answering" && (
            <Button variant="ghost" size="sm" onClick={handleReveal} className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <Eye className="h-3.5 w-3.5" />
              Reveal
            </Button>
          )}
          {viewState !== "answering" && (
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleTryAgain}>
              <RotateCcw className="h-3.5 w-3.5" />
              Try Again
            </Button>
          )}
        </div>
      </div>
    );
  }

  /* ─── Result panel body: clean console-like view ─── */
  function renderResultBody() {
    // Revealed
    if (revealed && viewState === "answering") {
      return (
        <div className="flex-1 min-h-0 flex flex-col overflow-auto">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/30">
            <Eye className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Revealed</span>
            {problem.reveal_penalty === "half_xp" && (
              <Badge variant="outline" className="ml-auto text-[10px] h-5">½ XP penalty</Badge>
            )}
          </div>
          <pre className="flex-1 font-mono text-sm p-4 whitespace-pre-wrap text-foreground/90">
            {problem.expected_output}
          </pre>
        </div>
      );
    }

    // Correct
    if (viewState === "correct") {
      return (
        <div className="flex-1 min-h-0 flex flex-col overflow-auto">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/30">
            <Check className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium text-green-600 dark:text-green-400">Correct</span>
            {problem.xp_value > 0 && (
              <Badge variant="outline" className="ml-auto text-[10px] h-5">
                +{revealed && problem.reveal_penalty === "half_xp" ? Math.floor(problem.xp_value / 2) : problem.xp_value} XP
              </Badge>
            )}
          </div>
          <div className="flex-1 grid grid-cols-2 divide-x divide-border/30">
            <div className="flex flex-col">
              <span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider px-4 pt-3 pb-1">Yours</span>
              <pre className="flex-1 font-mono text-sm px-4 pb-4 whitespace-pre-wrap text-foreground/90">
                {userOutput}
              </pre>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider px-4 pt-3 pb-1">Expected</span>
              <pre className="flex-1 font-mono text-sm px-4 pb-4 whitespace-pre-wrap text-foreground/90">
                {problem.expected_output}
              </pre>
            </div>
          </div>
        </div>
      );
    }

    // Incorrect
    if (viewState === "incorrect") {
      return (
        <div className="flex-1 min-h-0 flex flex-col overflow-auto">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/30">
            <X className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-red-600 dark:text-red-400">Not quite</span>
          </div>
          <div className="flex-1 grid grid-cols-2 divide-x divide-border/30">
            <div className="flex flex-col">
              <span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider px-4 pt-3 pb-1">Yours</span>
              <pre className="flex-1 font-mono text-sm px-4 pb-4 whitespace-pre-wrap text-foreground/90">
                {lineDiff
                  ? lineDiff.userLines.map((line: string, i: number) => (
                      <span key={i} className={cn(lineDiff.mismatches.includes(i) && "bg-red-500/15")}>
                        {line}
                        {i < lineDiff.userLines.length - 1 ? "\n" : ""}
                      </span>
                    ))
                  : userOutput}
              </pre>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider px-4 pt-3 pb-1">Expected</span>
              <pre
                className={cn(
                  "flex-1 font-mono text-sm px-4 pb-4 whitespace-pre-wrap",
                  revealed ? "text-foreground/90" : "text-foreground/90 blur-sm select-none"
                )}
              >
                {lineDiff
                  ? lineDiff.expectedLines.map((line: string, i: number) => (
                      <span
                        key={i}
                        className={cn(revealed && lineDiff.mismatches.includes(i) && "bg-amber-500/15")}
                      >
                        {line}
                        {i < lineDiff.expectedLines.length - 1 ? "\n" : ""}
                      </span>
                    ))
                  : problem.expected_output}
              </pre>
            </div>
          </div>
        </div>
      );
    }

    // Default empty state
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground/50">Submit your answer to see results</p>
      </div>
    );
  }

  /* ─── Expanded: editor only ─── */
  if (expandedPanel === "editor") {
    return (
      <div className="h-full flex flex-col gap-1.5">
        <div
          className="h-full flex flex-col bg-card rounded-lg border border-border shadow-sm overflow-hidden"
          onMouseEnter={() => setIsEditorHovered(true)}
          onMouseLeave={() => setIsEditorHovered(false)}
        >
          {renderEditorHeader({ shrinkable: true })}
          {renderEditorBody()}
        </div>
      </div>
    );
  }

  /* ─── Expanded: result only ─── */
  if (expandedPanel === "result") {
    return (
      <div className="h-full flex flex-col gap-1.5">
        <div className="h-full flex flex-col bg-card rounded-lg border border-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 h-11 border-b border-border/50 bg-muted/40 shrink-0">
            <span className="text-sm font-medium">Result</span>
            {onExpandResult && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onExpandResult}>
                <Shrink className="h-4 w-4" />
              </Button>
            )}
          </div>
          {renderResultBody()}
        </div>
      </div>
    );
  }

  /* ─── Default: two vertical panels ─── */
  return (
    <div className="h-full min-h-0 flex flex-col gap-1.5">
      <ResizablePanelGroup direction="vertical" className="flex-1 min-h-0">
        {/* Output Textarea Panel */}
        <ResizablePanel
          ref={editorPanelRef}
          defaultSize={92}
          minSize={20}
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
            {renderEditorHeader({ shrinkable: false })}
            {!isEditorPanelCollapsed && renderEditorBody()}
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Result Panel */}
        <ResizablePanel
          ref={resultPanelRef}
          defaultSize={8}
          minSize={10}
          collapsible
          collapsedSize={8}
          className="min-h-0"
          onCollapse={() => setIsResultPanelCollapsed(true)}
          onExpand={() => setIsResultPanelCollapsed(false)}
        >
          <div
            className="h-full flex flex-col bg-card rounded-lg border border-border shadow-sm overflow-hidden"
            onMouseEnter={() => setIsResultHovered(true)}
            onMouseLeave={() => setIsResultHovered(false)}
          >
            <div className="flex items-center justify-between px-4 h-11 border-b border-border/50 bg-muted/40 shrink-0">
              <span className="text-sm font-medium">Result</span>
              <div
                className={cn(
                  "flex items-center gap-0.5 transition-opacity",
                  isResultHovered || !isResultPanelCollapsed ? "opacity-100" : "opacity-0"
                )}
              >
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
            {!isResultPanelCollapsed && renderResultBody()}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
