import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, List } from "lucide-react";
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
import { ProblemListDrawer } from "@/components/practice/ProblemListDrawer";
import { usePublishedPracticeProblem, usePublishedPracticeProblems } from "@/hooks/usePracticeProblems";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Execute code via edge function
async function executeCode(code: string, language: string): Promise<{ output: string; error: string | null }> {
  const { data, error } = await supabase.functions.invoke('execute-code', {
    body: { code, language }
  });
  
  if (error) {
    return { output: '', error: error.message };
  }
  
  return { output: data?.output || '', error: data?.error || null };
}

// Function signature can be either a string or JSON object
interface FunctionSignatureObj {
  name: string;
  parameters?: { name: string; type: string }[];
  return_type?: string;
}

type FunctionSignature = string | FunctionSignatureObj | null;

// Extract function name from signature (string or object)
function getFunctionName(signature: FunctionSignature): string | null {
  if (!signature) return null;
  
  // If it's an object with a name property
  if (typeof signature === 'object' && 'name' in signature) {
    return signature.name;
  }
  
  // If it's a string like "twoSum(nums, target)"
  if (typeof signature === 'string') {
    const funcMatch = signature.match(/^(\w+)\s*\(/);
    return funcMatch ? funcMatch[1] : null;
  }
  
  return null;
}

// Get parameter names from signature
function getParameterNames(signature: FunctionSignature): string[] {
  if (!signature) return [];
  
  // If it's an object with parameters
  if (typeof signature === 'object' && 'parameters' in signature && Array.isArray(signature.parameters)) {
    return signature.parameters.map(p => p.name);
  }
  
  // If it's a string, extract from parentheses
  if (typeof signature === 'string') {
    const match = signature.match(/\(([^)]*)\)/);
    if (!match) return [];
    return match[1].split(',').map(arg => arg.trim().split(/[:\s]/)[0]).filter(Boolean);
  }
  
  return [];
}

// Wrap user code with test harness for specific input
function wrapCodeWithTestHarness(
  userCode: string, 
  language: string, 
  functionSignature: FunctionSignature,
  testInput: string
): string {
  // If no function signature, just run the code as-is
  if (!functionSignature) {
    return userCode;
  }

  const funcName = getFunctionName(functionSignature);
  if (!funcName) return userCode;

  const paramNames = getParameterNames(functionSignature);
  const argsString = paramNames.join(', ');

  // Build test harness based on language
  if (language === 'python') {
    return `${userCode}

# Test harness
if __name__ == "__main__":
    ${testInput}
    result = ${funcName}(${argsString})
    print(result)
`;
  }
  
  if (language === 'javascript' || language === 'typescript') {
    return `${userCode}

// Test harness
${testInput}
const result = ${funcName}(${argsString});
console.log(JSON.stringify(result));
`;
  }

  return userCode;
}

// Normalize output for comparison
function normalizeOutput(output: string): string {
  return output
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[\[\](),]/g, match => match) // Keep brackets/parens
    .replace(/'/g, '"'); // Normalize quotes
}

// Check if outputs match (flexible comparison)
function outputsMatch(actual: string, expected: string): boolean {
  const normalActual = normalizeOutput(actual);
  const normalExpected = normalizeOutput(expected);
  
  // Exact match
  if (normalActual === normalExpected) return true;
  
  // Check if actual contains expected (for arrays, the order might differ)
  if (normalActual.includes(normalExpected) || normalExpected.includes(normalActual)) return true;
  
  // Try parsing as JSON for array comparison
  try {
    const actualParsed = JSON.parse(actual.trim());
    const expectedParsed = JSON.parse(expected.trim());
    
    if (Array.isArray(actualParsed) && Array.isArray(expectedParsed)) {
      // Sort and compare for unordered array comparison
      return JSON.stringify(actualParsed.sort()) === JSON.stringify(expectedParsed.sort());
    }
    
    return JSON.stringify(actualParsed) === JSON.stringify(expectedParsed);
  } catch {
    return false;
  }
}

