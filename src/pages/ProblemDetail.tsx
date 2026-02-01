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
import { ProblemDescriptionPanel } from "@/components/practice/ProblemDescriptionPanel";
import { ProblemWorkspace } from "@/components/practice/ProblemWorkspace";
import { ProblemListDrawer } from "@/components/practice/ProblemListDrawer";
import { TestResult } from "@/components/practice/TestCasePanel";
import { usePublishedPracticeProblem, usePublishedPracticeProblems } from "@/hooks/usePracticeProblems";
import { useCodeJudge, convertTestCasesToJudgeFormat, getVerdictDisplay } from "@/hooks/useCodeJudge";
import { useQuery } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Function signature types
interface FunctionSignatureObj {
  name: string;
  parameters?: { name: string; type: string }[];
  return_type?: string;
}

type FunctionSignature = string | FunctionSignatureObj | null;

function getFunctionName(signature: FunctionSignature): string {
  if (!signature) return 'solution';
  if (typeof signature === 'object' && 'name' in signature) {
    return signature.name;
  }
  if (typeof signature === 'string') {
    const funcMatch = signature.match(/^(\w+)\s*\(/);
    return funcMatch ? funcMatch[1] : 'solution';
  }
  return 'solution';
}

function getParameterNames(signature: FunctionSignature): string[] {
  if (!signature) return [];
  if (typeof signature === 'object' && 'parameters' in signature && Array.isArray(signature.parameters)) {
    return signature.parameters.map(p => p.name);
  }
  if (typeof signature === 'string') {
    const match = signature.match(/\(([^)]*)\)/);
    if (!match) return [];
    return match[1].split(',').map(arg => arg.trim().split(/[:\s]/)[0]).filter(Boolean);
  }
  return [];
}

