import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, Clock, Terminal, Expand, Shrink, PanelBottomClose, PanelBottomOpen, ChevronDown, ChevronUp, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseCodeError } from "@/lib/errorParser";

export interface TestResult {
  id: number;
  input: string;
  expected: string;
  actual?: string;
  passed?: boolean;
  runtime?: string;
  error?: string;
  isHidden?: boolean;
}

interface TestCasePanelProps {
  testCases: { input: string; expected: string }[];
  results: TestResult[];
  isRunning: boolean;
  output: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  language?: string;
  userCodeLineCount?: number;
  onErrorLineClick?: (line: number) => void;
  globalError?: string;
  isSubmit?: boolean;
}

// Hidden Test Case Component with expandable output
function HiddenTestCase({ result, index }: { result: TestResult; index: number }) {
  const [showOutput, setShowOutput] = useState(false);
  
  const hasInput = result.input !== undefined && result.input !== null && result.input !== '';
  const hasExpected = result.expected !== undefined && result.expected !== null && result.expected !== '';
  const hasActual = result.actual !== undefined && result.actual !== null && result.actual !== '';
  
  return (
    <div className="border border-border/50 rounded-lg p-4 bg-muted/20">
      <div className="flex items-center gap-2">
        {result.passed ? (
          <Check className="h-4 w-4 text-green-600 dark:text-green-500" />
        ) : (
          <X className="h-4 w-4 text-red-600 dark:text-red-500" />
        )}
        <span className="font-medium text-sm">Test Case {index + 1}</span>
        <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">Hidden</span>
        {result.runtime && (
          <span className="text-xs text-muted-foreground ml-auto mr-2">{result.runtime}</span>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs gap-1 ml-auto"
          onClick={() => setShowOutput(!showOutput)}
        >
          <Eye className="h-3 w-3" />
          {showOutput ? "Hide" : "Show Output"}
        </Button>
      </div>
      
      {showOutput && (
        <div className="mt-3 space-y-2 text-sm font-mono border-t border-border/50 pt-3">
          <div>
            <span className="text-muted-foreground">Input: </span>
            <span>{hasInput ? result.input : <span className="text-muted-foreground/50 italic">hidden</span>}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Expected: </span>
            <span>{hasExpected ? result.expected : <span className="text-muted-foreground/50 italic">hidden</span>}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Output: </span>
            <span className={result.passed ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}>
              {hasActual ? result.actual : <span className="text-muted-foreground/50 italic">no output</span>}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function TestCasePanel({ 
  testCases, 
  results, 
  isRunning, 
  output,
  isExpanded = false,
  onToggleExpand,
  isCollapsed = false,
  onToggleCollapse,
  activeTab: controlledActiveTab,
  onTabChange,
  language = 'python',
  userCodeLineCount = 100,
  onErrorLineClick,
  globalError,
  isSubmit = false,
}: TestCasePanelProps) {
  const [internalActiveTab, setInternalActiveTab] = useState("testcase");
  const activeTab = controlledActiveTab ?? internalActiveTab;
  const setActiveTab = onTabChange ?? setInternalActiveTab;
  
  const [selectedCase, setSelectedCase] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [showRawError, setShowRawError] = useState(false);

  const hasResults = results.length > 0;
  const hasError = globalError || results.some(r => r.error);

  // Collapsed state: keep a visible header bar so the reopen icon is always reachable.
  if (isCollapsed && !isExpanded) {
    return (
      <div
        className="h-full flex items-center justify-between px-4 bg-card border-t border-border/50"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-muted-foreground truncate">Test Cases</span>
          {hasResults && (
            <span
              className={cn(
                "w-2 h-2 rounded-full shrink-0",
                results.every((r) => r.passed) ? "bg-green-500" : "bg-red-500"
              )}
            />
          )}
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onToggleCollapse}
              title="Show panel"
            >
              <PanelBottomOpen className="h-4 w-4" />
            </Button>
          )}

          {onToggleExpand && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onToggleExpand}
              title="Fullscreen"
            >
              <Expand className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="h-full flex flex-col bg-card border-t border-border/50"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b border-border/50 px-4">
          <div className="flex items-center justify-between">
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
            
            {/* Collapse & Expand Buttons - Show on hover */}
            <div className={cn(
              "flex items-center gap-0.5 shrink-0 transition-opacity",
              isHovered || isExpanded || isCollapsed ? "opacity-100" : "opacity-0"
            )}>
              {onToggleCollapse && !isExpanded && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onToggleCollapse}
                  title={isCollapsed ? "Show panel" : "Hide panel"}
                >
                  {isCollapsed ? (
                    <PanelBottomOpen className="h-4 w-4" />
                  ) : (
                    <PanelBottomClose className="h-4 w-4" />
                  )}
                </Button>
              )}
              {onToggleExpand && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onToggleExpand}
                  title={isExpanded ? "Exit fullscreen" : "Fullscreen"}
                >
                  {isExpanded ? (
                    <Shrink className="h-4 w-4" />
                  ) : (
                    <Expand className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        <TabsContent value="testcase" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <div className="p-4">
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
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="result" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              {isRunning ? (
                <div className="flex items-center justify-center h-32">
                  <Clock className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
                  <span className="text-muted-foreground">Running tests...</span>
                </div>
              ) : hasResults ? (
                <div className="space-y-4">
                  {/* Global Error Display (for syntax/compilation errors) */}
                  {globalError && (() => {
                    const parsed = parseCodeError(globalError, language, userCodeLineCount);
                    return (
                      <div className={cn(
                        "rounded-lg border overflow-hidden",
                        parsed.isUserCodeError 
                          ? "bg-red-500/10 border-red-500/30" 
                          : "bg-muted/50 border-border/50"
                      )}>
                        <div className="p-4">
                          <div className="flex items-start gap-3">
                            <X className={cn(
                              "h-5 w-5 mt-0.5 shrink-0",
                              parsed.isUserCodeError ? "text-red-500" : "text-muted-foreground"
                            )} />
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={cn(
                                  "font-semibold",
                                  parsed.isUserCodeError 
                                    ? "text-red-600 dark:text-red-400" 
                                    : "text-muted-foreground"
                                )}>
                                  {parsed.isUserCodeError ? `❌ ${parsed.friendlyType}` : "⚙️ Internal Error"}
                                </span>
                                {parsed.isUserCodeError && parsed.userLine && (
                                  <button
                                    onClick={() => onErrorLineClick?.(parsed.userLine!)}
                                    className="text-sm px-2 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-400 transition-colors font-mono"
                                  >
                                    line {parsed.userLine}
                                  </button>
                                )}
                              </div>
                              <p className="text-sm text-foreground/80">
                                {parsed.isUserCodeError 
                                  ? parsed.friendlyMessage 
                                  : "This error is not your fault - it occurred in the test harness."}
                              </p>
                              {parsed.codeSnippet && (
                                <div className="mt-2 p-2 rounded bg-muted/50 font-mono text-sm border border-border/50">
                                  <span className="text-muted-foreground">→ </span>
                                  <span className="text-red-600 dark:text-red-400">{parsed.codeSnippet}</span>
                                </div>
                              )}
                              {parsed.message && parsed.isUserCodeError && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {parsed.type}: {parsed.message}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Technical Details Collapsible */}
                        <div className="border-t border-border/30">
                          <button
                            onClick={() => setShowRawError(!showRawError)}
                            className="w-full flex items-center justify-between px-4 py-2 text-xs text-muted-foreground hover:bg-muted/30 transition-colors"
                          >
                            <span>View technical details</span>
                            {showRawError ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>
                          {showRawError && (
                            <div className="px-4 pb-4">
                              <pre className="text-xs font-mono p-3 rounded bg-muted/50 overflow-x-auto whitespace-pre-wrap break-all border border-border/30 text-muted-foreground max-h-48 overflow-y-auto">
                                {parsed.rawError}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                  
                  {/* Summary - Only show if no global error */}
                  {!globalError && (
                    <div className={cn(
                      "p-4 rounded-lg",
                      results.every(r => r.passed) 
                        ? "bg-green-500/10 border border-green-500/20" 
                        : "bg-amber-500/10 border border-amber-500/20"
                    )}>
                      <div className="flex items-center justify-center gap-2">
                        {results.every(r => r.passed) ? (
                          isSubmit ? (
                            <span className="font-medium text-green-600 dark:text-green-500 text-center">
                              🎉 Congratulations! You nailed it!
                            </span>
                          ) : (
                            <>
                              <Check className="h-5 w-5 text-green-600 dark:text-green-500" />
                              <span className="font-medium text-green-600 dark:text-green-500">
                                {results.filter(r => r.passed).length}/{results.length} tests passed
                              </span>
                            </>
                          )
                        ) : (
                          <span className="font-medium text-amber-600 dark:text-amber-500">
                            ⚠️ You're close — {results.filter(r => r.passed).length}/{results.length} tests passed
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Individual Results */}
                  {results.map((result, i) => {
                    const errorParsed = result.error 
                      ? parseCodeError(result.error, language, userCodeLineCount) 
                      : null;
                    
                    // Hidden test case - show minimal info with expandable output
                    if (result.isHidden) {
                      return (
                        <HiddenTestCase 
                          key={i}
                          result={result}
                          index={i}
                        />
                      );
                    }
                    
                    return (
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
                        
                        {/* Error display for this test case */}
                        {errorParsed && !globalError && (
                          <div className="mb-3 p-3 rounded-md bg-red-500/10 border border-red-500/20">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-red-600 dark:text-red-400 font-medium">
                                {errorParsed.friendlyType}
                              </span>
                              {errorParsed.userLine && (
                                <button
                                  onClick={() => onErrorLineClick?.(errorParsed.userLine!)}
                                  className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-400 transition-colors font-mono"
                                >
                                  line {errorParsed.userLine}
                                </button>
                              )}
                            </div>
                            <p className="text-xs text-foreground/70 mt-1">
                              {errorParsed.friendlyMessage}
                            </p>
                            {errorParsed.message && (
                              <p className="text-xs text-muted-foreground mt-1 font-mono">
                                {errorParsed.message.substring(0, 100)}
                                {errorParsed.message.length > 100 ? '...' : ''}
                              </p>
                            )}
                          </div>
                        )}
                        
                        <div className="space-y-2 text-sm font-mono">
                          <div>
                            <span className="text-muted-foreground">Input: </span>
                            <span>{result.input}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Expected: </span>
                            <span>{result.expected}</span>
                          </div>
                          {result.actual && !result.error && (
                            <div>
                              <span className="text-muted-foreground">Output: </span>
                              <span className={result.passed ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}>
                                {result.actual}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Run your code to see test results.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="output" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              {output ? (
                <pre className="font-mono text-sm whitespace-pre-wrap">{output}</pre>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Run your code to see console output.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
