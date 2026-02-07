/**
 * PredictCodePanel
 * Read-only Monaco code viewer panel for the Predict workspace left side.
 */
import { useState, useCallback } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Braces,
  Copy,
  Check,
  Maximize,
  Expand,
  Shrink,
  PanelTopOpen,
  PanelTopClose,
} from "lucide-react";
import Editor from "@monaco-editor/react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { PredictOutputProblem } from "@/hooks/usePredictOutputProblems";

interface PredictCodePanelProps {
  problem: PredictOutputProblem;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const monacoLanguageMap: Record<string, string> = {
  python: "python",
  javascript: "javascript",
  java: "java",
  c: "c",
  cpp: "cpp",
  sql: "sql",
};

export function PredictCodePanel({
  problem,
  isExpanded = false,
  onToggleExpand,
  isCollapsed = false,
  onToggleCollapse,
}: PredictCodePanelProps) {
  const { theme } = useTheme();
  const monacoTheme = theme === "dark" ? "vs-dark" : "vs";
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(problem.code);
    setCopied(true);
    toast.success("Code copied");
    setTimeout(() => setCopied(false), 2000);
  }, [problem.code]);

  const lineCount = problem.code.split("\n").length;
  const monacoHeight = lineCount * 20 + 32;

  // Collapsed state
  if (isCollapsed && !isExpanded) {
    return (
      <div
        className="h-full flex flex-col items-center bg-card py-3 group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Braces className="h-4 w-4 text-primary mb-2" />
        <span
          className="font-medium text-xs text-muted-foreground"
          style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
        >
          Code
        </span>
        <div className="mt-auto flex flex-col items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {onToggleCollapse && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onToggleCollapse}>
              <PanelTopOpen className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col bg-card overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-11 border-b border-border/50 bg-muted/40 shrink-0">
        <div className="flex items-center gap-2">
          <Braces className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Code</span>
          <Badge variant="outline" className="text-xs capitalize h-6">
            {problem.language}
          </Badge>
        </div>
        <div
          className={cn(
            "flex items-center gap-0.5 transition-opacity",
            isHovered ? "opacity-100" : "opacity-0"
          )}
        >
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy} title="Copy code">
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => document.documentElement.requestFullscreen()}
            title="Fullscreen"
          >
            <Maximize className="h-4 w-4" />
          </Button>
          {onToggleCollapse && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleCollapse}>
              <PanelTopClose className="h-4 w-4" />
            </Button>
          )}
          {onToggleExpand && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleExpand}>
              {isExpanded ? <Shrink className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          value={problem.code}
          language={monacoLanguageMap[problem.language] || problem.language}
          theme={monacoTheme}
          options={{
            readOnly: true,
            domReadOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            lineNumbers: "on",
            lineNumbersMinChars: 1,
            lineDecorationsWidth: 8,
            glyphMargin: false,
            renderLineHighlight: "line",
            folding: true,
            contextmenu: false,
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
            padding: { top: 16, bottom: 16 },
            scrollbar: { vertical: "auto", horizontal: "auto" },
            wordWrap: "on",
            dragAndDrop: false,
            overviewRulerBorder: false,
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            bracketPairColorization: { enabled: true },
            guides: { indentation: true, bracketPairs: true },
            smoothScrolling: true,
          }}
        />
      </div>
    </div>
  );
}