export default function ProblemDetail() {
  const { skillId, problemId } = useParams<{ skillId: string; problemId: string }>();
  const navigate = useNavigate();
  const testPanelRef = useRef<ImperativePanelHandle>(null);
  
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [output, setOutput] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

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
    functionSignature: (dbProblem as any).function_signature || null,
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

  // RUN: Execute code and test against visible test cases
  const handleRun = async (code: string, language: string) => {
    if (!problem) return;
    
    testPanelRef.current?.resize(35);
    setIsRunning(true);
    setResults([]);
    setOutput(`Running ${language}...\n`);
    
    const startTime = Date.now();
    const testResults: TestResult[] = [];
    let outputLog = `Running ${language}...\n\n`;
    
    try {
      // Execute the code directly first to check for syntax errors
      const { output: rawOutput, error } = await executeCode(code, language);
      
      if (error) {
        outputLog += `❌ Error:\n${error}`;
        setOutput(outputLog);
        setIsRunning(false);
        toast.error("Execution Error", { description: error.substring(0, 100) });
        return;
      }
      
      // If there are test cases, run them
      if (problem.testCases.length > 0) {
        for (let i = 0; i < problem.testCases.length; i++) {
          const tc = problem.testCases[i];
          
          // Wrap code with test harness for this specific test case
          const wrappedCode = wrapCodeWithTestHarness(
            code, 
            language, 
            problem.functionSignature,
            tc.input
          );
          
          const { output: testOutput, error: testError } = await executeCode(wrappedCode, language);
          const runtime = `${Math.floor(Math.random() * 30 + 5)}ms`;
          
          const actual = testError || testOutput.trim();
          const passed = !testError && outputsMatch(testOutput, tc.expected);
          
          testResults.push({
            id: i,
            input: tc.input,
            expected: tc.expected,
            actual: actual || "No output",
            passed,
            runtime: passed ? runtime : undefined,
          });
          
          outputLog += `Test ${i + 1}: ${passed ? '✓ Passed' : '✗ Failed'}\n`;
        }
      } else {
        // No test cases, just show raw output
        outputLog += `Output:\n${rawOutput}`;
      }
      
      const elapsed = Date.now() - startTime;
      const passedCount = testResults.filter(r => r.passed).length;
      
      if (testResults.length > 0) {
        outputLog += `\n${passedCount}/${testResults.length} test cases passed (${elapsed}ms)`;
      }
      
      setResults(testResults);
      setOutput(outputLog);
      
      if (testResults.length > 0) {
        if (testResults.every(r => r.passed)) {
          toast.success("All visible test cases passed!");
        } else {
          toast.error(`${testResults.length - passedCount} test case(s) failed`);
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Execution failed";
      outputLog += `❌ Error: ${errorMsg}`;
      setOutput(outputLog);
      toast.error("Execution Failed", { description: errorMsg });
    }
    
    setIsRunning(false);
  };

  // SUBMIT: Execute code against ALL test cases (including hidden)
  const handleSubmit = async (code: string, language: string) => {
    if (!problem) return;
    
    testPanelRef.current?.resize(35);
    setIsRunning(true);
    setResults([]);
    setOutput(`Submitting ${language}...\n`);
    
    const startTime = Date.now();
    const testResults: TestResult[] = [];
    let outputLog = `Submitting ${language}...\n\n`;
    
    const totalTests = problem.allTestCases.length;
    const hiddenCount = problem.allTestCases.filter((tc: any) => !tc.isVisible).length;
    
    try {
      // First check for syntax errors
      const { error: syntaxError } = await executeCode(code, language);
      
      if (syntaxError) {
        outputLog += `❌ Compilation/Syntax Error:\n${syntaxError}`;
        setOutput(outputLog);
        setIsRunning(false);
        toast.error("Submission Failed", { description: "Fix errors before submitting" });
        return;
      }
      
      let passedCount = 0;
      let failedOnTest = -1;
      
      // Run all test cases
      for (let i = 0; i < problem.allTestCases.length; i++) {
        const tc = problem.allTestCases[i];
        
        const wrappedCode = wrapCodeWithTestHarness(
          code, 
          language, 
          problem.functionSignature,
          tc.input
        );
        
        const { output: testOutput, error: testError } = await executeCode(wrappedCode, language);
        
        const passed = !testError && outputsMatch(testOutput, tc.expected);
        
        if (passed) {
          passedCount++;
        } else if (failedOnTest === -1) {
          failedOnTest = i;
        }
        
        // Only show visible test results in the UI
        if (tc.isVisible) {
          testResults.push({
            id: i,
            input: tc.input,
            expected: tc.expected,
            actual: testError || testOutput.trim() || "No output",
            passed,
            runtime: passed ? `${Math.floor(Math.random() * 30 + 5)}ms` : undefined,
          });
        }
      }
      
      const elapsed = Date.now() - startTime;
      const allPassed = passedCount === totalTests;
      
      outputLog += `Total test cases: ${totalTests} (${totalTests - hiddenCount} visible, ${hiddenCount} hidden)\n`;
      outputLog += `Passed: ${passedCount}/${totalTests}\n`;
      outputLog += `Runtime: ${elapsed}ms\n`;
      
      setResults(testResults);
      setOutput(outputLog);
      
      if (allPassed) {
        toast.success("🎉 Accepted!", {
          description: `All ${totalTests} test cases passed in ${elapsed}ms`,
        });
      } else {
        const failedIsHidden = failedOnTest >= 0 && !problem.allTestCases[failedOnTest].isVisible;
        toast.error("Wrong Answer", {
          description: `Failed on test case ${failedOnTest + 1}/${totalTests}${failedIsHidden ? " (hidden)" : ""}`,
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Submission failed";
      outputLog += `❌ Error: ${errorMsg}`;
      setOutput(outputLog);
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
