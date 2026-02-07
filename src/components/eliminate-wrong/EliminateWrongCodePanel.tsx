/**
 * EliminateWrongCodePanel
 * Displays read-only context code with syntax highlighting.
 */
import { Maximize2, Minimize2, ChevronUp, ChevronDown, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface Props {
  code: string;
  language: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const LANGUAGE_MAP: Record<string, string> = {
  python: "python",
  javascript: "javascript",
  typescript: "typescript",
  java: "java",
  c: "c",
  cpp: "cpp",
  sql: "sql",
  r: "r",
  csharp: "csharp",
};

export function EliminateWrongCodePanel({
  code,
  language,
  isExpanded,
  onToggleExpand,
  isCollapsed,
  onToggleCollapse,
}: Props) {
  const { resolvedTheme } = useTheme();

  if (isCollapsed) {
    return (
      <div className="h-full flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Context Code</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleCollapse}>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (!code.trim()) {
    return (
      <div className="h-full flex flex-col">
        <div className="h-11 flex items-center justify-between px-4 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-2">
            <Code2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Context Code</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          No context code provided
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-11 flex items-center justify-between px-4 border-b border-border/50 shrink-0 bg-muted/40">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Context Code</span>
          <span className="text-xs text-muted-foreground capitalize">({language})</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity">
          {onToggleCollapse && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleCollapse}>
              <ChevronUp className="h-4 w-4" />
            </Button>
          )}
          {onToggleExpand && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleExpand}>
              {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>
      </div>

      {/* Monaco Read-only */}
      <div className="flex-1 overflow-hidden" style={{ overscrollBehavior: "contain" }}>
        <Editor
          height="100%"
          language={LANGUAGE_MAP[language] || language}
          value={code}
          theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            lineNumbers: "on",
            renderLineHighlight: "none",
            domReadOnly: true,
            contextmenu: false,
            folding: true,
            padding: { top: 12 },
          }}
        />
      </div>
    </div>
  );
}
