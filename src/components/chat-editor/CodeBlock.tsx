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

export interface CodeBlockProps {
  code: string;
  language?: string;
  isMentorBubble?: boolean;
  overrideTheme?: string;
  onEdit?: (code: string) => void;
  editable?: boolean;
  showToolbarAlways?: boolean;
  /** Show language selector dropdown instead of static label */
  showLanguageSelector?: boolean;
  /** Available languages for selector */
  languageOptions?: Array<{ value: string; label: string }>;
  /** Callback when language changes */
  onLanguageChange?: (language: string) => void;
  /** Show delete button in corner */
  showDeleteButton?: boolean;
  /** Callback when delete is clicked */
  onDelete?: () => void;
  /** Placeholder text for empty code */
  placeholder?: string;
  /** Controls whether run button appears (for executable languages) */
  showRunButton?: boolean;
}

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

const CodeBlock = ({ 
  code, 
  language = "", 
  isMentorBubble = false, 
  overrideTheme,
  onEdit,
  editable = false,
  showToolbarAlways = false,
  showLanguageSelector = false,
  languageOptions,
  onLanguageChange,
  showDeleteButton = false,
  onDelete,
  placeholder = "// Write your code here...",
  showRunButton,
}: CodeBlockProps) => {
  const codeRef = useRef<HTMLElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const originalCodeRef = useRef(code);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCode, setEditedCode] = useState(code);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [outputError, setOutputError] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [outputExpanded, setOutputExpanded] = useState(true);
  const { theme: globalTheme } = useCodeTheme();
  
  const theme = overrideTheme || globalTheme;
  const isGrayTheme = theme === "gray";
  const isCleanTheme = theme === "clean";
  const isCustomTheme = isGrayTheme || isCleanTheme;
  
  const normalizedLang = LANGUAGE_MAP[language.toLowerCase()] || language.toLowerCase() || "plaintext";
  
  // Determine if run button should show
  const canExecute = EXECUTABLE_LANGUAGES.includes(normalizedLang);
  const shouldShowRun = showRunButton !== undefined ? showRunButton : canExecute;

  // Sync code when prop changes
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

  const handleEdit = () => {
    originalCodeRef.current = editedCode;
    setIsEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedCode(originalCodeRef.current);
    setShowOutput(false);
    setOutput(null);
  };

  const handleRun = async () => {
    if (!shouldShowRun) return;
    
    setIsRunning(true);
    setOutput(null);
    setOutputError(false);
    setShowOutput(true);
    setOutputExpanded(true);

    try {
      const { data, error } = await supabase.functions.invoke('execute-code', {
        body: { 
          code: isEditing ? editedCode : code, 
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
    setOutput(null);
  };

  const handleToggleOutput = () => {
    setOutputExpanded(!outputExpanded);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setEditedCode(newValue);
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab key for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newCode = editedCode.substring(0, start) + '  ' + editedCode.substring(end);
      setEditedCode(newCode);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
    // Prevent parent from capturing keys
    e.stopPropagation();
  };

  const getThemeClass = () => {
    if (isCleanTheme) return "code-theme-clean";
    if (isGrayTheme) return "code-theme-gray";
    return `code-theme-${theme}`;
  };

  const displayCode = isEditing ? editedCode : (code || placeholder);
  const toolbarVisibility = showToolbarAlways ? "opacity-100" : "opacity-0 group-hover:opacity-100";

  return (
    <div className={cn("group relative w-full", getThemeClass())}>
      {/* Delete button - floating top-right corner */}
      {showDeleteButton && onDelete && (
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

      {/* Main container */}
      <div
        className={cn(
          "rounded-lg border border-border/50 overflow-hidden",
          isMentorBubble ? "bg-primary/20" : "bg-muted/20"
        )}
      >
        {/* Header row */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          {/* Language label or selector */}
          {showLanguageSelector && languageOptions && onLanguageChange ? (
            <Select value={language} onValueChange={onLanguageChange}>
              <SelectTrigger className="h-5 w-auto gap-0.5 px-0 text-[11px] uppercase tracking-wider font-medium text-muted-foreground border-none bg-transparent shadow-none focus:ring-0 hover:text-foreground">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                {languageOptions.map((lang) => (
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
            {/* Edit/Cancel button */}
            {editable && (
              <Button
                variant="ghost"
                size="icon"
                onClick={isEditing ? handleCancelEdit : handleEdit}
                className={cn(
                  "h-7 w-7 text-muted-foreground/60 hover:text-foreground hover:bg-transparent transition-opacity",
                  toolbarVisibility
                )}
                title={isEditing ? "Cancel edit" : "Edit code"}
              >
                {isEditing ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Pencil className="w-4 h-4" />
                )}
              </Button>
            )}
            
            {/* Run button */}
            {shouldShowRun && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRun}
                disabled={isRunning}
                className={cn(
                  "h-7 w-7 text-muted-foreground/60 hover:text-primary hover:bg-transparent transition-opacity",
                  toolbarVisibility
                )}
                title="Run code"
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
                "h-7 w-7 text-muted-foreground/60 hover:text-foreground hover:bg-transparent transition-opacity",
                toolbarVisibility
              )}
              title="Copy code"
            >
              {copied ? (
                <Check className="w-4 h-4 text-primary" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
        
        {/* Code content */}
        <div className="px-4 pb-4">
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={editedCode}
              onChange={handleTextareaChange}
              onKeyDown={handleTextareaKeyDown}
              className={cn(
                "w-full bg-transparent resize-none outline-none text-sm font-mono leading-relaxed",
                "min-h-[1.5em] overflow-hidden",
                "text-foreground placeholder:text-muted-foreground/60"
              )}
              placeholder={placeholder}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
            />
          ) : (
            <pre className="text-sm font-mono leading-relaxed overflow-x-auto w-full m-0 bg-transparent">
              <code
                ref={codeRef}
                className={`language-${normalizedLang}`}
              >
                {displayCode}
              </code>
            </pre>
          )}
        </div>
      </div>
      
      {/* Output section - chat bubble style */}
      {showOutput && (
        <div className={cn(
          "mt-3 rounded-2xl border overflow-hidden",
          isCleanTheme 
            ? "bg-gray-50 border-gray-200" 
            : "bg-muted/20 border-border/50"
        )}>
          {/* Header - clickable to toggle */}
          <button
            onClick={handleToggleOutput}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3 transition-colors",
              isCleanTheme ? "hover:bg-gray-100" : "hover:bg-muted/30"
            )}
            type="button"
          >
            <div className="flex items-center gap-2.5">
              {outputExpanded ? (
                <ChevronUp className={cn(
                  "w-4 h-4",
                  isCleanTheme ? "text-gray-500" : "text-muted-foreground"
                )} />
              ) : (
                <ChevronDown className={cn(
                  "w-4 h-4",
                  isCleanTheme ? "text-gray-500" : "text-muted-foreground"
                )} />
              )}
              <span className={cn(
                "text-sm font-medium",
                outputError 
                  ? "text-red-500" 
                  : isCleanTheme 
                    ? "text-gray-700" 
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
                isCleanTheme
                  ? "text-gray-400 hover:text-gray-600 hover:bg-transparent"
                  : "text-muted-foreground hover:text-foreground hover:bg-transparent"
              )}
            >
              <X className="w-4 h-4" />
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
                <div className={cn(
                  "rounded-xl px-4 py-3",
                  isCleanTheme ? "bg-white" : "bg-background/80"
                )}>
                  <pre className={cn(
                    "text-sm font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto m-0",
                    outputError 
                      ? "text-red-500" 
                      : isCleanTheme 
                        ? "text-gray-800" 
                        : "text-foreground",
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
      
      {/* Copied tooltip */}
      {copied && (
        <div className="absolute top-0 right-16 px-1.5 py-0.5 text-[10px] bg-primary text-primary-foreground rounded shadow-sm animate-in fade-in-0 zoom-in-95 z-10">
          Copied!
        </div>
      )}
    </div>
  );
};

export default CodeBlock;
