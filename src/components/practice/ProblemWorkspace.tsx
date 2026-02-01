import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import type { ImperativePanelHandle } from "react-resizable-panels";
import { RotateCcw, Expand, Shrink, PanelTopClose, PanelTopOpen, Braces, AlignLeft, FileCode, Maximize } from "lucide-react";
import Editor, { OnMount, Monaco } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { TestCasePanel, TestResult } from "./TestCasePanel";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { parseCodeError } from "@/lib/errorParser";
import { useProblemCodePersistence } from "@/hooks/useProblemCodePersistence";
import { usePracticeEditorSettings } from "@/hooks/usePracticeEditorSettings";
import { PracticeEditorSettingsPopover } from "./PracticeEditorSettingsPopover";
import { formatPython, registerMonacoPythonFormatter } from "@/lib/formatters/pythonFormatter";

interface ProblemWorkspaceProps {
  problemId: string;
  starterCode: Record<string, string>;
  supportedLanguages: string[];
  testCases: { input: string; expected: string }[];
  onRun: (code: string, language: string) => void;
  onSubmit: (code: string, language: string) => void;
  onCodeSubmitted?: (code: string, language: string) => void;
  results: TestResult[];
  isRunning: boolean;
  output: string;
  expandedPanel?: 'editor' | 'testcase' | null;
  onExpandEditor?: () => void;
  onExpandTestcase?: () => void;
  testCaseActiveTab?: string;
  onTestCaseTabChange?: (tab: string) => void;
  globalError?: string;
  isSubmit?: boolean;
}

const languageLabels: Record<string, string> = {
  python: "Python 3",
  javascript: "JavaScript",
  typescript: "TypeScript",
  java: "Java",
  cpp: "C++",
  sql: "SQL",
  mysql: "MySQL",
};

const monacoLanguageMap: Record<string, string> = {
  python: "python",
  javascript: "javascript",
  typescript: "typescript",
  java: "java",
  cpp: "cpp",
  sql: "sql",
  mysql: "sql",
};

