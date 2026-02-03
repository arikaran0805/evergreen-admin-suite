import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, Clock, Terminal, Expand, Shrink, PanelBottomClose, PanelBottomOpen, Eye, AlertTriangle, Copy, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseCodeError, isSyntaxError, isRuntimeError, looksLikeError } from "@/lib/errorParser";

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
  // New settings-driven props
  showSampleTestcasesFirst?: boolean;
  revealOutputOnlyAfterRun?: boolean;
  hasRunOnce?: boolean;
}

// Hidden Test Case Component with expandable output
function HiddenTestCase({ result, index }: { result: TestResult; index: number }) {
  const [showOutput, setShowOutput] = useState(false);
  
  const inputValue = (result.input ?? "").toString();
  const expectedValue = (result.expected ?? "").toString();

  const hasInput = inputValue.trim().length > 0;
  const hasExpected = expectedValue.trim().length > 0;

  // But we should always show the user's actual output
  const actualOutput = result.actual?.toString().trim();
  const hasActualOutput = actualOutput && actualOutput.length > 0;
  
  return (
    <div className="border border-border/50 rounded-lg p-4 bg-muted/20">
      <div className="flex items-center gap-2 flex-wrap">
        {result.passed ? (
          <Check className="h-4 w-4 text-green-600 dark:text-green-500 shrink-0" />
        ) : (
          <X className="h-4 w-4 text-red-600 dark:text-red-500 shrink-0" />
        )}
        <span className="font-medium text-sm">Test Case {index + 1}</span>
        <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">Hidden</span>
        {result.runtime && (
          <span className="text-xs text-muted-foreground">{result.runtime}</span>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs gap-1 ml-auto shrink-0"
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
            {hasInput ? (
              <span>{inputValue}</span>
            ) : (
              <span className="text-muted-foreground/60 italic">hidden</span>
            )}
          </div>
          <div>
            <span className="text-muted-foreground">Expected: </span>
            {hasExpected ? (
              <span>{expectedValue}</span>
            ) : (
              <span className="text-muted-foreground/60 italic">hidden</span>
            )}
          </div>
          <div>
            <span className="text-muted-foreground">Output: </span>
            {hasActualOutput ? (
              <span className={result.passed ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}>
                {actualOutput}
              </span>
            ) : (
              <span className="text-muted-foreground/60 italic">(no output produced)</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// LeetCode-style Error Box Component
function LeetCodeErrorBox({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const lineCount = content.split('\n').length;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="relative rounded-lg bg-red-500/10 p-4">
      {/* Copy Button - Top Right */}
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 p-1.5 rounded hover:bg-red-500/20 transition-colors text-red-400"
        title="Copy error"
      >
        {copied ? (
          <Check className="h-4 w-4" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </button>

      {/* Error Content - Monospace */}
      <div className={cn(
        "font-mono text-sm text-red-500 pr-10 overflow-x-auto",
        !expanded && lineCount > 8 && "max-h-40 overflow-hidden"
      )}>
        <pre className="whitespace-pre-wrap break-words">
          {content}
        </pre>
      </div>

      {/* View Less/More Toggle */}
      {lineCount > 8 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 mx-auto mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              View less
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              View more
            </>
          )}
        </button>
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
  showSampleTestcasesFirst = true,
  revealOutputOnlyAfterRun = false,
  hasRunOnce = false,
}: TestCasePanelProps) {
  const [internalActiveTab, setInternalActiveTab] = useState("testcase");
  const activeTab = controlledActiveTab ?? internalActiveTab;
  const setActiveTab = onTabChange ?? setInternalActiveTab;
  
  const [selectedCase, setSelectedCase] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const hasResults = results.length > 0;
  const hasError = globalError || results.some(r => r.error);

  // Sort results: show sample (visible) test cases first if setting is enabled
  const sortedResults = showSampleTestcasesFirst 
    ? [...results].sort((a, b) => {
        // Non-hidden (sample) cases come first
        if (!a.isHidden && b.isHidden) return -1;
        if (a.isHidden && !b.isHidden) return 1;
        return 0;
      })
    : results;

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
      className="h-full flex flex-col bg-card border-t border-border/50 overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
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

        <TabsContent value="testcase" className="flex-1 min-h-0 overflow-hidden m-0">
          <ScrollArea className="h-full w-full">
            <div className="p-4">
              {/* Test Case Tabs */}
              <div className="flex gap-2 mb-4 flex-wrap">
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

        <TabsContent value="result" className="flex-1 min-h-0 overflow-hidden m-0">
          <ScrollArea className="h-full w-full">
            <div className="p-4 pb-8">
              {isRunning ? (
                <div className="flex items-center justify-center h-32">
                  <Clock className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
                  <span className="text-muted-foreground">Running tests...</span>
                </div>
              ) : hasResults ? (
                <div className="space-y-4">
                  {/* Global Error Display - LeetCode Style */}
                  {globalError && (() => {
                    const parsed = parseCodeError(globalError, language, userCodeLineCount);
                    const formattedContent = parsed.rawError || globalError;

                    return (
                      <div className="space-y-3">
                        {/* Title - Always "Runtime Error" */}
                        <h3 className="text-xl font-semibold text-red-500">
                          Runtime Error
                        </h3>

                        {/* Error Container */}
                        <LeetCodeErrorBox content={formattedContent} />
                      </div>
                    );
                  })()}
                  
                  {/* 
                    ERROR STATE HANDLING:
                    1. Syntax Error (globalError with syntax category): Show error ONLY, NO test results
                    2. Runtime Error: Show which test case crashed, NO expected vs output
                    3. Logical Error (no error, wrong output): Show pass count + Expected vs Output
                  */}
                  
                  {/* Summary - Show for Logical Errors (when code ran but produced wrong output) */}
                  {!globalError && (() => {
                    const passedCount = results.filter(r => r.passed).length;
                    const totalCount = results.length;
                    const allPassed = passedCount === totalCount;
                    // Detect runtime errors in BOTH result.error AND result.actual
                    const hasAnyRuntimeError = results.some(r => r.error || looksLikeError(r.actual));

                    // If there's a runtime error, show "Runtime Error" header
                    if (hasAnyRuntimeError) {
                      return (
                        <h3 className="text-xl font-semibold text-red-500">
                          Runtime Error
                        </h3>
                      );
                    }

                    // Logical Error state - code ran successfully but produced wrong output
                    const primaryMessage = allPassed ? "Accepted" : "Wrong Answer";

                    return (
                      <div className={cn(
                        "p-4 rounded-lg",
                        allPassed 
                          ? "bg-green-500/10" 
                          : "bg-amber-500/10"
                      )}>
                        <div className="flex flex-col items-center gap-1 text-center">
                          <span className={cn(
                            "text-xl font-semibold",
                            allPassed ? "text-green-600 dark:text-green-500" : "text-amber-600 dark:text-amber-500"
                          )}>
                            {primaryMessage}
                          </span>
                          <span className={cn(
                            "text-sm",
                            allPassed ? "text-green-600/80 dark:text-green-500/80" : "text-amber-600/80 dark:text-amber-500/80"
                          )}>
                            {passedCount} / {totalCount} testcases passed
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Individual Results - Only show if NOT a syntax error */}
                  {(() => {
                    // For Syntax Errors: Don't show any test results
                    if (globalError) {
                      const parsed = parseCodeError(globalError, language, userCodeLineCount);
                      if (isSyntaxError(parsed)) {
                        return null; // Syntax errors: NO test results shown
                      }
                    }
                    
                    return sortedResults.map((result, i) => {
                      // Check for error in result.error field
                      const errorParsed = result.error 
                        ? parseCodeError(result.error, language, userCodeLineCount) 
                        : null;
                      
                      // Also check if error appeared in result.actual (output field)
                      const actualIsError = !result.error && looksLikeError(result.actual);
                      const actualErrorParsed = actualIsError 
                        ? parseCodeError(result.actual!, language, userCodeLineCount) 
                        : null;
                      
                      // Use whichever error we found
                      const effectiveErrorParsed = errorParsed || actualErrorParsed;
                      const hasRuntimeError = effectiveErrorParsed && isRuntimeError(effectiveErrorParsed);
                      
                      // Hidden test case - show minimal info with expandable output
                      if (result.isHidden) {
                        return (
                          <HiddenTestCase 
                            key={result.id ?? i}
                            result={result}
                            index={i}
                          />
                        );
                      }
                      
                      return (
                        <div key={result.id ?? i} className="border border-border/50 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            {result.passed ? (
                              <Check className="h-4 w-4 text-green-600 dark:text-green-500" />
                            ) : hasRuntimeError ? (
                              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-500" />
                            ) : (
                              <X className="h-4 w-4 text-red-600 dark:text-red-500" />
                            )}
                            <span className="font-medium text-sm">
                              Test Case {result.id ?? i + 1}
                              {hasRuntimeError && (
                                <span className="ml-2 text-xs text-red-600 dark:text-red-400">(crashed)</span>
                              )}
                            </span>
                            {result.runtime && !hasRuntimeError && (
                              <span className="text-xs text-muted-foreground ml-auto">{result.runtime}</span>
                            )}
                          </div>
                          
                          {/* Runtime Error display for this specific test case - LeetCode Style */}
                          {effectiveErrorParsed && !globalError && (
                            <div className="mb-3">
                              <LeetCodeErrorBox content={effectiveErrorParsed.rawError || ''} />
                            </div>
                          )}
                          
                          {/* Test case details */}
                          <div className="space-y-2 text-sm font-mono">
                            <div>
                              <span className="text-muted-foreground">Input: </span>
                              <span>{result.input}</span>
                            </div>
                            
                            {/* For Runtime Errors: DON'T show Expected vs Output (code crashed) */}
                            {/* For Logical Errors: Show Expected vs Your Output */}
                            {!hasRuntimeError && (
                              <>
                                <div>
                                  <span className="text-muted-foreground">Expected: </span>
                                  <span>{result.expected}</span>
                                </div>
                                {result.actual && (
                                  <div>
                                    <span className="text-muted-foreground">Your Output: </span>
                                    <span className={result.passed ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}>
                                      {result.actual}
                                    </span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Run your code to see test results.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="output" className="flex-1 min-h-0 overflow-hidden m-0">
          <ScrollArea className="h-full w-full">
            <div className="p-4 pb-8">
              {revealOutputOnlyAfterRun && !hasRunOnce ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Output will appear after you run your code.</p>
                </div>
              ) : output ? (
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
