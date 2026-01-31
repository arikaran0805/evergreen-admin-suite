import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, List, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ProblemDescription } from "@/components/practice/ProblemDescription";
import { CodeEditor } from "@/components/practice/CodeEditor";
import { TestCasePanel, TestResult } from "@/components/practice/TestCasePanel";
import { usePublishedPracticeProblem } from "@/hooks/usePracticeProblems";
import { toast } from "sonner";

export default function ProblemDetail() {
  const { skillId, problemId } = useParams<{ skillId: string; problemId: string }>();
  const navigate = useNavigate();
  
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [output, setOutput] = useState("");

  // Fetch problem from database
  const { data: dbProblem, isLoading } = usePublishedPracticeProblem(skillId, problemId);

  // Convert database problem to display format
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
    testCases: (dbProblem.examples || []).map((ex: any, i: number) => ({
      id: i + 1,
      input: ex.input || "",
      expected: ex.output || "",
    })),
  } : null;

  const handleRun = async (code: string, language: string) => {
    if (!problem) return;
    
    setIsRunning(true);
    setResults([]);
    setOutput("");
    
    // Simulate running tests
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock results
    const mockResults: TestResult[] = problem.testCases.map((tc: any, i: number) => ({
      id: i,
      input: tc.input,
      expected: tc.expected,
      actual: i === 0 ? tc.expected : (Math.random() > 0.5 ? tc.expected : "Wrong answer"),
      passed: i === 0 ? true : Math.random() > 0.3,
      runtime: `${Math.floor(Math.random() * 50 + 10)}ms`,
    }));
    
    setResults(mockResults);
    setOutput(`Running ${language}...\n\nTest cases executed: ${mockResults.length}\nPassed: ${mockResults.filter(r => r.passed).length}`);
    setIsRunning(false);
    
    if (mockResults.every(r => r.passed)) {
      toast.success("All test cases passed!");
    } else {
      toast.error("Some test cases failed");
    }
  };

  const handleSubmit = async (code: string, language: string) => {
    setIsRunning(true);
    
    // Simulate submission
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const allPassed = Math.random() > 0.4;
    
    if (allPassed) {
      toast.success("Accepted! Your solution passed all test cases.", {
        description: "Runtime: 45ms, Memory: 42.1MB",
      });
    } else {
      toast.error("Wrong Answer", {
        description: "Your solution failed on hidden test cases.",
      });
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
      {/* Top Navigation Bar */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-border/50 bg-card shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigate(`/practice/${skillId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
            <List className="h-4 w-4" />
            Problem List
          </Button>
        </div>
        
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-2">{problem.title}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="w-[100px]" /> {/* Spacer for centering */}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Left Panel - Problem Description */}
          <ResizablePanel defaultSize={40} minSize={25}>
            <ProblemDescription problem={problem} />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Panel - Code Editor + Test Cases */}
          <ResizablePanel defaultSize={60} minSize={35}>
            <ResizablePanelGroup direction="vertical">
              {/* Code Editor */}
              <ResizablePanel defaultSize={65} minSize={30}>
                <CodeEditor
                  problem={problem}
                  onRun={handleRun}
                  onSubmit={handleSubmit}
                />
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Test Case Panel */}
              <ResizablePanel defaultSize={35} minSize={20}>
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