export function ProblemWorkspace({
  problemId,
  starterCode,
  supportedLanguages,
  testCases,
  onRun,
  onSubmit,
  onCodeSubmitted,
  results,
  isRunning,
  output,
  expandedPanel,
  onExpandEditor,
  onExpandTestcase,
  testCaseActiveTab,
  onTestCaseTabChange,
  globalError,
  isSubmit = false,
}: ProblemWorkspaceProps) {
  const { theme } = useTheme();
  const editorPanelRef = useRef<ImperativePanelHandle>(null);
  const testPanelRef = useRef<ImperativePanelHandle>(null);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const [isEditorHovered, setIsEditorHovered] = useState(false);
  const [isEditorPanelCollapsed, setIsEditorPanelCollapsed] = useState(false);
  const [isTestPanelCollapsed, setIsTestPanelCollapsed] = useState(false);
  const [errorLine, setErrorLine] = useState<number | undefined>();

  const { settings, updateSetting } = usePracticeEditorSettings();
  const tabWidthRef = useRef(settings.tabSize);

  useEffect(() => {
    tabWidthRef.current = settings.tabSize;
  }, [settings.tabSize]);
  
  // Use the persistence hook for code management
  const {
    code,
    language,
    setCode,
    handleLanguageChange: persistenceHandleLanguageChange,
    handleReset: persistenceHandleReset,
    restoreLastSubmission,
    saveAsLastSubmission,
    hasLastSubmission,
    hasDraft,
  } = useProblemCodePersistence({
    problemId,
    starterCode,
    supportedLanguages,
  });

  const availableLanguages = supportedLanguages.length > 0 
    ? supportedLanguages 
    : Object.keys(starterCode);

  const userCodeLineCount = code.split('\n').length;

  // Error line highlighting helper
  const highlightErrorLine = useCallback((line: number) => {
    setErrorLine(line);
    if (editorRef.current && monacoRef.current) {
      const monaco = monacoRef.current;
      decorationsRef.current = editorRef.current.deltaDecorations(
        decorationsRef.current,
        [
          {
            range: new monaco.Range(line, 1, line, 1),
            options: {
              isWholeLine: true,
              className: 'error-line-highlight',
              glyphMarginClassName: 'error-line-glyph',
              linesDecorationsClassName: 'error-line-decoration',
            },
          },
        ]
      );
      editorRef.current.revealLineInCenter(line);
    }
  }, []);

  const clearErrorHighlight = useCallback(() => {
    setErrorLine(undefined);
    if (editorRef.current) {
      decorationsRef.current = editorRef.current.deltaDecorations(
        decorationsRef.current,
        []
      );
    }
  }, []);

  const handleLanguageChange = (newLang: string) => {
    persistenceHandleLanguageChange(newLang);
    clearErrorHighlight();
  };

  const handleReset = () => {
    persistenceHandleReset();
    clearErrorHighlight();
  };

  const handleRetrieveLastCode = () => {
    if (hasLastSubmission) {
      const restored = restoreLastSubmission();
      if (restored) {
        clearErrorHighlight();
        toast.success("Last submitted code restored");
      }
    } else {
      toast.info("No previous submission found");
    }
  };

  const handleEditorChange = useCallback((value: string | undefined) => {
    setCode(value || '');
    // Clear error highlighting when user edits code
    if (errorLine) {
      clearErrorHighlight();
    }
  }, [errorLine, clearErrorHighlight, setCode]);

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Enable Python formatting for Monaco's built-in Format Document action.
    registerMonacoPythonFormatter(monaco, () => tabWidthRef.current);
    
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      handleRun();
    });
  }, []);

  // Apply editor settings whenever they change
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.updateOptions({
      fontSize: settings.fontSize,
      wordWrap: settings.wordWrap ? "on" : "off",
      lineNumbers: settings.lineNumbers ? "on" : "off",
      minimap: { enabled: settings.minimap },
    });

    const model = editor.getModel?.();
    model?.updateOptions?.({ tabSize: settings.tabSize, insertSpaces: true });
  }, [settings]);

  const handleFormatCode = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor) return;

    const action = editor.getAction?.("editor.action.formatDocument");
    const isSupported =
      !!action && (typeof action.isSupported !== "function" || action.isSupported());

    // Fallback: Monaco doesn't ship a Python formatter by default.
    if (!isSupported && language === "python") {
      try {
        const model = editor.getModel?.();
        if (!model) return;

        const formatted = await formatPython(model.getValue(), {
          tabWidth: settings.tabSize,
        });

        model.pushEditOperations(
          [],
          [{ range: model.getFullModelRange(), text: formatted }],
          () => null,
        );
        toast.success("Formatted");
      } catch {
        toast.error("Couldn't format this code.");
      }
      return;
    }

    if (!isSupported) {
      toast.info("Formatting isn't available for this language yet.");
      return;
    }

    try {
      await action.run();
      toast.success("Formatted");
    } catch {
      toast.error("Couldn't format this code.");
    }
  }, [language, settings.tabSize]);

  const handleRun = () => {
    testPanelRef.current?.expand();
    testPanelRef.current?.resize(35);
    clearErrorHighlight();
    onRun(code, language);
  };

  const handleSubmit = () => {
    testPanelRef.current?.expand();
    testPanelRef.current?.resize(35);
    clearErrorHighlight();
    // Save as last submitted code when submitting
    saveAsLastSubmission(code, language);
    onSubmit(code, language);
  };

  const handleToggleEditorPanelCollapse = () => {
    if (isEditorPanelCollapsed) {
      editorPanelRef.current?.expand();
    } else {
      editorPanelRef.current?.collapse();
    }
  };

  const handleToggleTestPanelCollapse = () => {
    if (isTestPanelCollapsed) {
      testPanelRef.current?.expand();
    } else {
      testPanelRef.current?.collapse();
    }
  };

  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs';
  const monacoLanguage = monacoLanguageMap[language] || 'plaintext';

  const isEditorExpanded = expandedPanel === 'editor';
  const isTestcaseExpanded = expandedPanel === 'testcase';

  // If testcase is expanded, show only testcase panel
  if (isTestcaseExpanded) {
    return (
      <div className="h-full flex flex-col gap-1.5">
        <div className="h-full bg-card rounded-lg border border-border shadow-sm overflow-hidden">
          <TestCasePanel
            testCases={testCases}
            results={results}
            isRunning={isRunning}
            output={output}
            isExpanded={true}
            onToggleExpand={onExpandTestcase}
            activeTab={testCaseActiveTab}
            onTabChange={onTestCaseTabChange}
            language={language}
            userCodeLineCount={userCodeLineCount}
            onErrorLineClick={highlightErrorLine}
            globalError={globalError}
            isSubmit={isSubmit}
          />
        </div>
      </div>
    );
  }

  // If editor is expanded, show only editor panel (full height)
  if (isEditorExpanded) {
    return (
      <div className="h-full flex flex-col gap-1.5">
        <div 
          className="h-full flex flex-col bg-card rounded-lg border border-border shadow-sm overflow-hidden"
          onMouseEnter={() => setIsEditorHovered(true)}
          onMouseLeave={() => setIsEditorHovered(false)}
        >
          {/* First Header Row - Title and Controls */}
          <div className="flex items-center justify-between px-4 h-11 border-b border-border/50 bg-muted/40">
            <div className="flex items-center gap-2">
              <Braces className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Code</span>
            </div>
            <div className={cn(
              "flex items-center gap-0.5 transition-opacity",
              isEditorHovered ? "opacity-100" : "opacity-0"
            )}>
              {onExpandEditor && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={onExpandEditor}
                  title="Collapse panel"
                >
                  <Shrink className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Second Header Row - Language Selector and Tools */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-background">
            <div className="flex items-center gap-2">
              <Select value={language} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-[130px] h-7 text-sm bg-background border-none shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableLanguages.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {languageLabels[lang] || lang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Format code"
                onClick={handleFormatCode}
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7" 
                title="Restore last submission"
                onClick={handleRetrieveLastCode}
                disabled={!hasLastSubmission}
              >
                <FileCode className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7" 
                onClick={handleReset}
                title="Reset code"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <PracticeEditorSettingsPopover settings={settings} onChange={updateSetting} />
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7" 
                onClick={() => document.documentElement.requestFullscreen()}
                title="Fullscreen"
              >
                <Maximize className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language={monacoLanguage}
              value={code}
              theme={monacoTheme}
              onChange={handleEditorChange}
              onMount={handleEditorMount}
              options={{
                fontSize: settings.fontSize,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                lineNumbers: settings.lineNumbers ? "on" : "off",
                lineNumbersMinChars: 1,
                lineDecorationsWidth: 8,
                glyphMargin: true,
                folding: true,
                foldingHighlight: true,
                showFoldingControls: "always",
                minimap: { enabled: settings.minimap },
                wordWrap: settings.wordWrap ? "on" : "off",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: settings.tabSize,
                insertSpaces: true,
                renderIndentGuides: true,
                padding: { top: 16, bottom: 16 },
                scrollbar: {
                  vertical: "auto",
                  horizontal: "auto",
                  verticalScrollbarSize: 10,
                  horizontalScrollbarSize: 10,
                },
                overviewRulerBorder: false,
                hideCursorInOverviewRuler: true,
                overviewRulerLanes: 0,
                renderLineHighlight: "line",
                cursorBlinking: "smooth",
                cursorSmoothCaretAnimation: "on",
                smoothScrolling: true,
                contextmenu: true,
                bracketPairColorization: { enabled: true },
                guides: {
                  indentation: true,
                  bracketPairs: true,
                },
              }}
            />
          </div>

          {/* Footer with Run/Submit */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/40">
            <span className="text-xs text-muted-foreground">
              Press <kbd className="px-1 py-0.5 text-[10px] rounded bg-muted border border-border">Ctrl</kbd> + <kbd className="px-1 py-0.5 text-[10px] rounded bg-muted border border-border">Enter</kbd> to run
            </span>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRun}
                disabled={isRunning}
              >
                Run
              </Button>
              <Button 
                size="sm"
                onClick={handleSubmit}
                disabled={isRunning}
              >
                Submit
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default view: both panels
  return (
    <div className="h-full min-h-0 flex flex-col gap-1.5">
      <ResizablePanelGroup direction="vertical" className="flex-1 min-h-0">
        {/* Code Editor Panel */}
        <ResizablePanel
          ref={editorPanelRef}
          defaultSize={65}
          minSize={30}
          collapsible
          collapsedSize={8}
          className="min-h-0"
          onCollapse={() => setIsEditorPanelCollapsed(true)}
          onExpand={() => setIsEditorPanelCollapsed(false)}
        >
          <div 
            className="h-full flex flex-col bg-card rounded-lg border border-border shadow-sm overflow-hidden"
            onMouseEnter={() => setIsEditorHovered(true)}
            onMouseLeave={() => setIsEditorHovered(false)}
          >
            {/* First Header Row - Title and Controls (Always visible) */}
            <div className="flex items-center justify-between px-4 h-11 border-b border-border/50 bg-muted/40">
              <div className="flex items-center gap-2">
                <Braces className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Code</span>
              </div>
              <div className={cn(
                "flex items-center gap-0.5 transition-opacity",
                isEditorHovered ? "opacity-100" : "opacity-0"
              )}>
                {/* Collapse Button */}
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleToggleEditorPanelCollapse}
                  title={isEditorPanelCollapsed ? "Show editor" : "Hide editor"}
                >
                  {isEditorPanelCollapsed ? (
                    <PanelTopOpen className="h-4 w-4" />
                  ) : (
                    <PanelTopClose className="h-4 w-4" />
                  )}
                </Button>
                {/* Expand Panel Button */}
                {onExpandEditor && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7"
                    onClick={onExpandEditor}
                    title="Expand panel"
                  >
                    <Expand className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {!isEditorPanelCollapsed && (
              <>
                {/* Second Header Row - Language Selector and Tools (Hidden when collapsed) */}
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-background">
                  <div className="flex items-center gap-2">
                    <Select value={language} onValueChange={handleLanguageChange}>
                      <SelectTrigger className="w-[130px] h-7 text-sm bg-background border-none shadow-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableLanguages.map((lang) => (
                          <SelectItem key={lang} value={lang}>
                            {languageLabels[lang] || lang}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Format code"
                      onClick={handleFormatCode}
                    >
                      <AlignLeft className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7" 
                      title="Restore last submission"
                      onClick={handleRetrieveLastCode}
                      disabled={!hasLastSubmission}
                    >
                      <FileCode className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7" 
                      onClick={handleReset}
                      title="Reset code"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <PracticeEditorSettingsPopover settings={settings} onChange={updateSetting} />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7" 
                      onClick={() => document.documentElement.requestFullscreen()}
                      title="Fullscreen"
                    >
                      <Maximize className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Monaco Editor */}
                <div className="flex-1 overflow-hidden">
                  <Editor
                    height="100%"
                    language={monacoLanguage}
                    value={code}
                    theme={monacoTheme}
                    onChange={handleEditorChange}
                    onMount={handleEditorMount}
                    options={{
                      fontSize: settings.fontSize,
                      fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                      lineNumbers: settings.lineNumbers ? "on" : "off",
                      lineNumbersMinChars: 1,
                      lineDecorationsWidth: 8,
                      glyphMargin: true,
                      folding: true,
                      foldingHighlight: true,
                      showFoldingControls: "always",
                      minimap: { enabled: settings.minimap },
                      wordWrap: settings.wordWrap ? "on" : "off",
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: settings.tabSize,
                      insertSpaces: true,
                      renderIndentGuides: true,
                      padding: { top: 16, bottom: 16 },
                      scrollbar: {
                        vertical: "auto",
                        horizontal: "auto",
                        verticalScrollbarSize: 10,
                        horizontalScrollbarSize: 10,
                      },
                      overviewRulerBorder: false,
                      hideCursorInOverviewRuler: true,
                      overviewRulerLanes: 0,
                      renderLineHighlight: "line",
                      cursorBlinking: "smooth",
                      cursorSmoothCaretAnimation: "on",
                      smoothScrolling: true,
                      contextmenu: true,
                      bracketPairColorization: { enabled: true },
                      guides: {
                        indentation: true,
                        bracketPairs: true,
                      },
                    }}
                  />
                </div>

                {/* Footer with Run/Submit */}
                <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/40">
                  <span className="text-xs text-muted-foreground">
                    Press <kbd className="px-1 py-0.5 text-[10px] rounded bg-muted border border-border">Ctrl</kbd> + <kbd className="px-1 py-0.5 text-[10px] rounded bg-muted border border-border">Enter</kbd> to run
                  </span>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleRun}
                      disabled={isRunning}
                    >
                      Run
                    </Button>
                    <Button 
                      size="sm"
                      onClick={handleSubmit}
                      disabled={isRunning}
                    >
                      Submit
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Test Case Panel */}
        <ResizablePanel 
          ref={testPanelRef} 
          defaultSize={35} 
          minSize={10} 
          collapsible
          collapsedSize={8}
          className="min-h-0"
          onCollapse={() => setIsTestPanelCollapsed(true)}
          onExpand={() => setIsTestPanelCollapsed(false)}
        >
          <div className="h-full bg-card rounded-lg border border-border shadow-sm overflow-hidden">
            <TestCasePanel
              testCases={testCases}
              results={results}
              isRunning={isRunning}
              output={output}
              isExpanded={false}
              onToggleExpand={onExpandTestcase}
              isCollapsed={isTestPanelCollapsed}
              onToggleCollapse={handleToggleTestPanelCollapse}
              activeTab={testCaseActiveTab}
              onTabChange={onTestCaseTabChange}
              language={language}
              userCodeLineCount={userCodeLineCount}
              onErrorLineClick={highlightErrorLine}
              globalError={globalError}
              isSubmit={isSubmit}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
