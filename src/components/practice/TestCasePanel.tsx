import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Clock, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TestResult {
  id: number;
  input: string;
  expected: string;
  actual?: string;
  passed?: boolean;
  runtime?: string;
}

interface TestCasePanelProps {
  testCases: { input: string; expected: string }[];
  results: TestResult[];
  isRunning: boolean;
  output: string;
}

export function TestCasePanel({ testCases, results, isRunning, output }: TestCasePanelProps) {
  const [activeTab, setActiveTab] = useState("testcase");
  const [selectedCase, setSelectedCase] = useState(0);

  const hasResults = results.length > 0;

  return (
    <div className="h-full flex flex-col bg-card border-t border-border/50">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b border-border/50 px-4">
          <TabsList className="h-10 bg-transparent p-0 gap-4">
            <TabsTrigger 
              value="testcase" 
              className="h-10 px-0 pb-2.5 pt-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm text-muted-foreground data-[state=active]:text-foreground"
            >
              Testcase
            </TabsTrigger>
            <TabsTrigger 
              value="result" 
              className="h-10 px-0 pb-2.5 pt-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm text-muted-foreground data-[state=active]:text-foreground"
            >
              Test Result
              {hasResults && (
                <span className={cn(
                  "ml-2 w-2 h-2 rounded-full",
                  results.every(r => r.passed) ? "bg-green-500" : "bg-red-500"
                )} />
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="output" 
              className="h-10 px-0 pb-2.5 pt-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm text-muted-foreground data-[state=active]:text-foreground"
            >
              <Terminal className="h-4 w-4 mr-1.5" />
              Output
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="testcase" className="flex-1 overflow-auto m-0 p-4">
          {/* Test Case Tabs */}
          <div className="flex gap-2 mb-4">
            {testCases.map((_, i) => (
              <button
                key={i}
                onClick={() => setSelectedCase(i)}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-lg transition-colors",
                  selectedCase === i
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                Case {i + 1}
              </button>
            ))}
          </div>

          {/* Selected Test Case */}
          {testCases[selectedCase] && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Input:</label>
                <div className="bg-muted/50 rounded-lg p-3 font-mono text-sm">
                  {testCases[selectedCase].input}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Expected Output:</label>
                <div className="bg-muted/50 rounded-lg p-3 font-mono text-sm">
                  {testCases[selectedCase].expected}
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="result" className="flex-1 overflow-auto m-0 p-4">
          {isRunning ? (
            <div className="flex items-center justify-center h-32">
              <Clock className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
              <span className="text-muted-foreground">Running tests...</span>
            </div>
          ) : hasResults ? (
            <div className="space-y-4">
              {/* Summary */}
              <div className={cn(
                "p-4 rounded-lg",
                results.every(r => r.passed) 
                  ? "bg-green-500/10 border border-green-500/20" 
                  : "bg-red-500/10 border border-red-500/20"
              )}>
                <div className="flex items-center gap-2">
                  {results.every(r => r.passed) ? (
                    <>
                      <Check className="h-5 w-5 text-green-600 dark:text-green-500" />
                      <span className="font-medium text-green-600 dark:text-green-500">All tests passed!</span>
                    </>
                  ) : (
                    <>
                      <X className="h-5 w-5 text-red-600 dark:text-red-500" />
                      <span className="font-medium text-red-600 dark:text-red-500">
                        {results.filter(r => r.passed).length}/{results.length} tests passed
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Individual Results */}
              {results.map((result, i) => (
                <div key={i} className="border border-border/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    {result.passed ? (
                      <Check className="h-4 w-4 text-green-600 dark:text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-red-600 dark:text-red-500" />
                    )}
                    <span className="font-medium text-sm">Test Case {i + 1}</span>
                    {result.runtime && (
                      <span className="text-xs text-muted-foreground ml-auto">{result.runtime}</span>
                    )}
                  </div>
                  <div className="space-y-2 text-sm font-mono">
                    <div>
                      <span className="text-muted-foreground">Input: </span>
                      <span>{result.input}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Expected: </span>
                      <span>{result.expected}</span>
                    </div>
                    {result.actual && (
                      <div>
                        <span className="text-muted-foreground">Output: </span>
                        <span className={result.passed ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}>
                          {result.actual}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>Run your code to see test results.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="output" className="flex-1 overflow-auto m-0 p-4">
          {output ? (
            <pre className="font-mono text-sm whitespace-pre-wrap">{output}</pre>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>Run your code to see console output.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
