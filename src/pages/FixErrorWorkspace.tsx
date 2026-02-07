/**
 * FixErrorWorkspace
 *
 * Learner-facing workspace for "Fix the Error" problems.
 *
 * Layout:
 *   TOP ROW — split horizontal: Problem (left) | Code Editor (right)
 *   BOTTOM ROW — full width: Result / Feedback
 */
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { usePublishedFixErrorProblem } from "@/hooks/useFixErrorProblemBySlug";
import { usePublishedPracticeProblems, type ProblemWithMapping } from "@/hooks/usePracticeProblems";
import { ProblemListDrawer } from "@/components/practice/ProblemListDrawer";
import { FixErrorDescriptionPanel } from "@/components/fix-error/FixErrorDescriptionPanel";
import { FixErrorCodeEditor } from "@/components/fix-error/FixErrorCodeEditor";
import {
  FixErrorResultPanel,
  type FixErrorVerdict,
  type FixErrorTestResult,
} from "@/components/fix-error/FixErrorResultPanel";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type ExpandedPanel = "description" | "editor" | "result" | null;

export default function FixErrorWorkspace() {
  const { skillId, slug } = useParams<{ skillId: string; slug: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedPanel, setExpandedPanel] = useState<ExpandedPanel>(null);

  // Result state
  const [verdict, setVerdict] = useState<FixErrorVerdict>("idle");
  const [error, setError] = useState<string | undefined>();
  const [testResults, setTestResults] = useState<FixErrorTestResult[]>([]);

  // Fetch skill info
  const { data: skill } = useQuery({
    queryKey: ["practice-skill-by-slug", skillId],
    queryFn: async () => {
      if (!skillId) return null;
      const { data, error } = await supabase
        .from("practice_skills")
        .select("id, name, slug")
        .eq("slug", skillId)
        .eq("status", "published")
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!skillId,
  });

  const { data: allProblemsInSkill = [] } = usePublishedPracticeProblems(skillId);
  const { data: problem, isLoading } = usePublishedFixErrorProblem(slug);

  // Panel expand handlers
  const handleExpandDescription = () =>
    setExpandedPanel(expandedPanel === "description" ? null : "description");
  const handleExpandEditor = () =>
    setExpandedPanel(expandedPanel === "editor" ? null : "editor");
  const handleExpandResult = () =>
    setExpandedPanel(expandedPanel === "result" ? null : "result");

  // Navigation
  const currentIndex = allProblemsInSkill.findIndex((p) => p.slug === slug);
  const prevProblem = currentIndex > 0 ? allProblemsInSkill[currentIndex - 1] : null;
  const nextProblem =
    currentIndex < allProblemsInSkill.length - 1
      ? allProblemsInSkill[currentIndex + 1]
      : null;

  const navigateToProblem = (p: ProblemWithMapping) => {
    if (p.problemType === "predict-output") {
      navigate(`/practice/${skillId}/predict/${p.slug}`);
    } else if (p.problemType === "fix-error") {
      navigate(`/practice/${skillId}/fix-error/${p.slug}`);
    } else {
      navigate(`/practice/${skillId}/problem/${p.slug}`);
    }
  };

  const handlePrevProblem = () => {
    if (prevProblem) navigateToProblem(prevProblem);
  };
  const handleNextProblem = () => {
    if (nextProblem) navigateToProblem(nextProblem);
  };

  const handleDrawerSelectProblem = (
    problemSlug: string,
    problemType?: string
  ) => {
    if (problemType === "predict-output") {
      navigate(`/practice/${skillId}/predict/${problemSlug}`);
    } else if (problemType === "fix-error") {
      navigate(`/practice/${skillId}/fix-error/${problemSlug}`);
    } else {
      navigate(`/practice/${skillId}/problem/${problemSlug}`);
    }
  };

  // ==================
  // Execution Logic
  // ==================
  const executeCode = async (code: string, mode: "run" | "submit") => {
    if (!problem) return;
    setVerdict("running");
    setError(undefined);
    setTestResults([]);

    try {
      if (problem.validation_type === "output_comparison") {
        // Use execute-code edge function, compare output
        const { data, error: fnError } = await supabase.functions.invoke(
          "execute-code",
          {
            body: { code, language: problem.language },
          }
        );

        if (fnError) {
          setVerdict("runtime_error");
          setError(fnError.message);
          return;
        }

        const output = (data?.output || "").trim();
        const expected = (problem.expected_output || "").trim();

        if (data?.error) {
          setVerdict("runtime_error");
          setError(data.error);
          return;
        }

        if (output === expected) {
          setVerdict("accepted");
        } else {
          setVerdict("wrong_answer");
          setTestResults([
            {
              id: 0,
              input: "(full program)",
              expected,
              actual: output,
              passed: false,
            },
          ]);
        }
      } else if (problem.validation_type === "test_cases") {
        // Run each test case
        const results: FixErrorTestResult[] = [];
        let allPassed = true;
        let executionError: string | undefined;

        for (let i = 0; i < problem.test_cases.length; i++) {
          const tc = problem.test_cases[i];
          // Build the code with test input
          const fullCode = `${code}\n\n# Test\n${tc.input}`;

          const { data, error: fnError } = await supabase.functions.invoke(
            "execute-code",
            {
              body: { code: fullCode, language: problem.language },
            }
          );

          if (fnError) {
            executionError = fnError.message;
            allPassed = false;
            break;
          }

          if (data?.error) {
            executionError = data.error;
            allPassed = false;
            break;
          }

          const output = (data?.output || "").trim();
          const expected = (tc.expected_output || "").trim();
          const passed = output === expected;
          if (!passed) allPassed = false;

          results.push({
            id: i,
            input: tc.input,
            expected,
            actual: output,
            passed,
          });

          // In run mode stop at first failure for faster feedback
          if (mode === "run" && !passed) break;
        }

        if (executionError) {
          setVerdict("runtime_error");
          setError(executionError);
        } else if (allPassed) {
          setVerdict("accepted");
        } else {
          setVerdict("wrong_answer");
        }
        setTestResults(results);
      } else {
        // Custom validator - just execute and check no errors
        const { data, error: fnError } = await supabase.functions.invoke(
          "execute-code",
          {
            body: { code, language: problem.language },
          }
        );

        if (fnError || data?.error) {
          setVerdict("runtime_error");
          setError(fnError?.message || data?.error);
          return;
        }

        setVerdict("accepted");
      }
    } catch (err) {
      setVerdict("runtime_error");
      setError(err instanceof Error ? err.message : "Execution failed");
    }
  };

  const handleRun = (code: string) => executeCode(code, "run");
  const handleSubmit = (code: string) => executeCode(code, "submit");

  // Loading
  if (isLoading) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <div className="h-12 flex items-center px-4 border-b border-border/50 bg-card">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-6 w-32 ml-4" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Not found
  if (!problem) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <div className="h-12 flex items-center px-4 border-b border-border/50 bg-card">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/practice/${skillId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
          <p>Problem not found</p>
          <Button variant="link" onClick={() => navigate(`/practice/${skillId}`)}>
            Back to problem list
          </Button>
        </div>
      </div>
    );
  }

  // Top nav bar
  const topNav = (
    <div className="h-12 flex items-center px-4 border-b border-border/50 bg-card shrink-0">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => navigate(`/practice/${skillId}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <List className="h-3.5 w-3.5" />
          <span>{skill?.name || "Problems"}</span>
        </button>
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handlePrevProblem}
            disabled={!prevProblem}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium px-2">{problem.title}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleNextProblem}
            disabled={!nextProblem}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  // Expanded panel views
  if (expandedPanel) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <ProblemListDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          skillName={skill?.name || "Problems"}
          problems={allProblemsInSkill}
          currentProblemSlug={slug}
          onSelectProblem={handleDrawerSelectProblem}
        />
        {topNav}
        <div className="flex-1 min-h-0 overflow-hidden bg-muted/30 p-1.5">
          {expandedPanel === "description" && (
            <div className="h-full bg-card rounded-lg border border-border shadow-sm overflow-hidden">
              <FixErrorDescriptionPanel
                problem={problem}
                isExpanded
                onToggleExpand={handleExpandDescription}
              />
            </div>
          )}
          {expandedPanel === "editor" && (
            <div className="h-full bg-card rounded-lg border border-border shadow-sm overflow-hidden">
              <FixErrorCodeEditor
                initialCode={problem.buggy_code}
                language={problem.language}
                onRun={handleRun}
                onSubmit={handleSubmit}
                isRunning={verdict === "running"}
                isExpanded
                onToggleExpand={handleExpandEditor}
              />
            </div>
          )}
          {expandedPanel === "result" && (
            <div className="h-full bg-card rounded-lg border border-border shadow-sm overflow-hidden">
              <FixErrorResultPanel
                verdict={verdict}
                error={error}
                testResults={testResults}
                successMessage={problem.success_message}
                failureMessage={problem.failure_message}
                isExpanded
                onToggleExpand={handleExpandResult}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div key={problem.id} className="h-screen flex flex-col bg-background">
      <ProblemListDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        skillName={skill?.name || "Problems"}
        problems={allProblemsInSkill}
        currentProblemSlug={slug}
        onSelectProblem={handleDrawerSelectProblem}
      />
      {topNav}

      {/* Main Content - 3-panel layout: Left (Description) | Right-Top (Editor) / Right-Bottom (Result) */}
      <div className="flex-1 min-h-0 overflow-hidden bg-muted/30">
        {isMobile ? (
          <div className="h-full flex flex-col overflow-auto p-1.5 gap-1.5">
            <div className="min-h-[25vh] bg-card rounded-lg border border-border shadow-sm overflow-hidden">
              <FixErrorDescriptionPanel
                problem={problem}
                onToggleExpand={handleExpandDescription}
              />
            </div>
            <div className="min-h-[40vh] bg-card rounded-lg border border-border shadow-sm overflow-hidden">
              <FixErrorCodeEditor
                initialCode={problem.buggy_code}
                language={problem.language}
                onRun={handleRun}
                onSubmit={handleSubmit}
                isRunning={verdict === "running"}
                onToggleExpand={handleExpandEditor}
              />
            </div>
            <div className="min-h-[25vh] bg-card rounded-lg border border-border shadow-sm overflow-hidden">
              <FixErrorResultPanel
                verdict={verdict}
                error={error}
                testResults={testResults}
                successMessage={problem.success_message}
                failureMessage={problem.failure_message}
                onToggleExpand={handleExpandResult}
              />
            </div>
          </div>
        ) : (
          <div className="h-full p-1.5">
            <ResizablePanelGroup direction="horizontal" className="h-full">
              {/* LEFT: Problem Description */}
              <ResizablePanel defaultSize={35} minSize={20} className="min-h-0">
                <div className="h-full bg-card rounded-lg border border-border shadow-sm overflow-hidden">
                  <FixErrorDescriptionPanel
                    problem={problem}
                    onToggleExpand={handleExpandDescription}
                  />
                </div>
              </ResizablePanel>

              <ResizableHandle />

              {/* RIGHT: Editor (top) + Result (bottom) */}
              <ResizablePanel defaultSize={65} minSize={30} className="min-h-0">
                <ResizablePanelGroup direction="vertical" className="h-full">
                  {/* Code Editor */}
                  <ResizablePanel defaultSize={60} minSize={25} className="min-h-0">
                    <div className="h-full bg-card rounded-lg border border-border shadow-sm overflow-hidden">
                      <FixErrorCodeEditor
                        initialCode={problem.buggy_code}
                        language={problem.language}
                        onRun={handleRun}
                        onSubmit={handleSubmit}
                        isRunning={verdict === "running"}
                        onToggleExpand={handleExpandEditor}
                      />
                    </div>
                  </ResizablePanel>

                  <ResizableHandle />

                  {/* Result / Feedback */}
                  <ResizablePanel defaultSize={40} minSize={15} className="min-h-0">
                    <div className="h-full bg-card rounded-lg border border-border shadow-sm overflow-hidden">
                      <FixErrorResultPanel
                        verdict={verdict}
                        error={error}
                        testResults={testResults}
                        successMessage={problem.success_message}
                        failureMessage={problem.failure_message}
                        onToggleExpand={handleExpandResult}
                      />
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        )}
      </div>
    </div>
  );
}
