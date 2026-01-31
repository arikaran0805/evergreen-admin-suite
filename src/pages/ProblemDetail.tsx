import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import type { ImperativePanelHandle } from "react-resizable-panels";
import { ProblemDescription } from "@/components/practice/ProblemDescription";
import { CodeEditor } from "@/components/practice/CodeEditor";
import { TestCasePanel, TestResult } from "@/components/practice/TestCasePanel";
import { usePublishedPracticeProblem } from "@/hooks/usePracticeProblems";
import { toast } from "sonner";

export default function ProblemDetail() {
  const { skillId, problemId } = useParams<{ skillId: string; problemId: string }>();
  const navigate = useNavigate();
  const testPanelRef = useRef<ImperativePanelHandle>(null);
  
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [output, setOutput] = useState("");

  // Fetch problem from database
  const { data: dbProblem, isLoading } = usePublishedPracticeProblem(skillId, problemId);

  // Convert database problem to display format
  // test_cases from DB have { id, input, expected_output, is_visible }
  const allTestCases = dbProblem?.test_cases || [];
  const visibleTestCases = allTestCases.filter((tc: any) => tc.is_visible);
  
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
    // Visible test cases for UI display
    testCases: visibleTestCases.map((tc: any, i: number) => ({
      id: tc.id || i + 1,
      input: tc.input || "",
      expected: tc.expected_output || "",
    })),
    // All test cases for submit
    allTestCases: allTestCases.map((tc: any, i: number) => ({
      id: tc.id || i + 1,
      input: tc.input || "",
      expected: tc.expected_output || "",
      isVisible: tc.is_visible ?? true,
    })),
  } : null;

  // Check if code is essentially unimplemented (starter code)
  const isCodeUnimplemented = (code: string): boolean => {
    const unimplementedPatterns = [
      /pass\s*$/m,                    // Python pass statement
      /\/\/\s*Write your code here/i, // JS/TS comment
      /#\s*Write your code here/i,    // Python comment
      /throw\s+new\s+Error/i,         // Throwing not implemented
      /return\s*;?\s*$/m,             // Empty return
      /^\s*$/,                         // Empty or whitespace only
    ];
    
    // Check if code matches starter code patterns
    const trimmedCode = code.trim();
    if (trimmedCode.length < 50) return true; // Very short code likely unimplemented
    
    return unimplementedPatterns.some(pattern => pattern.test(code));
  };

  // RUN: Only executes visible test cases (shown to learner)
  const handleRun = async (code: string, language: string) => {
    if (!problem) return;
    
    // Expand the test panel when running
    testPanelRef.current?.resize(35);
    
    setIsRunning(true);
    setResults([]);
    setOutput("");
    
    // Simulate running visible tests only
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const isUnimplemented = isCodeUnimplemented(code);
    
    // Mock results for visible test cases only
    const mockResults: TestResult[] = problem.testCases.map((tc: any, i: number) => ({
      id: i,
      input: tc.input,
      expected: tc.expected,
      actual: isUnimplemented ? "No output (code not implemented)" : tc.expected,
      passed: isUnimplemented ? false : true,
      runtime: isUnimplemented ? undefined : `${Math.floor(Math.random() * 50 + 10)}ms`,
    }));
    
    setResults(mockResults);
    setOutput(isUnimplemented 
      ? `Running ${language}...\n\n⚠️ Your code appears to be unimplemented.\nPlease write your solution before running.`
      : `Running ${language}...\n\nVisible test cases executed: ${mockResults.length}\nPassed: ${mockResults.filter(r => r.passed).length}`
    );
    setIsRunning(false);
    
    if (mockResults.every(r => r.passed)) {
      toast.success("All visible test cases passed!");
    } else {
      toast.error(isUnimplemented ? "Code not implemented" : "Some test cases failed");
    }
  };

  // SUBMIT: Executes ALL test cases (visible + hidden)
  const handleSubmit = async (code: string, language: string) => {
    if (!problem) return;
    
    // Expand the test panel when submitting
    testPanelRef.current?.resize(35);
    
    setIsRunning(true);
    setResults([]);
    setOutput("");
    
    // Simulate submission - runs ALL test cases
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const isUnimplemented = isCodeUnimplemented(code);
    const totalTestCases = problem.allTestCases.length;
    const hiddenCount = problem.allTestCases.filter((tc: any) => !tc.isVisible).length;
    const visibleCount = totalTestCases - hiddenCount;
    
    if (isUnimplemented) {
      setOutput(`Submitting ${language}...\n\n⚠️ Submission rejected.\nYour code appears to be unimplemented.\nPlease write your solution before submitting.`);
      toast.error("Submission Failed", {
        description: "Please implement your solution before submitting.",
      });
      setIsRunning(false);
      return;
    }
    
    // Mock: For demo, pass all tests if code is implemented
    setOutput(`Submitting ${language}...\n\nTotal test cases: ${totalTestCases} (${visibleCount} visible, ${hiddenCount} hidden)\nPassed: ${totalTestCases}/${totalTestCases}`);
    
    toast.success("Accepted! Your solution passed all test cases.", {
      description: `Runtime: ${Math.floor(Math.random() * 50 + 30)}ms, Memory: ${(Math.random() * 20 + 30).toFixed(1)}MB`,
    });
    
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
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium px-2">{problem.title}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Left Panel - Problem Description */}
          <ResizablePanel defaultSize={40} minSize={25} className="min-h-0">
            <ProblemDescription problem={problem} />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Panel - Code Editor + Test Cases */}
          <ResizablePanel defaultSize={60} minSize={35} className="min-h-0">
            <ResizablePanelGroup direction="vertical">
              {/* Code Editor */}
              <ResizablePanel defaultSize={95} minSize={20} className="min-h-0">
                <CodeEditor
                  problem={problem}
                  supportedLanguages={problem.supportedLanguages}
                  onRun={handleRun}
                  onSubmit={handleSubmit}
                />
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Test Case Panel - collapsed by default, expands on Run/Submit */}
              <ResizablePanel ref={testPanelRef} defaultSize={5} minSize={5} className="min-h-0">
                <TestCasePanel
                  testCases={problem.testCases}
                  results={results}
                  isRunning={isRunning}
                  output={output}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
