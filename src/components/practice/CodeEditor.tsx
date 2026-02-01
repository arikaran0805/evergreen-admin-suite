import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RotateCcw, Settings, Maximize2 } from "lucide-react";
import { ProblemDetail } from "./problemDetailData";
import Editor, { OnMount } from "@monaco-editor/react";
import { useTheme } from "next-themes";

interface CodeEditorProps {
  problem: ProblemDetail;
  supportedLanguages?: string[];
  onRun: (code: string, language: string) => void;
  onSubmit: (code: string, language: string) => void;
  readOnly?: boolean;
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

// Map our language names to Monaco language identifiers
const monacoLanguageMap: Record<string, string> = {
  python: "python",
  javascript: "javascript",
  typescript: "typescript",
  java: "java",
  cpp: "cpp",
  sql: "sql",
  mysql: "sql",
};

export function CodeEditor({ problem, supportedLanguages, onRun, onSubmit, readOnly = false }: CodeEditorProps) {
  const { theme } = useTheme();
  const availableLanguages = supportedLanguages && supportedLanguages.length > 0 
    ? supportedLanguages 
    : Object.keys(problem.starterCode);
  const [language, setLanguage] = useState(availableLanguages[0] || "python");
  const [code, setCode] = useState(problem.starterCode[availableLanguages[0]] || "");

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    setCode(problem.starterCode[newLang] || '');
  };

  const handleReset = () => {
    setCode(problem.starterCode[language] || '');
  };

  const handleEditorChange = useCallback((value: string | undefined) => {
    setCode(value || '');
  }, []);

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    // Add Ctrl+Enter keybinding to run code
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onRun(code, language);
    });
  }, [onRun, code, language]);

  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs';
  const monacoLanguage = monacoLanguageMap[language] || 'plaintext';

  return (
    <div className="h-full flex flex-col bg-card border-l border-border/50">
      {/* Editor Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-2">
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-[140px] h-8 text-sm bg-background">
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
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Code Area - Monaco Editor */}
      <div className="flex-1 overflow-hidden bg-background">
        <Editor
          height="100%"
          language={monacoLanguage}
          value={code}
          theme={monacoTheme}
          onChange={handleEditorChange}
          onMount={handleEditorMount}
          options={{
            readOnly,
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

      {/* Editor Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/30">
        <div className="text-xs text-muted-foreground">
          Press Ctrl+Enter to run
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onRun(code, language)}
          >
            Run
          </Button>
          <Button 
            size="sm" 
            onClick={() => onSubmit(code, language)}
          >
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
}
