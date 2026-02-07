import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Braces,
  RotateCcw,
  Settings,
  Maximize,
  Play,
  Send,
  Expand,
  Shrink,
  AlignLeft,
  PanelTopClose,
  PanelTopOpen,
} from "lucide-react";
import Editor, { OnMount, Monaco } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { PlatformSettingsModal } from "@/components/practice/PlatformSettingsModal";
import { formatPython, registerMonacoPythonFormatter } from "@/lib/formatters/pythonFormatter";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const monacoLanguageMap: Record<string, string> = {
  python: "python",
  javascript: "javascript",
  typescript: "typescript",
  java: "java",
  cpp: "cpp",
};

interface FixErrorCodeEditorProps {
  initialCode: string;
  language: string;
  onRun: (code: string) => void;
  onSubmit: (code: string) => void;
  isRunning: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function FixErrorCodeEditor({
  initialCode,
  language,
  onRun,
  onSubmit,
  isRunning,
  isExpanded = false,
  onToggleExpand,
  isCollapsed = false,
  onToggleCollapse,
}: FixErrorCodeEditorProps) {
  const { theme } = useTheme();
  const { settings, monacoOptions } = usePlatformSettings();
  const [code, setCode] = useState(initialCode);
  const [isHovered, setIsHovered] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const codeRef = useRef(code);
  const tabWidthRef = useRef(settings.codeEditor.tabSize);

  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  useEffect(() => {
    tabWidthRef.current = settings.codeEditor.tabSize;
  }, [settings.codeEditor.tabSize]);

  // Reset code when problem changes
  useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  const handleEditorChange = useCallback((value: string | undefined) => {
    setCode(value || "");
    // Clear error decorations
    if (editorRef.current) {
      decorationsRef.current = editorRef.current.deltaDecorations(
        decorationsRef.current,
        []
      );
    }
  }, []);

  const handleEditorMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;
      registerMonacoPythonFormatter(monaco, () => tabWidthRef.current);

      editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
        () => {
          onRun(codeRef.current);
        }
      );
    },
    [onRun]
  );

  // Apply editor settings changes
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.updateOptions(monacoOptions);
    const model = editor.getModel?.();
    model?.updateOptions?.({
      tabSize: settings.codeEditor.tabSize,
      insertSpaces: settings.codeEditor.indentationType === "spaces",
    });
  }, [monacoOptions, settings.codeEditor.tabSize, settings.codeEditor.indentationType]);

  const handleReset = () => {
    setCode(initialCode);
    if (editorRef.current) {
      decorationsRef.current = editorRef.current.deltaDecorations(
        decorationsRef.current,
        []
      );
    }
  };

  const handleFormatCode = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor) return;

    const action = editor.getAction?.("editor.action.formatDocument");
    const isSupported =
      !!action &&
      (typeof action.isSupported !== "function" || action.isSupported());

    if (!isSupported && language === "python") {
      try {
        const model = editor.getModel?.();
        if (!model) return;
        const formatted = await formatPython(model.getValue(), {
          tabWidth: settings.codeEditor.tabSize,
        });
        model.pushEditOperations(
          [],
          [{ range: model.getFullModelRange(), text: formatted }],
          () => null
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
  }, [language, settings.codeEditor.tabSize]);

  const monacoTheme = theme === "dark" ? "vs-dark" : "vs";
  const monacoLanguage = monacoLanguageMap[language] || "plaintext";

  return (
    <>
      <div
        className="h-full flex flex-col bg-card overflow-hidden"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Header Row 1 - Always visible */}
        <div className="flex items-center justify-between px-4 h-11 border-b border-border/50 bg-muted/40 shrink-0">
          <div className="flex items-center gap-2">
            <Braces className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Code</span>
            <span className="text-xs text-muted-foreground font-mono">
              {language}
            </span>
          </div>
          <div
            className={cn(
              "flex items-center gap-0.5 transition-opacity",
              isHovered || isExpanded ? "opacity-100" : "opacity-0"
            )}
          >
            {/* Collapse first */}
            {onToggleCollapse && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onToggleCollapse}
                title={isCollapsed ? "Show editor" : "Hide editor"}
              >
                {isCollapsed ? (
                  <PanelTopOpen className="h-4 w-4" />
                ) : (
                  <PanelTopClose className="h-4 w-4" />
                )}
              </Button>
            )}
            {/* Expand second */}
            {onToggleExpand && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
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

        {!isCollapsed && (
          <>
            {/* Header Row 2 - Tools */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-background shrink-0">
              <span className="text-xs text-muted-foreground">
                Fix the buggy code below
              </span>
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
                  onClick={handleReset}
                  title="Reset to buggy code"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setSettingsModalOpen(true)}
                  title="Settings"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => document.documentElement.requestFullscreen?.()}
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
                  ...monacoOptions,
                  fontFamily:
                    monacoOptions.fontFamily ||
                    "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                  lineNumbersMinChars: 1,
                  lineDecorationsWidth: 8,
                  glyphMargin: true,
                  folding: true,
                  showFoldingControls: "always",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
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
            <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/40 shrink-0">
              <span className="text-xs text-muted-foreground">
                Press{" "}
                <kbd className="px-1 py-0.5 text-[10px] rounded bg-muted border border-border">
                  Ctrl
                </kbd>{" "}
                +{" "}
                <kbd className="px-1 py-0.5 text-[10px] rounded bg-muted border border-border">
                  Enter
                </kbd>{" "}
                to run
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => onRun(code)}
                  disabled={isRunning}
                >
                  <Play className="h-3.5 w-3.5" />
                  Run
                </Button>
                <Button
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => onSubmit(code)}
                  disabled={isRunning}
                >
                  <Send className="h-3.5 w-3.5" />
                  Submit
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <PlatformSettingsModal
        open={settingsModalOpen}
        onOpenChange={setSettingsModalOpen}
      />
    </>
  );
}