export default function ProblemDetail() {
  const { skillId, problemId } = useParams<{ skillId: string; problemId: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [output, setOutput] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  const { judge } = useCodeJudge();

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

  // Fetch all problems in this skill
  const { data: allProblemsInSkill = [] } = usePublishedPracticeProblems(skillId);

  // Fetch problem from database
  const { data: dbProblem, isLoading } = usePublishedPracticeProblem(skillId, problemId);

  // Convert database problem to display format
  const allTestCases = dbProblem?.test_cases || [];
  const visibleTestCases = allTestCases.filter((tc: any) => tc.is_visible);
  
  const functionSignature = (dbProblem as any)?.function_signature || null;
  const functionName = getFunctionName(functionSignature);
  const parameterNames = getParameterNames(functionSignature);
  
  const problem = dbProblem ? {
    id: dbProblem.id,
    title: dbProblem.title,
    difficulty: dbProblem.difficulty,
    description: dbProblem.description || "",
    examples: (dbProblem.examples || []).map((ex: any, i: number) => ({
      id: i + 1,
      input: ex.input || "",
      output: ex.output || "",
      explanation: ex.explanation,
    })),
    constraints: dbProblem.constraints || [],
    hints: dbProblem.hints || [],
    starterCode: dbProblem.starter_code || {},
    supportedLanguages: dbProblem.supported_languages || [],
    functionSignature,
    testCases: visibleTestCases.map((tc: any, i: number) => ({
      id: tc.id || i + 1,
      input: tc.input || "",
      expected: tc.expected_output || "",
    })),
    allTestCases: allTestCases.map((tc: any, i: number) => ({
      id: tc.id || i + 1,
      input: tc.input || "",
      expected: tc.expected_output || "",
      isVisible: tc.is_visible ?? true,
    })),
  } : null;

  // RUN: Execute code against visible test cases
  const handleRun = async (code: string, language: string) => {
    if (!problem) return;
    
    setIsRunning(true);
    setResults([]);
    setOutput(`Running ${language}...\n`);
    
    try {
      const judgeTestCases = convertTestCasesToJudgeFormat(
        problem.testCases.map(tc => ({
          id: tc.id,
          input: tc.input,
          expected_output: tc.expected,
          is_visible: true
        })),
        parameterNames
      );

      const judgeResult = await judge({
        code,
        language,
        function_name: functionName,
        parameter_names: parameterNames,
        test_cases: judgeTestCases,
        time_limit_ms: 5000
      });

      const testResults: TestResult[] = judgeResult.test_results.map((tr, i) => ({
        id: i,
        input: problem.testCases[i]?.input || '',
        expected: JSON.stringify(tr.expected_output),
        actual: tr.error || JSON.stringify(tr.actual_output) || "No output",
        passed: tr.passed,
        runtime: tr.passed ? `${tr.runtime_ms || 0}ms` : undefined,
      }));

      const verdictDisplay = getVerdictDisplay(judgeResult.verdict);
      let outputLog = `Running ${language}...\n\n`;
      
      testResults.forEach((tr, i) => {
        outputLog += `Test ${i + 1}: ${tr.passed ? '✓ Passed' : '✗ Failed'}`;
        if (tr.runtime) outputLog += ` (${tr.runtime})`;
        outputLog += '\n';
      });

      outputLog += `\n${judgeResult.passed_count}/${judgeResult.total_count} test cases passed`;
      outputLog += `\nTotal Runtime: ${judgeResult.total_runtime_ms}ms`;
      outputLog += `\nVerdict: ${verdictDisplay.label}`;

      if (judgeResult.error) {
        outputLog += `\n\n❌ Error: ${judgeResult.error}`;
      }

      setResults(testResults);
      setOutput(outputLog);

      if (judgeResult.verdict === 'accepted') {
        toast.success("All visible test cases passed!");
      } else if (judgeResult.verdict === 'compilation_error') {
        toast.error("Compilation Error", { description: judgeResult.error?.substring(0, 100) });
      } else if (judgeResult.verdict === 'runtime_error') {
        toast.error("Runtime Error", { description: judgeResult.error?.substring(0, 100) });
      } else if (judgeResult.verdict === 'time_limit_exceeded') {
        toast.error("Time Limit Exceeded");
      } else {
        toast.error(`${judgeResult.total_count - judgeResult.passed_count} test case(s) failed`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Execution failed";
      setOutput(`Running ${language}...\n\n❌ Error: ${errorMsg}`);
      toast.error("Execution Failed", { description: errorMsg });
    }
    
    setIsRunning(false);
  };

  // SUBMIT: Execute code against ALL test cases
  const handleSubmit = async (code: string, language: string) => {
    if (!problem) return;
    
    setIsRunning(true);
    setResults([]);
    setOutput(`Submitting ${language}...\n`);
    
    try {
      const judgeTestCases = convertTestCasesToJudgeFormat(
        problem.allTestCases.map(tc => ({
          id: tc.id,
          input: tc.input,
          expected_output: tc.expected,
          is_visible: tc.isVisible
        })),
        parameterNames
      );

      const judgeResult = await judge({
        code,
        language,
        function_name: functionName,
        parameter_names: parameterNames,
        test_cases: judgeTestCases,
        time_limit_ms: 5000
      });

      const visibleResults = judgeResult.test_results.filter(tr => tr.is_visible);
      const testResults: TestResult[] = visibleResults.map((tr, i) => {
        const originalTc = problem.testCases[i];
        return {
          id: i,
          input: originalTc?.input || '',
          expected: JSON.stringify(tr.expected_output),
          actual: tr.error || JSON.stringify(tr.actual_output) || "No output",
          passed: tr.passed,
          runtime: tr.passed ? `${tr.runtime_ms || 0}ms` : undefined,
        };
      });

      const verdictDisplay = getVerdictDisplay(judgeResult.verdict);
      const hiddenCount = problem.allTestCases.filter(tc => !tc.isVisible).length;
      const visibleCount = problem.allTestCases.length - hiddenCount;
      
      let outputLog = `Submitting ${language}...\n\n`;
      outputLog += `Total test cases: ${judgeResult.total_count} (${visibleCount} visible, ${hiddenCount} hidden)\n`;
      outputLog += `Passed: ${judgeResult.passed_count}/${judgeResult.total_count}\n`;
      outputLog += `Total Runtime: ${judgeResult.total_runtime_ms}ms\n`;
      outputLog += `\nVerdict: ${verdictDisplay.label}`;

      if (judgeResult.error) {
        outputLog += `\n\n❌ Error: ${judgeResult.error}`;
      }

      setResults(testResults);
      setOutput(outputLog);

      if (judgeResult.verdict === 'accepted') {
        toast.success("🎉 Accepted!", {
          description: `All ${judgeResult.total_count} test cases passed in ${judgeResult.total_runtime_ms}ms`,
        });
      } else if (judgeResult.verdict === 'compilation_error') {
        toast.error("Compilation Error", { description: "Fix errors before submitting" });
      } else if (judgeResult.verdict === 'runtime_error') {
        toast.error("Runtime Error", { description: judgeResult.error?.substring(0, 100) });
      } else if (judgeResult.verdict === 'time_limit_exceeded') {
        toast.error("Time Limit Exceeded");
      } else {
        const failedIndex = judgeResult.test_results.findIndex(tr => !tr.passed);
        const failedIsHidden = failedIndex >= 0 && !judgeResult.test_results[failedIndex].is_visible;
        toast.error("Wrong Answer", {
          description: `Failed on test case ${failedIndex + 1}/${judgeResult.total_count}${failedIsHidden ? " (hidden)" : ""}`,
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Submission failed";
      setOutput(`Submitting ${language}...\n\n❌ Error: ${errorMsg}`);
      toast.error("Submission Failed", { description: errorMsg });
    }
    
    setIsRunning(false);
  };

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

  if (!problem) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <div className="h-12 flex items-center px-4 border-b border-border/50 bg-card">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/practice/${skillId}`)}>
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

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Problem List Drawer */}
      <ProblemListDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        skillName={skill?.name || "Problems"}
        problems={allProblemsInSkill}
        currentProblemSlug={problemId}
        onSelectProblem={(slug) => navigate(`/practice/${skillId}/problem/${slug}`)}
      />

      {/* Top Navigation Bar */}
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
          
          {/* Skill Name - clickable to open drawer */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <List className="h-3.5 w-3.5" />
            <span>{skill?.name || "Problems"}</span>
          </button>

          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium px-2">{problem.title}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Three Panel Layout */}
      <div className="flex-1 min-h-0 overflow-hidden bg-muted/30">
        {isMobile ? (
          // Mobile: Stack vertically
          <div className="h-full flex flex-col overflow-auto p-2 gap-2">
            <div className="min-h-[50vh] bg-card rounded-lg border border-border shadow-sm overflow-hidden">
              <ProblemDescriptionPanel
                title={problem.title}
                difficulty={problem.difficulty}
                description={problem.description}
                examples={problem.examples}
                constraints={problem.constraints}
                hints={problem.hints}
              />
            </div>
            <div className="flex-1 min-h-[50vh]">
              <ProblemWorkspace
                starterCode={problem.starterCode}
                supportedLanguages={problem.supportedLanguages}
                testCases={problem.testCases}
                onRun={handleRun}
                onSubmit={handleSubmit}
                results={results}
                isRunning={isRunning}
                output={output}
              />
            </div>
          </div>
        ) : (
          // Desktop: Horizontal split with padding
          <div className="h-full p-2">
            <ResizablePanelGroup direction="horizontal" className="h-full">
              {/* Left Panel - Problem Description */}
              <ResizablePanel defaultSize={45} minSize={25} className="min-h-0">
                <div className="h-full bg-card rounded-lg border border-border shadow-sm overflow-hidden">
                  <ProblemDescriptionPanel
                    title={problem.title}
                    difficulty={problem.difficulty}
                    description={problem.description}
                    examples={problem.examples}
                    constraints={problem.constraints}
                    hints={problem.hints}
                  />
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle className="mx-1 bg-transparent data-[panel-group-direction=horizontal]:w-2" />

              {/* Right Panel - Code Editor + Test Cases */}
              <ResizablePanel defaultSize={55} minSize={30} className="min-h-0">
                <ProblemWorkspace
                  starterCode={problem.starterCode}
                  supportedLanguages={problem.supportedLanguages}
                  testCases={problem.testCases}
                  onRun={handleRun}
                  onSubmit={handleSubmit}
                  results={results}
                  isRunning={isRunning}
                  output={output}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        )}
      </div>
    </div>
  );
}
