import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, Clock, Terminal, Expand, Shrink, PanelBottomClose, PanelBottomOpen, ChevronDown, ChevronUp, Eye, AlertTriangle, XCircle, Cog, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseCodeError, cleanErrorMessage, isSyntaxError, isRuntimeError, looksLikeError, type ErrorCategory } from "@/lib/errorParser";

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
  errorMessageStyle?: 'beginner' | 'standard' | 'advanced';
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
  errorMessageStyle = 'beginner',
  revealOutputOnlyAfterRun = false,
  hasRunOnce = false,
}: TestCasePanelProps) {
  const [internalActiveTab, setInternalActiveTab] = useState("testcase");
  const activeTab = controlledActiveTab ?? internalActiveTab;
  const setActiveTab = onTabChange ?? setInternalActiveTab;
  
  const [selectedCase, setSelectedCase] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [showRawError, setShowRawError] = useState(false);

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
                  {/* Global Error Display (LeetCode-style) */}
                  {globalError && (() => {
                    const parsed = parseCodeError(globalError, language, userCodeLineCount);
                    const isBeginnerMode = errorMessageStyle === 'beginner';
                    const isAdvancedMode = errorMessageStyle === 'advanced';
                    
                    // Determine style based on error category
                    const getCategoryStyle = (category: ErrorCategory) => {
                      switch (category) {
                        case 'syntax':
                          return {
                            headerBg: "bg-red-500/10",
                            headerBorder: "border-red-500/20",
                            headerText: "text-red-600 dark:text-red-400",
                            Icon: XCircle,
                          };
                        case 'runtime':
                          return {
                            headerBg: "bg-red-500/10",
                            headerBorder: "border-red-500/20",
                            headerText: "text-red-600 dark:text-red-400",
                            Icon: AlertTriangle,
                          };
                        case 'internal':
                          return {
                            headerBg: "bg-muted",
                            headerBorder: "border-border",
                            headerText: "text-muted-foreground",
                            Icon: Cog,
                          };
                      }
                    };
                    
                    const style = getCategoryStyle(parsed.category);
                    const { Icon } = style;
                    
                    // Format header text - use friendlyType from parsed error
                    const headerText = parsed.friendlyType;

                    // ADVANCED MODE: Full raw error output exactly as produced, no stripping
                    if (isAdvancedMode) {
                      return (
                        <div className={cn(
                          "rounded-lg border overflow-hidden font-mono text-sm",
                          style.headerBg,
                          style.headerBorder
                        )}>
                          {/* Error Header */}
                          <div className="px-4 py-3 border-b border-border/30">
                            <div className="flex items-center gap-2">
                              <Icon className={cn("h-4 w-4", style.headerText)} />
                              <span className={cn("font-bold text-base", style.headerText)}>
                                {parsed.type}
                              </span>
                              {parsed.userLine && (
                                <button
                                  onClick={() => onErrorLineClick?.(parsed.userLine!)}
                                  className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-400 transition-colors"
                                >
                                  line {parsed.userLine}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Full Raw Error Content - No stripping at all */}
                          <div className="px-4 py-3 bg-background/50">
                            <pre className="text-xs whitespace-pre-wrap break-words text-foreground/90 overflow-x-auto max-h-96 overflow-y-auto">
                              {parsed.rawError}
                            </pre>
                          </div>
                        </div>
                      );
                    }

                    // STANDARD MODE: Show raw language-native error output
                    if (!isBeginnerMode) {
                      return (
                        <div className={cn(
                          "rounded-lg border overflow-hidden font-mono text-sm",
                          style.headerBg,
                          style.headerBorder
                        )}>
                          {/* Error Header */}
                          <div className="px-4 py-3 border-b border-border/30">
                            <div className="flex items-center gap-2">
                              <Icon className={cn("h-4 w-4", style.headerText)} />
                              <span className={cn("font-bold text-base", style.headerText)}>
                                {parsed.type}
                              </span>
                              {parsed.userLine && (
                                <button
                                  onClick={() => onErrorLineClick?.(parsed.userLine!)}
                                  className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-400 transition-colors"
                                >
                                  line {parsed.userLine}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Raw Error Content - Cleaned of internal paths */}
                          <div className="px-4 py-3 bg-background/50">
                            <pre className="text-xs whitespace-pre-wrap break-words text-foreground/90 overflow-x-auto max-h-64 overflow-y-auto">
                              {cleanErrorMessage(parsed.rawError)}
                            </pre>
                          </div>
                        </div>
                      );
                    }

                    // BEGINNER MODE: Show friendly explanations and coaching hints
                    return (
                      <div className={cn(
                        "rounded-lg border overflow-hidden font-mono text-sm",
                        style.headerBg,
                        style.headerBorder
                      )}>
                        {/* Error Header - LeetCode style */}
                        <div className="px-4 py-3 border-b border-border/30">
                          <div className="flex items-center gap-2">
                            <Icon className={cn("h-4 w-4", style.headerText)} />
                            <span className={cn("font-bold text-base", style.headerText)}>
                              {headerText}
                            </span>
                          </div>
                        </div>

                        {/* Error Content */}
                        <div className="px-4 py-3 space-y-3 bg-background/50">
                          {parsed.isUserCodeError ? (
                            <>
                              {/* Primary error message - friendly explanation */}
                              <p className={cn("text-sm", style.headerText)}>
                                {parsed.friendlyMessage}
                              </p>

                              {/* Runtime Error: Show specific error type and message */}
                              {isRuntimeError(parsed) && (
                                <div className="text-xs font-mono bg-muted/50 rounded px-2 py-1.5 border border-border/30">
                                  <span className="text-red-600 dark:text-red-400 font-medium">{parsed.type}</span>
                                  <span className="text-muted-foreground">: </span>
                                  <span className="text-foreground/80">{parsed.message}</span>
                                </div>
                              )}

                              {/* Fix hint - coaching guidance */}
                              {parsed.fixHint && (
                                <p className="text-xs text-muted-foreground italic flex items-start gap-1.5">
                                  <span>💡</span>
                                  <span>{parsed.fixHint}</span>
                                </p>
                              )}

                              {/* Line reference with code snippet */}
                              {parsed.userLine && (
                                <div className="space-y-1">
                                  <button
                                    onClick={() => onErrorLineClick?.(parsed.userLine!)}
                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors underline decoration-dashed"
                                  >
                                    Line {parsed.userLine}:
                                  </button>
                                  
                                  {parsed.codeLine && (
                                    <div className="pl-0">
                                      <pre className="text-foreground/90 whitespace-pre overflow-x-auto">
                                        {parsed.codeLine}
                                      </pre>
                                      {parsed.pointer && (
                                        <pre className={cn("whitespace-pre", style.headerText)}>
                                          {parsed.pointer.replace(/^\s{4}/, '')}
                                        </pre>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* If no line but we have code snippet */}
                              {!parsed.userLine && parsed.codeLine && (
                                <div className="space-y-1">
                                  <pre className="text-foreground/90 whitespace-pre overflow-x-auto">
                                    {parsed.codeLine}
                                  </pre>
                                  {parsed.pointer && (
                                    <pre className={cn("whitespace-pre", style.headerText)}>
                                      {parsed.pointer.replace(/^\s{4}/, '')}
                                    </pre>
                                  )}
                                </div>
                              )}
                            </>
                          ) : (
                            // Internal error message
                            <p className="text-sm text-muted-foreground">
                              This looks like a system issue on our side. Please try again.
                            </p>
                          )}
                        </div>

                        {/* Technical Details (Collapsible) - Raw stderr output */}
                        <div className="border-t border-border/30">
                          <button
                            onClick={() => setShowRawError(!showRawError)}
                            className="w-full flex items-center justify-between px-4 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                          >
                            <span>View technical details</span>
                            {showRawError ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>
                          
                          {showRawError && (
                            <div className="px-4 pb-4">
                              <pre className="text-xs p-3 rounded bg-muted/50 overflow-x-auto whitespace-pre-wrap break-words border border-border/30 text-muted-foreground max-h-48 overflow-y-auto">
                                {isSyntaxError(parsed) ? parsed.rawError : cleanErrorMessage(parsed.rawError)}
                              </pre>
                            </div>
                          )}
                        </div>
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
                    const nonePassed = passedCount === 0;
                    // Detect runtime errors in BOTH result.error AND result.actual
                    const hasAnyRuntimeError = results.some(r => r.error || looksLikeError(r.actual));

                    // If there's a runtime error, show "Runtime Error" header instead of pass count
                    if (hasAnyRuntimeError) {
                      return (
                        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                          <div className="flex flex-col items-center gap-1 text-center">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                              <span className="text-lg font-semibold text-red-600 dark:text-red-400">
                                Runtime Error
                              </span>
                            </div>
                            <span className="text-sm text-red-600/80 dark:text-red-400/80">
                              Your code crashed during execution. Check the error below.
                            </span>
                          </div>
                        </div>
                      );
                    }

                    // Logical Error state - code ran successfully but produced wrong output
                    let primaryMessage = "";
                    let coachingHint = "";
                    let colorClass = "";
                    let headerText = allPassed ? "Accepted" : "Wrong Answer";

                    if (isSubmit) {
                      // SUBMIT MODE (Sample + Hidden Tests)
                      if (allPassed) {
                        primaryMessage = "🎉 Great job! Your logic handled all test cases correctly.";
                        colorClass = "text-green-600 dark:text-green-500";
                      } else if (nonePassed) {
                        primaryMessage = "Your code ran successfully, but the output is incorrect.";
                        coachingHint = "Your logic may be missing a condition or edge case.";
                        colorClass = "text-amber-600 dark:text-amber-500";
                      } else {
                        primaryMessage = "Your code ran successfully, but some outputs don't match.";
                        coachingHint = "Review the failing cases — you may be close to the solution.";
                        colorClass = "text-amber-600 dark:text-amber-500";
                      }
                    } else {
                      // RUN MODE (Sample Tests Only)
                      if (allPassed) {
                        primaryMessage = "✅ Samples passed — try Submit to check edge cases.";
                        colorClass = "text-green-600 dark:text-green-500";
                      } else if (nonePassed) {
                        primaryMessage = "Your code ran successfully, but the output is incorrect.";
                        coachingHint = "Compare Expected vs Your Output below to find the issue.";
                        colorClass = "text-amber-600 dark:text-amber-500";
                      } else {
                        primaryMessage = "Your code ran successfully, but some outputs don't match.";
                        coachingHint = "Check the failing test cases — your logic may need a small adjustment.";
                        colorClass = "text-amber-600 dark:text-amber-500";
                      }
                    }

                    return (
                      <div className={cn(
                        "p-4 rounded-lg",
                        allPassed 
                          ? "bg-green-500/10 border border-green-500/20" 
                          : "bg-amber-500/10 border border-amber-500/20"
                      )}>
                        <div className="flex flex-col items-center gap-1 text-center">
                          {!allPassed && (
                            <div className="flex items-center gap-2 mb-1">
                              <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                              <span className="text-base font-semibold text-amber-600 dark:text-amber-500">
                                {headerText}
                              </span>
                            </div>
                          )}
                          <span className={cn(
                            "text-lg font-semibold",
                            allPassed ? "text-green-600 dark:text-green-500" : "text-amber-600 dark:text-amber-500"
                          )}>
                            {passedCount} / {totalCount} Passed
                          </span>
                          <span className={cn("text-sm", colorClass)}>
                            {primaryMessage}
                          </span>
                          {/* Coaching hint for logical errors */}
                          {coachingHint && (
                            <p className="text-xs text-muted-foreground italic mt-1 flex items-center gap-1.5">
                              <span>💡</span>
                              <span>{coachingHint}</span>
                            </p>
                          )}
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
                    
                    const isBeginnerMode = errorMessageStyle === 'beginner';
                    const isAdvancedMode = errorMessageStyle === 'advanced';
                    
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
                          
                          {/* Runtime Error display for this specific test case */}
                          {effectiveErrorParsed && !globalError && (
                            <div className="mb-3 p-3 rounded-md bg-red-500/10 border border-red-500/20">
                              {isAdvancedMode ? (
                                // ADVANCED MODE: Full raw error output, no stripping
                                <>
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-red-600 dark:text-red-400 font-medium">
                                      {effectiveErrorParsed.type}
                                    </span>
                                    {effectiveErrorParsed.userLine && (
                                      <button
                                        onClick={() => onErrorLineClick?.(effectiveErrorParsed.userLine!)}
                                        className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-400 transition-colors font-mono"
                                      >
                                        line {effectiveErrorParsed.userLine}
                                      </button>
                                    )}
                                  </div>
                                  <pre className="text-xs text-foreground/80 mt-2 whitespace-pre-wrap break-words overflow-x-auto max-h-48 overflow-y-auto">
                                    {effectiveErrorParsed.rawError}
                                  </pre>
                                </>
                              ) : isBeginnerMode ? (
                                // BEGINNER MODE: Friendly explanations + coaching hints
                                <>
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-red-600 dark:text-red-400 font-medium">
                                      {effectiveErrorParsed.friendlyType}
                                    </span>
                                    {effectiveErrorParsed.userLine && (
                                      <button
                                        onClick={() => onErrorLineClick?.(effectiveErrorParsed.userLine!)}
                                        className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-400 transition-colors font-mono"
                                      >
                                        line {effectiveErrorParsed.userLine}
                                      </button>
                                    )}
                                  </div>
                                  <p className="text-xs text-foreground/70 mt-1">
                                    {effectiveErrorParsed.friendlyMessage}
                                  </p>
                                  {/* Specific error type and message */}
                                  <div className="text-xs font-mono bg-muted/30 rounded px-2 py-1 mt-2 border border-border/30">
                                    <span className="text-red-600/80 dark:text-red-400/80 font-medium">{effectiveErrorParsed.type}</span>
                                    <span className="text-muted-foreground">: </span>
                                    <span className="text-foreground/70">{effectiveErrorParsed.message}</span>
                                  </div>
                                  {effectiveErrorParsed.fixHint && (
                                    <p className="text-xs text-muted-foreground mt-2 italic">
                                      💡 {effectiveErrorParsed.fixHint}
                                    </p>
                                  )}
                                </>
                              ) : (
                                // STANDARD MODE: Raw language-native error, cleaned
                                <>
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-red-600 dark:text-red-400 font-medium">
                                      {effectiveErrorParsed.type}
                                    </span>
                                    {effectiveErrorParsed.userLine && (
                                      <button
                                        onClick={() => onErrorLineClick?.(effectiveErrorParsed.userLine!)}
                                        className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-400 transition-colors font-mono"
                                      >
                                        line {effectiveErrorParsed.userLine}
                                      </button>
                                    )}
                                  </div>
                                  <pre className="text-xs text-foreground/80 mt-2 whitespace-pre-wrap break-words overflow-x-auto">
                                    {cleanErrorMessage(effectiveErrorParsed.rawError)}
                                  </pre>
                                </>
                              )}
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
