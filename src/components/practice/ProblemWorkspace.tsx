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
import { RotateCcw, Settings, Maximize2 } from "lucide-react";
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
}: ProblemWorkspaceProps) {
  const { theme } = useTheme();
  const testPanelRef = useRef<ImperativePanelHandle>(null);
  
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
    onRun(code, language);
  };

  const handleSubmit = () => {
    testPanelRef.current?.resize(35);
    onSubmit(code, language);
  };

  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs';
  const monacoLanguage = monacoLanguageMap[language] || 'plaintext';

  return (
    <div className="h-full flex flex-col">
      <ResizablePanelGroup direction="vertical" className="flex-1">
        {/* Code Editor Panel */}
        <ResizablePanel defaultSize={65} minSize={30} className="min-h-0">
          <div className="h-full flex flex-col bg-card">
            {/* Editor Header with Language Selector and Actions */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-muted/30">
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
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Fullscreen">
                  <Maximize2 className="h-4 w-4" />
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
            <div className="flex items-center justify-between px-3 py-2 border-t border-border/50 bg-muted/20">
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

        <ResizableHandle withHandle />

        {/* Test Case Panel */}
        <ResizablePanel 
          ref={testPanelRef} 
          defaultSize={35} 
          minSize={10} 
          collapsible
          collapsedSize={10}
          className="min-h-0"
        >
          <TestCasePanel
            testCases={testCases}
            results={results}
            isRunning={isRunning}
            output={output}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
