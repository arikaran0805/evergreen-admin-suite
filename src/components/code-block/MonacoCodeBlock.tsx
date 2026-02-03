/**
 * MonacoCodeBlock - Interactive code block with Monaco Editor
 * 
 * Features:
 * - Monaco Editor with syntax highlighting and line numbers
 * - Read-only by default, toggle to edit mode
 * - Code execution for supported languages
 * - Collapsible output panel
 * - Copy code functionality
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import Editor, { type Monaco, type OnMount } from '@monaco-editor/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  Copy, Check, Play, Pencil, Loader2, X, 
  ChevronUp, ChevronDown 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Supported languages for execution
const EXECUTABLE_LANGUAGES = ['python', 'javascript', 'typescript'];

// Monaco language mapping
const MONACO_LANGUAGE_MAP: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  bash: 'shell',
  sh: 'shell',
  plaintext: 'plaintext',
  text: 'plaintext',
};

export interface MonacoCodeBlockProps {
  code: string;
  language?: string;
  onCodeChange?: (code: string) => void;
  editable?: boolean;
  showLanguageLabel?: boolean;
  className?: string;
  minHeight?: number;
}

const MonacoCodeBlock = ({
  code,
  language = 'python',
  onCodeChange,
  editable = true,
  showLanguageLabel = true,
  className,
  minHeight = 80,
}: MonacoCodeBlockProps) => {
  const [currentCode, setCurrentCode] = useState(code);
  const [isEditMode, setIsEditMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [outputError, setOutputError] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [outputExpanded, setOutputExpanded] = useState(true);
  
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  
  // Normalize language for Monaco
  const normalizedLang = MONACO_LANGUAGE_MAP[language?.toLowerCase()] || language?.toLowerCase() || 'plaintext';
  const canExecute = EXECUTABLE_LANGUAGES.includes(normalizedLang);
  
  // Calculate editor height based on line count
  const lineCount = currentCode.split('\n').length;
  const editorHeight = Math.max(minHeight, lineCount * 19 + 16); // 19px per line + padding

  // Sync code when prop changes externally
  useEffect(() => {
    setCurrentCode(code);
  }, [code]);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // Configure Monaco theme for a clean look
    monaco.editor.defineTheme('codeblock-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '0000FF' },
        { token: 'string', foreground: 'A31515' },
        { token: 'number', foreground: '098658' },
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
    
    monaco.editor.setTheme('codeblock-light');
    
    // Disable unnecessary features for clean appearance
    editor.updateOptions({
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
      padding: { top: 12, bottom: 12 },
      wordWrap: 'on',
      automaticLayout: true,
    });
  };

  const handleEditorChange = useCallback((value: string | undefined) => {
    const newCode = value || '';
    setCurrentCode(newCode);
    onCodeChange?.(newCode);
  }, [onCodeChange]);

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
          // Move cursor to end
          const model = editorRef.current.getModel();
          if (model) {
            const lastLine = model.getLineCount();
            const lastCol = model.getLineMaxColumn(lastLine);
            editorRef.current.setPosition({ lineNumber: lastLine, column: lastCol });
          }
        }
      }, 0);
    } else {
      // Exit edit mode - keep edited code (no rollback)
      setIsEditMode(false);
      if (editorRef.current) {
        editorRef.current.updateOptions({ 
          readOnly: true,
          renderLineHighlight: 'none',
        });
      }
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
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
        body: { code: currentCode, language: normalizedLang },
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
    // Don't reset output, just hide it
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Main code container */}
      <div className="rounded-xl border border-border/40 bg-[#FAFAFA] overflow-hidden">
        {/* Header row */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          {/* Language label */}
          {showLanguageLabel && (
            <span className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground/70">
              {language}
            </span>
          )}
          
          {/* Action buttons */}
          <div className="flex items-center gap-0.5 ml-auto">
            {editable && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleEditToggle}
                className="h-7 w-7 text-muted-foreground/60 hover:text-foreground hover:bg-transparent"
                title={isEditMode ? "Exit edit mode" : "Edit code"}
              >
                {isEditMode ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
              </Button>
            )}

            {canExecute && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRun}
                disabled={isRunning}
                className="h-7 w-7 text-muted-foreground/60 hover:text-primary hover:bg-transparent"
                title="Run code"
              >
                {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="h-7 w-7 text-muted-foreground/60 hover:text-foreground hover:bg-transparent"
              title="Copy code"
            >
              {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Monaco Editor */}
        <div className="px-1">
          <Editor
            height={editorHeight}
            language={normalizedLang}
            value={currentCode}
            onChange={handleEditorChange}
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
              padding: { top: 12, bottom: 12 },
              wordWrap: 'on',
              automaticLayout: true,
            }}
            theme="codeblock-light"
            loading={
              <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
                Loading editor...
              </div>
            }
          />
        </div>
      </div>

      {/* Output panel - collapsible */}
      {showOutput && (
        <div className="mt-0.5 rounded-xl border border-border/40 bg-[#F5F5F5] overflow-hidden">
          {/* Output header */}
          <button
            onClick={() => setOutputExpanded(!outputExpanded)}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-black/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-black/5">
                {outputExpanded ? (
                  <ChevronUp className="w-3 h-3 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                )}
              </div>
              <span className={cn(
                "text-sm font-medium",
                outputError ? "text-destructive" : "text-foreground"
              )}>
                {outputError ? 'Error' : 'Output'}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleCloseOutput();
              }}
              className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-transparent"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </button>

          {/* Output content - collapsible */}
          <div className={cn(
            "grid transition-all duration-200 ease-out",
            outputExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          )}>
            <div className="overflow-hidden">
              <div className="px-4 pb-4">
                <pre className={cn(
                  "text-sm font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto m-0",
                  outputError ? "text-destructive" : "text-foreground",
                  !output && "text-muted-foreground"
                )}>
                  {output || 'No output'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Copied toast */}
      {copied && (
        <div className="fixed top-4 right-4 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg shadow-lg animate-in fade-in-0 zoom-in-95 z-50">
          Copied!
        </div>
      )}
    </div>
  );
};

export default MonacoCodeBlock;
