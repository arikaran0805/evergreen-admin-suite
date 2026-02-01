import { useState, useRef, useCallback } from "react";
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
import { RotateCcw, Settings, Maximize2, Minimize2, PanelTopClose, PanelTopOpen } from "lucide-react";
import Editor, { OnMount } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { TestCasePanel, TestResult } from "./TestCasePanel";
import { cn } from "@/lib/utils";

interface ProblemWorkspaceProps {
  starterCode: Record<string, string>;
  supportedLanguages: string[];
  testCases: { input: string; expected: string }[];
  onRun: (code: string, language: string) => void;
  onSubmit: (code: string, language: string) => void;
  results: TestResult[];
  isRunning: boolean;
  output: string;
  expandedPanel?: 'editor' | 'testcase' | null;
  onExpandEditor?: () => void;
  onExpandTestcase?: () => void;
  collapsedPanel?: 'editor' | 'testcase' | null;
  onCollapseEditor?: () => void;
  onCollapseTestcase?: () => void;
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
  starterCode,
  supportedLanguages,
  testCases,
  onRun,
  onSubmit,
  results,
  isRunning,
  output,
  expandedPanel,
  onExpandEditor,
  onExpandTestcase,
  collapsedPanel,
  onCollapseEditor,
  onCollapseTestcase,
}: ProblemWorkspaceProps) {
  const { theme } = useTheme();
  const testPanelRef = useRef<ImperativePanelHandle>(null);
  const [isEditorHovered, setIsEditorHovered] = useState(false);
  const [isTestPanelCollapsed, setIsTestPanelCollapsed] = useState(false);
  
  const availableLanguages = supportedLanguages.length > 0 
    ? supportedLanguages 
    : Object.keys(starterCode);
  const [language, setLanguage] = useState(availableLanguages[0] || "python");
  const [code, setCode] = useState(starterCode[availableLanguages[0]] || "");

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    setCode(starterCode[newLang] || '');
  };

  const handleReset = () => {
    setCode(starterCode[language] || '');
  };

  const handleEditorChange = useCallback((value: string | undefined) => {
    setCode(value || '');
  }, []);

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      handleRun();
    });
  }, []);

  const handleRun = () => {
    testPanelRef.current?.resize(35);
    setIsTestPanelCollapsed(false);
    onRun(code, language);
  };

  const handleSubmit = () => {
    testPanelRef.current?.resize(35);
    setIsTestPanelCollapsed(false);
    onSubmit(code, language);
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
          {/* Editor Header with Language Selector and Actions */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/40">
            <div className="flex items-center gap-2">
              <Select value={language} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-[130px] h-8 text-sm bg-background">
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
            <div className="flex items-center gap-1.5">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                onClick={handleReset}
                title="Reset code"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Settings">
                <Settings className="h-4 w-4" />
              </Button>
              {onExpandEditor && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn(
                    "h-8 w-8 transition-opacity",
                    isEditorHovered || isEditorExpanded ? "opacity-100" : "opacity-0"
                  )}
                  onClick={onExpandEditor}
                  title="Exit fullscreen"
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
              )}
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
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                lineNumbers: "on",
                lineNumbersMinChars: 3,
                lineDecorationsWidth: 16,
                glyphMargin: false,
                folding: false,
                minimap: { enabled: false },
                wordWrap: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
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
    <div className="h-full flex flex-col gap-1.5">
      <ResizablePanelGroup direction="vertical" className="flex-1">
        {/* Code Editor Panel */}
        <ResizablePanel defaultSize={65} minSize={30} className="min-h-0">
          <div 
            className="h-full flex flex-col bg-card rounded-lg border border-border shadow-sm overflow-hidden"
            onMouseEnter={() => setIsEditorHovered(true)}
            onMouseLeave={() => setIsEditorHovered(false)}
          >
            {/* Editor Header with Language Selector and Actions */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/40">
              <div className="flex items-center gap-2">
                <Select value={language} onValueChange={handleLanguageChange}>
                  <SelectTrigger className="w-[130px] h-8 text-sm bg-background">
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
              <div className="flex items-center gap-1.5">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={handleReset}
                  title="Reset code"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Settings">
                  <Settings className="h-4 w-4" />
                </Button>
                {/* Collapse & Expand Buttons - Show on hover */}
                <div className={cn(
                  "flex items-center gap-0.5 transition-opacity",
                  isEditorHovered ? "opacity-100" : "opacity-0"
                )}>
                  {onCollapseEditor && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={onCollapseEditor}
                      title={collapsedPanel === 'editor' ? "Show editor" : "Hide editor"}
                    >
                      {collapsedPanel === 'editor' ? (
                        <PanelTopOpen className="h-4 w-4" />
                      ) : (
                        <PanelTopClose className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  {onExpandEditor && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={onExpandEditor}
                      title="Fullscreen"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
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
                  fontSize: 14,
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                  lineNumbers: "on",
                  lineNumbersMinChars: 3,
                  lineDecorationsWidth: 16,
                  glyphMargin: false,
                  folding: false,
                  minimap: { enabled: false },
                  wordWrap: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 4,
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
        </ResizablePanel>

        <ResizableHandle />

        {/* Test Case Panel */}
        <ResizablePanel 
          ref={testPanelRef} 
          defaultSize={35} 
          minSize={10} 
          collapsible
          collapsedSize={0}
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
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
