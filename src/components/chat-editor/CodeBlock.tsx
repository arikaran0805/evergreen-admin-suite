/**
 * CodeBlock - Monaco Editor-based interactive code block for chat
 * 
 * Features:
 * - Monaco Editor with syntax highlighting and line numbers
 * - Read-only by default, toggle to edit mode
 * - Code execution for supported languages
 * - Collapsible output panel
 */

import { useState, useRef, useCallback, useEffect } from "react";
import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import { cn } from "@/lib/utils";
import { Copy, Check, Play, Pencil, Loader2, X, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

// Monaco language mapping
const MONACO_LANGUAGE_MAP: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  bash: "shell",
  sh: "shell",
  cs: "csharp",
  plaintext: "plaintext",
  text: "plaintext",
};

// Languages that support execution
const EXECUTABLE_LANGUAGES = ["python", "javascript", "typescript"];

interface CodeBlockProps {
  code: string;
  language?: string;
  isMentorBubble?: boolean;
  overrideTheme?: string;
  onEdit?: (code: string) => void;
  editable?: boolean;
  showToolbarAlways?: boolean;
}

const CodeBlock = ({ 
  code, 
  language = "", 
  isMentorBubble = false, 
  overrideTheme,
  onEdit,
  editable = false,
  showToolbarAlways = false,
}: CodeBlockProps) => {
  const [currentCode, setCurrentCode] = useState(code);
  const [copied, setCopied] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [outputError, setOutputError] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [outputExpanded, setOutputExpanded] = useState(true);
  
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  
  const normalizedLang = MONACO_LANGUAGE_MAP[language.toLowerCase()] || language.toLowerCase() || "plaintext";
  const canExecute = EXECUTABLE_LANGUAGES.includes(normalizedLang);

  // Calculate editor height based on line count
  const lineCount = currentCode.split('\n').length;
  const editorHeight = Math.max(60, lineCount * 19 + 20);

  // Sync code when prop changes
  useEffect(() => {
    setCurrentCode(code);
  }, [code]);

  const handleEditorMount: OnMount = (editorInstance, monaco) => {
    editorRef.current = editorInstance;
    monacoRef.current = monaco;
    
    // Configure Monaco theme for a clean light look
    monaco.editor.defineTheme('codeblock-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '0000FF' },
        { token: 'string', foreground: 'A31515' },
        { token: 'number', foreground: 'C67F00' },
        { token: 'comment', foreground: '008000', fontStyle: 'italic' },
        { token: 'function', foreground: '795E26' },
        { token: 'variable', foreground: '001080' },
        { token: 'type', foreground: '267F99' },
      ],
      colors: {
        'editor.background': '#FAFAFA',
        'editor.foreground': '#1F2937',
        'editor.lineHighlightBackground': '#F3F4F6',
        'editorLineNumber.foreground': '#9CA3AF',
        'editorLineNumber.activeForeground': '#6B7280',
        'editor.selectionBackground': '#BFDBFE',
        'editorCursor.foreground': '#3B82F6',
      },
    });
    
    // Theme for mentor bubble (blue tint)
    monaco.editor.defineTheme('codeblock-mentor', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '1E40AF' },
        { token: 'string', foreground: '991B1B' },
        { token: 'number', foreground: 'B45309' },
        { token: 'comment', foreground: '166534', fontStyle: 'italic' },
        { token: 'function', foreground: '6B21A8' },
      ],
      colors: {
        'editor.background': '#1E40AF20',
        'editor.foreground': '#1E3A8A',
        'editor.lineHighlightBackground': '#1E40AF30',
        'editorLineNumber.foreground': '#3B82F680',
        'editorLineNumber.activeForeground': '#2563EB',
        'editor.selectionBackground': '#93C5FD',
        'editorCursor.foreground': '#2563EB',
      },
    });
    
    monaco.editor.setTheme(isMentorBubble ? 'codeblock-mentor' : 'codeblock-light');
  };

  const handleCodeChange = useCallback((value: string | undefined) => {
    const newCode = value || '';
    setCurrentCode(newCode);
    onEdit?.(newCode);
  }, [onEdit]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  const handleEditToggle = () => {
    if (!isEditMode) {
      // Enter edit mode
      setIsEditMode(true);
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.updateOptions({ 
            readOnly: false,
            renderLineHighlight: 'line',
          });
          editorRef.current.focus();
          const model = editorRef.current.getModel();
          if (model) {
            const lastLine = model.getLineCount();
            const lastCol = model.getLineMaxColumn(lastLine);
            editorRef.current.setPosition({ lineNumber: lastLine, column: lastCol });
          }
        }
      }, 0);
    } else {
      // Exit edit mode - keep changes
      setIsEditMode(false);
      if (editorRef.current) {
        editorRef.current.updateOptions({ 
          readOnly: true,
          renderLineHighlight: 'none',
        });
      }
    }
  };

  const handleRun = async () => {
    if (!canExecute) return;
    
    setIsRunning(true);
    setOutput(null);
    setOutputError(false);
    setShowOutput(true);
    setOutputExpanded(true);

    try {
      const { data, error } = await supabase.functions.invoke('execute-code', {
        body: { 
          code: currentCode, 
          language: normalizedLang 
        },
      });

      if (error) {
        setOutput(error.message || 'Execution failed');
        setOutputError(true);
      } else if (data?.error) {
        setOutput(data.error);
        setOutputError(true);
      } else {
        setOutput(data?.output || 'No output');
        setOutputError(false);
      }
    } catch (err: any) {
      setOutput(err.message || 'Failed to execute code');
      setOutputError(true);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCloseOutput = () => {
    setShowOutput(false);
  };

  // Visibility class for toolbar buttons
  const toolbarVisibility = showToolbarAlways ? "opacity-100" : "opacity-0 group-hover:opacity-100";

  return (
    <div className={cn("relative group mt-3 w-full", !showToolbarAlways && "min-w-[450px]")}>
      {/* Main container */}
      <div className={cn(
        "rounded-xl border overflow-hidden",
        isMentorBubble 
          ? "bg-blue-600/20 border-blue-400/30"
          : "bg-[#FAFAFA] border-border/40"
      )}>
        {/* Header with language and action buttons */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          {language && (
            <span className={cn(
              "text-[11px] uppercase tracking-wider font-medium",
              isMentorBubble ? "text-blue-200/70" : "text-muted-foreground/70"
            )}>
              {language}
            </span>
          )}
          <div className="flex items-center gap-0.5 ml-auto">
            {/* Edit/Cancel button */}
            {editable && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleEditToggle}
                className={cn(
                  "h-7 w-7 transition-opacity",
                  toolbarVisibility,
                  isMentorBubble
                    ? "text-blue-100 hover:text-white hover:bg-blue-500/30"
                    : "text-muted-foreground/60 hover:text-foreground hover:bg-transparent"
                )}
              >
                {isEditMode ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
              </Button>
            )}
            
            {/* Run button */}
            {canExecute && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRun}
                disabled={isRunning}
                className={cn(
                  "h-7 w-7 transition-opacity",
                  toolbarVisibility,
                  isMentorBubble
                    ? "text-blue-100 hover:text-green-300 hover:bg-green-500/20"
                    : "text-muted-foreground/60 hover:text-primary hover:bg-transparent"
                )}
              >
                {isRunning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>
            )}
            
            {/* Copy button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className={cn(
                "h-7 w-7 transition-opacity",
                toolbarVisibility,
                isMentorBubble 
                  ? "text-blue-100 hover:text-white hover:bg-blue-500/30"
                  : "text-muted-foreground/60 hover:text-foreground hover:bg-transparent"
              )}
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
        
        {/* Monaco Editor */}
        <div className="px-1">
          <Editor
            height={editorHeight}
            language={normalizedLang}
            value={currentCode}
            onChange={handleCodeChange}
            onMount={handleEditorMount}
            options={{
              readOnly: !isEditMode,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              lineNumbers: 'on',
              lineNumbersMinChars: 2,
              lineDecorationsWidth: 8,
              folding: false,
              glyphMargin: false,
              renderLineHighlight: isEditMode ? 'line' : 'none',
              scrollbar: {
                vertical: 'hidden',
                horizontal: 'auto',
                horizontalScrollbarSize: 6,
              },
              overviewRulerLanes: 0,
              hideCursorInOverviewRuler: true,
              overviewRulerBorder: false,
              contextmenu: false,
              fontSize: 14,
              fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, 'Cascadia Code', Consolas, monospace",
              padding: { top: 8, bottom: 8 },
              wordWrap: 'on',
              automaticLayout: true,
            }}
            theme={isMentorBubble ? 'codeblock-mentor' : 'codeblock-light'}
            loading={
              <div className="flex items-center justify-center h-16 text-muted-foreground text-sm">
                Loading...
              </div>
            }
          />
        </div>
      </div>
      
      {/* Collapsible Output section */}
      {showOutput && output !== null && (
        <div className={cn(
          "mt-0.5 rounded-xl border overflow-hidden",
          isMentorBubble 
            ? "bg-blue-800/20 border-blue-400/30" 
            : "bg-[#F5F5F5] border-border/40"
        )}>
          {/* Header - clickable to toggle */}
          <button
            onClick={() => setOutputExpanded(!outputExpanded)}
            className={cn(
              "w-full flex items-center justify-between px-4 py-2.5 transition-colors",
              isMentorBubble ? "hover:bg-blue-500/10" : "hover:bg-black/5"
            )}
          >
            <div className="flex items-center gap-2">
              <div className={cn(
                "flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center",
                isMentorBubble ? "bg-blue-500/20" : "bg-black/5"
              )}>
                {outputExpanded ? (
                  <ChevronUp className={cn(
                    "w-3 h-3",
                    isMentorBubble ? "text-blue-200" : "text-muted-foreground"
                  )} />
                ) : (
                  <ChevronDown className={cn(
                    "w-3 h-3",
                    isMentorBubble ? "text-blue-200" : "text-muted-foreground"
                  )} />
                )}
              </div>
              <span className={cn(
                "text-sm font-medium",
                outputError 
                  ? "text-red-500" 
                  : isMentorBubble 
                    ? "text-blue-100" 
                    : "text-foreground"
              )}>
                {outputError ? "Error" : "Output"}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleCloseOutput();
              }}
              className={cn(
                "h-6 w-6",
                isMentorBubble
                  ? "text-blue-200 hover:text-white hover:bg-blue-500/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-transparent"
              )}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </button>
          
          {/* Collapsible output content */}
          <div 
            className={cn(
              "grid transition-all duration-200 ease-out",
              outputExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}
          >
            <div className="overflow-hidden">
              <div className="px-4 pb-4">
                <pre className={cn(
                  "text-sm font-mono whitespace-pre-wrap overflow-x-auto m-0",
                  outputError 
                    ? "text-red-500" 
                    : isMentorBubble 
                      ? "text-blue-100" 
                      : "text-foreground"
                )}>
                  {output}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Copied tooltip */}
      {copied && (
        <div className="absolute top-2 right-16 px-2 py-1 text-xs bg-primary text-primary-foreground rounded shadow-lg animate-in fade-in-0 zoom-in-95 z-10">
          Copied!
        </div>
      )}
    </div>
  );
};

export default CodeBlock;
