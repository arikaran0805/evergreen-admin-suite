/**
 * PredictOutputProblemView
 * Learner-facing UI for Predict the Output problems.
 * Handles: typed answer, submit, result states, reveal logic.
 */
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Copy, Eye, ArrowRight, RotateCcw, ChevronDown, ChevronUp, Check, X, Lightbulb, ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { matchOutput, getLineDiff } from "@/lib/outputMatcher";
import { useSubmitPredictOutputAttempt, usePredictOutputAttempts } from "@/hooks/usePredictOutputAttempts";
import type { PredictOutputProblem } from "@/hooks/usePredictOutputProblems";
import { toast } from "sonner";

interface Props {
  problem: PredictOutputProblem;
  onNext?: () => void;
  backPath?: string;
}

const difficultyColor: Record<string, string> = {
  Easy: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  Medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  Hard: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

type ViewState = "answering" | "correct" | "incorrect";

export default function PredictOutputProblemView({ problem, onNext, backPath }: Props) {
  const navigate = useNavigate();
  const [userOutput, setUserOutput] = useState("");
  const [viewState, setViewState] = useState<ViewState>("answering");
  const [revealed, setRevealed] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [hintsShown, setHintsShown] = useState(0);
  const [startTime] = useState(Date.now());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: attempts = [] } = usePredictOutputAttempts(problem.id);
  const submitMutation = useSubmitPredictOutputAttempt();

  const attemptCount = attempts.length;
  const alreadySolved = attempts.some(a => a.is_correct);

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
        ? (problem.reveal_penalty === "half_xp" ? Math.floor(problem.xp_value / 2) : 0)
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
      // Continue showing result even if save fails (user might not be logged in)
    }

    setViewState(result.isCorrect ? "correct" : "incorrect");
  }, [userOutput, problem, revealed, attemptCount, startTime, submitMutation]);

  const handleReveal = useCallback(() => {
    setRevealed(true);
    // Record a reveal attempt
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

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(problem.code);
    toast.success("Code copied");
  }, [problem.code]);

  const lineDiff = useMemo(() => {
    if (viewState !== "incorrect") return null;
    return getLineDiff(userOutput, problem.expected_output);
  }, [viewState, userOutput, problem.expected_output]);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* Back button */}
      {backPath && (
        <Button variant="ghost" size="sm" onClick={() => navigate(backPath)} className="gap-1.5 -ml-2">
          <ArrowLeft className="h-4 w-4" />Back
        </Button>
      )}

      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-foreground">{problem.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={cn("text-xs", difficultyColor[problem.difficulty])}>{problem.difficulty}</Badge>
          <Badge variant="outline" className="text-xs capitalize">{problem.language}</Badge>
          {problem.tags.slice(0, 2).map(t => (
            <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
          ))}
          {problem.tags.length > 2 && <Badge variant="secondary" className="text-xs">+{problem.tags.length - 2}</Badge>}
        </div>
      </div>

      {/* Prompt */}
      {problem.prompt && <p className="text-muted-foreground">{problem.prompt}</p>}

      {/* Code Block */}
      <div className="relative group rounded-lg border border-border overflow-hidden">
        <div className="flex items-center justify-between bg-muted/50 px-3 py-1.5 border-b border-border">
          <span className="text-xs font-medium text-muted-foreground capitalize">{problem.language}</span>
          <button onClick={handleCopy} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <Copy className="h-3 w-3" />Copy
          </button>
        </div>
        <pre className="p-4 overflow-x-auto bg-background">
          <code className="text-sm font-mono text-foreground whitespace-pre">{problem.code}</code>
        </pre>
      </div>

      {/* Result States */}
      {viewState === "correct" && (
        <CorrectResult
          userOutput={userOutput}
          expectedOutput={problem.expected_output}
          problem={problem}
          showExplanation={showExplanation}
          setShowExplanation={setShowExplanation}
          onNext={onNext}
        />
      )}

      {viewState === "incorrect" && (
        <IncorrectResult
          userOutput={userOutput}
          expectedOutput={problem.expected_output}
          revealed={revealed}
          canReveal={canReveal}
          lineDiff={lineDiff}
          onReveal={handleReveal}
          onTryAgain={handleTryAgain}
          problem={problem}
          showExplanation={showExplanation}
          setShowExplanation={setShowExplanation}
        />
      )}

      {/* Input Area (shown when answering) */}
      {viewState === "answering" && (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Your Output</label>
            <Textarea
              ref={textareaRef}
              value={userOutput}
              onChange={e => setUserOutput(e.target.value)}
              placeholder="Type the exact output of the above code"
              className="font-mono text-sm min-h-[100px]"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Match line breaks and spacing as shown in output
            </p>
          </div>

          {/* Hints */}
          {problem.hints.length > 0 && hintsShown < problem.hints.length && (
            <div className="space-y-2">
              {problem.hints.slice(0, hintsShown).map((hint, i) => (
                <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30">
                  <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-900 dark:text-amber-200">{hint}</p>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={() => setHintsShown(h => h + 1)} className="text-amber-600 gap-1.5">
                <Lightbulb className="h-4 w-4" />Show hint ({hintsShown + 1}/{problem.hints.length})
              </Button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Button onClick={handleSubmit} disabled={!userOutput.trim() || submitMutation.isPending} className="flex-1">
              {submitMutation.isPending ? "Checking..." : "Submit Answer"}
            </Button>
            {canReveal && !revealed && (
              <Button variant="outline" onClick={handleReveal} className="gap-1.5">
                <Eye className="h-4 w-4" />Reveal
              </Button>
            )}
          </div>

          {/* Revealed output (if revealed before submit) */}
          {revealed && (
            <Card className="border-amber-200 dark:border-amber-800/30">
              <CardContent className="pt-4">
                <p className="text-xs text-amber-600 font-medium mb-2">Expected Output (revealed)</p>
                <pre className="font-mono text-sm bg-muted/50 p-3 rounded">{problem.expected_output}</pre>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ─── Correct Result ──────────────────────────
function CorrectResult({ userOutput, expectedOutput, problem, showExplanation, setShowExplanation, onNext }: any) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-4 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30">
        <Check className="h-5 w-5 text-green-600" />
        <span className="font-semibold text-green-800 dark:text-green-300">Correct 🎉</span>
        {problem.xp_value > 0 && <Badge className="ml-auto bg-green-100 text-green-800">+{problem.xp_value} XP</Badge>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Your Output</p>
          <pre className="font-mono text-sm bg-green-50 dark:bg-green-900/10 p-3 rounded border border-green-200 dark:border-green-800/30 whitespace-pre-wrap">{userOutput}</pre>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Expected Output</p>
          <pre className="font-mono text-sm bg-muted/50 p-3 rounded border border-border whitespace-pre-wrap">{expectedOutput}</pre>
        </div>
      </div>

      {/* Explanation Toggle */}
      {problem.explanation && (
        <ExplanationSection problem={problem} show={showExplanation} setShow={setShowExplanation} />
      )}

      {onNext && (
        <Button onClick={onNext} className="w-full gap-2">
          Next Problem <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

// ─── Incorrect Result ──────────────────────────
function IncorrectResult({ userOutput, expectedOutput, revealed, canReveal, lineDiff, onReveal, onTryAgain, problem, showExplanation, setShowExplanation }: any) {
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
            {lineDiff ? lineDiff.userLines.map((line: string, i: number) => (
              <span key={i} className={cn(lineDiff.mismatches.includes(i) && "bg-red-200 dark:bg-red-800/40")}>
                {line}{i < lineDiff.userLines.length - 1 ? "\n" : ""}
              </span>
            )) : userOutput}
          </pre>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Expected Output</p>
          <pre className={cn(
            "font-mono text-sm p-3 rounded border whitespace-pre-wrap",
            revealed ? "bg-muted/50 border-border" : "bg-muted/50 border-border blur-sm select-none"
          )}>
            {lineDiff ? lineDiff.expectedLines.map((line: string, i: number) => (
              <span key={i} className={cn(revealed && lineDiff.mismatches.includes(i) && "bg-amber-200 dark:bg-amber-800/40")}>
                {line}{i < lineDiff.expectedLines.length - 1 ? "\n" : ""}
              </span>
            )) : expectedOutput}
          </pre>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={onTryAgain} className="flex-1 gap-1.5">
          <RotateCcw className="h-4 w-4" />Try Again
        </Button>
        {canReveal && !revealed && (
          <Button variant="outline" onClick={onReveal} className="flex-1 gap-1.5">
            <Eye className="h-4 w-4" />Reveal Output
          </Button>
        )}
      </div>

      {/* Explanation (only if revealed) */}
      {revealed && problem.explanation && (
        <ExplanationSection problem={problem} show={showExplanation} setShow={setShowExplanation} />
      )}
    </div>
  );
}

// ─── Explanation Section ──────────────────────────
function ExplanationSection({ problem, show, setShow }: { problem: PredictOutputProblem; show: boolean; setShow: (s: boolean) => void }) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setShow(!show)}
        className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <span className="text-sm font-medium">Explanation</span>
        {show ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {show && (
        <div className="p-4 space-y-4">
          <p className="text-sm text-foreground whitespace-pre-wrap">{problem.explanation}</p>

          {problem.step_by_step.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Step-by-Step</p>
              <ol className="list-decimal list-inside space-y-1">
                {problem.step_by_step.map((s: string, i: number) => (
                  <li key={i} className="text-sm text-foreground">{s}</li>
                ))}
              </ol>
            </div>
          )}

          {problem.common_mistakes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Common Mistakes</p>
              <ul className="list-disc list-inside space-y-1">
                {problem.common_mistakes.map((m: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground">{m}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
