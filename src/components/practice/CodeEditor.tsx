import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Send, RotateCcw, Settings, Maximize2 } from "lucide-react";
import { ProblemDetail } from "./problemDetailData";
import { cn } from "@/lib/utils";

interface CodeEditorProps {
  problem: ProblemDetail;
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

export function CodeEditor({ problem, onRun, onSubmit }: CodeEditorProps) {
  const availableLanguages = Object.keys(problem.starterCode);
  const [language, setLanguage] = useState(availableLanguages[0]);
  const [code, setCode] = useState(problem.starterCode[availableLanguages[0]]);

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    setCode(problem.starterCode[newLang] || '');
  };

  const handleReset = () => {
    setCode(problem.starterCode[language] || '');
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
      <div className="flex-1 overflow-hidden">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className={cn(
            "w-full h-full p-4 font-mono text-sm bg-background text-foreground resize-none",
            "focus:outline-none",
            "leading-relaxed"
          )}
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
            className="gap-2"
          >
            <Play className="h-4 w-4" />
            Run
          </Button>
          <Button 
            size="sm" 
            onClick={() => onSubmit(code, language)}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
}
