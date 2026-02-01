import { useState, useRef } from "react";
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
import { cn } from "@/lib/utils";

interface CodeEditorProps {
  problem: ProblemDetail;
  supportedLanguages?: string[];
  onRun: (code: string, language: string) => void;
  onSubmit: (code: string, language: string) => void;
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

export function CodeEditor({ problem, supportedLanguages, onRun, onSubmit }: CodeEditorProps) {
  const availableLanguages = supportedLanguages && supportedLanguages.length > 0 
    ? supportedLanguages 
    : Object.keys(problem.starterCode);
  const [language, setLanguage] = useState(availableLanguages[0] || "python");
  const [code, setCode] = useState(problem.starterCode[availableLanguages[0]] || "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    setCode(problem.starterCode[newLang] || '');
  };

  const handleReset = () => {
    setCode(problem.starterCode[language] || '');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle Tab key for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newCode = code.substring(0, start) + '    ' + code.substring(end);
      setCode(newCode);
      // Set cursor position after tab
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 4;
        }
      }, 0);
    }
    // Ctrl+Enter to run
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      onRun(code, language);
    }
  };

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

      {/* Code Area */}
      <div className="flex-1 overflow-hidden flex bg-background">

        {/* Code Editor */}
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
          className={cn(
            "flex-1 p-4 resize-none",
            "font-mono text-sm leading-6",
            "bg-background text-foreground",
            "focus:outline-none",
            "overflow-auto"
          )}
          style={{ tabSize: 4 }}
          spellCheck={false}
          placeholder="Write your code here..."
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
