/**
 * CodeBlock - Unified code block UI component
 * 
 * Single source of truth for code block appearance across:
 * - Chat bubbles (standalone usage)
 * - TipTap editor (via ExecutableCodeBlockView wrapper)
 * 
 * Supports execution, editing, copy, and theming.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import Prism from "@/lib/prism";
import { cn } from "@/lib/utils";
import { Copy, Check, Play, Pencil, Loader2, X, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useCodeTheme from "@/hooks/useCodeTheme";
import { supabase } from "@/integrations/supabase/client";

// Dynamic theme imports
const loadTheme = async (theme: string) => {
  switch (theme) {
    case "okaidia":
      await import("prismjs/themes/prism-okaidia.css");
      break;
    case "solarizedlight":
      await import("prismjs/themes/prism-solarizedlight.css");
      break;
    case "coy":
      await import("prismjs/themes/prism-coy.css");
      break;
    case "twilight":
      await import("prismjs/themes/prism-twilight.css");
      break;
    case "funky":
      await import("prismjs/themes/prism-funky.css");
      break;
    case "gray":
      await import("prismjs/themes/prism.css");
      break;
    case "tomorrow":
    default:
      await import("prismjs/themes/prism-tomorrow.css");
      break;
  }
};

// All available languages for selection
const LANGUAGES = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'sql', label: 'SQL' },
  { value: 'bash', label: 'Bash' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'java', label: 'Java' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'plaintext', label: 'Plain Text' },
];

const LANGUAGE_MAP: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  html: "markup",
  xml: "markup",
  shell: "bash",
  sh: "bash",
  cs: "csharp",
};

// Languages that support execution
const EXECUTABLE_LANGUAGES = ["python", "javascript", "typescript"];

export interface CodeBlockProps {
  code: string;
  language?: string;
  isMentorBubble?: boolean;
  overrideTheme?: string;
  
  // Edit callbacks
  onEdit?: (code: string) => void;
  editable?: boolean;
  
  // Language selection (for editor mode)
  showLanguageSelect?: boolean;
  onLanguageChange?: (language: string) => void;
  
  // Delete support (for editor mode)
  showDelete?: boolean;
  onDelete?: () => void;
  
  // External execution control (for TipTap wrapper)
  externalRunControl?: boolean;
  isRunningExternal?: boolean;
  onRunExternal?: () => void;
  outputExternal?: string | null;
  outputErrorExternal?: boolean;
  showOutputExternal?: boolean;
  onCloseOutputExternal?: () => void;
  
  // UI options
  showToolbarAlways?: boolean;
}

const CodeBlock = ({ 
  code, 
  language = "", 
  isMentorBubble = false, 
  overrideTheme,
  onEdit,
  editable = false,
  showLanguageSelect = false,
  onLanguageChange,
  showDelete = false,
  onDelete,
  externalRunControl = false,
  isRunningExternal = false,
  onRunExternal,
  outputExternal = null,
  outputErrorExternal = false,
  showOutputExternal = false,
  onCloseOutputExternal,
  showToolbarAlways = false,
}: CodeBlockProps) => {
  const codeRef = useRef<HTMLElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const originalCodeRef = useRef(code);
  
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCode, setEditedCode] = useState(code);
  
  // Internal execution state (used when not externally controlled)
  const [isRunningInternal, setIsRunningInternal] = useState(false);
  const [outputInternal, setOutputInternal] = useState<string | null>(null);
  const [outputErrorInternal, setOutputErrorInternal] = useState(false);
  const [showOutputInternal, setShowOutputInternal] = useState(false);
  const [outputExpanded, setOutputExpanded] = useState(true);
  
  const { theme: globalTheme } = useCodeTheme();
  
  // Use override theme if provided, otherwise fall back to global theme
  const theme = overrideTheme || globalTheme;
  
  // Check theme types
  const isGrayTheme = theme === "gray";
  const isCleanTheme = theme === "clean";
  const isCustomTheme = isGrayTheme || isCleanTheme;
  
  const normalizedLang = LANGUAGE_MAP[language.toLowerCase()] || language.toLowerCase() || "plaintext";
  const canExecute = EXECUTABLE_LANGUAGES.includes(normalizedLang);
  
  // Determine which state to use (external vs internal)
  const isRunning = externalRunControl ? isRunningExternal : isRunningInternal;
  const output = externalRunControl ? outputExternal : outputInternal;
  const outputError = externalRunControl ? outputErrorExternal : outputErrorInternal;
  const showOutput = externalRunControl ? showOutputExternal : showOutputInternal;

  // Sync editedCode when code prop changes externally
  useEffect(() => {
    setEditedCode(code);
    originalCodeRef.current = code;
  }, [code]);

  // Load theme dynamically
  useEffect(() => {
    if (isCustomTheme) {
      import("prismjs/themes/prism.css");
    } else {
      loadTheme(theme);
    }
  }, [theme, isCustomTheme]);

  useEffect(() => {
    if (codeRef.current && !isEditing) {
      Prism.highlightElement(codeRef.current);
    }
  }, [code, editedCode, normalizedLang, theme, isEditing]);

  // Auto-resize textarea when editing
  useEffect(() => {
    if (textareaRef.current && isEditing) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editedCode, isEditing]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(isEditing ? editedCode : code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Exiting edit mode - discard changes, revert to original
      setEditedCode(originalCodeRef.current);
      if (onEdit) {
        onEdit(originalCodeRef.current);
      }
      setIsEditing(false);
    } else {
      // Entering edit mode
      setIsEditing(true);
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  };

  const handleCodeChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    setEditedCode(newCode);
    if (onEdit) {
      onEdit(newCode);
    }
  }, [onEdit]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab key for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newCode = editedCode.substring(0, start) + '  ' + editedCode.substring(end);
      setEditedCode(newCode);
      if (onEdit) {
        onEdit(newCode);
      }
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
    // Prevent parent from capturing navigation keys
    e.stopPropagation();
  };

  const handleRun = async () => {
    if (!canExecute) return;
    
    if (externalRunControl && onRunExternal) {
      onRunExternal();
      return;
    }
    
    // Internal execution
    setIsRunningInternal(true);
    setOutputInternal(null);
    setOutputErrorInternal(false);
    setShowOutputInternal(true);
    setOutputExpanded(true);

    try {
      const { data, error } = await supabase.functions.invoke('execute-code', {
        body: { 
          code: editedCode, 
          language: normalizedLang 
        },
      });

      if (error) {
        setOutputInternal(error.message || 'Execution failed');
        setOutputErrorInternal(true);
      } else if (data?.error) {
        setOutputInternal(data.error);
        setOutputErrorInternal(true);
      } else {
        setOutputInternal(data?.output || 'No output');
        setOutputErrorInternal(false);
      }
    } catch (err: any) {
      setOutputInternal(err.message || 'Failed to execute code');
      setOutputErrorInternal(true);
    } finally {
      setIsRunningInternal(false);
    }
  };

  const handleCloseOutput = () => {
    if (externalRunControl && onCloseOutputExternal) {
      onCloseOutputExternal();
    } else {
      setShowOutputInternal(false);
      setOutputInternal(null);
    }
  };

  // Get the appropriate theme class
  const getThemeClass = () => {
    if (isCleanTheme) return "code-theme-clean";
    if (isGrayTheme) return "code-theme-gray";
    return "";
  };

  const displayCode = editedCode || '// Write your code here...';
  const toolbarVisibility = showToolbarAlways ? "opacity-100" : "opacity-0 group-hover:opacity-100";

  return (
    <div className={cn("relative group w-full", getThemeClass())}>
      {/* Delete button - floating top-right corner */}
      {showDelete && onDelete && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="absolute -top-1.5 -right-1.5 z-10 h-5 w-5 rounded-full bg-background border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Remove code block"
        >
          <X className="w-2.5 h-2.5" />
        </Button>
      )}

      {/* Main code container */}
      <div className={cn("rounded-lg border border-border/50 bg-muted/20 overflow-hidden", `code-theme-${theme}`)}>
        {/* Header row */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          {/* Language Label or Selector */}
          {showLanguageSelect && onLanguageChange ? (
            <Select value={language} onValueChange={onLanguageChange}>
              <SelectTrigger className="h-5 w-auto gap-0.5 px-0 text-[11px] uppercase tracking-wider font-medium text-muted-foreground border-none bg-transparent shadow-none focus:ring-0 hover:text-foreground">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map(lang => (
                  <SelectItem key={lang.value} value={lang.value} className="text-xs">
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : language ? (
            <span className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
              {language}
            </span>
          ) : (
            <span />
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-0.5">
            {/* Edit toggle */}
            {editable && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleEditToggle}
                className={cn(
                  "h-7 w-7 text-muted-foreground/60 hover:text-foreground hover:bg-transparent",
                  toolbarVisibility
                )}
                title={isEditing ? "Cancel edit" : "Edit code"}
              >
                {isEditing ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
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
                  "h-7 w-7 text-muted-foreground/60 hover:text-primary hover:bg-transparent",
                  toolbarVisibility
                )}
                title="Run code"
              >
                {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              </Button>
            )}
            
            {/* Copy button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className={cn(
                "h-7 w-7 text-muted-foreground/60 hover:text-foreground hover:bg-transparent",
                toolbarVisibility
              )}
              title="Copy code"
            >
              {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Code content */}
        <div className="px-4 pb-4">
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={editedCode}
              onChange={handleCodeChange}
              onKeyDown={handleKeyDown}
              className={cn(
                "w-full bg-transparent resize-none outline-none text-sm font-mono leading-relaxed",
                "min-h-[1.5em] overflow-hidden",
                "text-foreground placeholder:text-muted-foreground/60"
              )}
              placeholder="// Write your code here..."
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
            />
          ) : (
            <pre className="text-sm font-mono leading-relaxed overflow-x-auto w-full m-0 bg-transparent">
              <code ref={codeRef} className={`language-${normalizedLang}`}>
                {displayCode}
              </code>
            </pre>
          )}
        </div>
      </div>

      {/* Output panel */}
      {showOutput && (
        <div className="mt-3 rounded-xl border border-border/50 bg-muted/30 overflow-hidden">
          {/* Header row */}
          <button
            onClick={() => setOutputExpanded(!outputExpanded)}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-muted/60">
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

          {/* Content area */}
          <div className={cn(
            "grid transition-all duration-200 ease-out",
            outputExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          )}>
            <div className="overflow-hidden">
              <div className="mx-3 mb-3">
                <div className="rounded-lg bg-background border border-border/40 px-4 py-3">
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
        </div>
      )}

      {/* Copied toast */}
      {copied && (
        <div className="absolute top-0 right-16 px-1.5 py-0.5 text-[10px] bg-primary text-primary-foreground rounded shadow-sm animate-in fade-in-0 zoom-in-95 z-10">
          Copied!
        </div>
      )}
    </div>
  );
};

export default CodeBlock;
