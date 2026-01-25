import { useEffect, useRef, useState } from "react";
import Prism from "@/lib/prism";
import { cn } from "@/lib/utils";
import { Copy, Check, Play, Pencil, Loader2, X, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import useCodeTheme from "@/hooks/useCodeTheme";
import { supabase } from "@/integrations/supabase/client";
// Import tiptap CSS for clean theme syntax highlighting
import "@/styles/tiptap.css";

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
      // Gray theme uses custom inline styles applied via className
      await import("prismjs/themes/prism.css");
      break;
    case "tomorrow":
    default:
      await import("prismjs/themes/prism-tomorrow.css");
      break;
  }
};

interface CodeBlockProps {
  code: string;
  language?: string;
  isMentorBubble?: boolean;
  overrideTheme?: string;
  onEdit?: (code: string) => void;
  editable?: boolean;
  showToolbarAlways?: boolean;
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
}: CodeBlockProps) => {
  const codeRef = useRef<HTMLElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCode, setEditedCode] = useState(code);
  const [lineCount, setLineCount] = useState(code.split('\n').length);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [outputError, setOutputError] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
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

  // Load theme dynamically - skip for custom themes that use CSS overrides
  useEffect(() => {
    // Clean and gray themes use custom CSS in tiptap.css, no Prism theme needed
    if (isCustomTheme) {
      // Don't load any Prism theme - our CSS handles it
      return;
    }
    loadTheme(theme);
  }, [theme, isCustomTheme]);

  useEffect(() => {
    if (codeRef.current && !isEditing) {
      Prism.highlightElement(codeRef.current);
    }
  }, [code, editedCode, normalizedLang, theme, isEditing]);

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
    setIsEditing(true);
    setEditedCode(code);
    setLineCount(code.split('\n').length);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleSaveEdit = () => {
    setIsEditing(false);
    if (onEdit) {
      onEdit(editedCode);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedCode(code);
    setShowOutput(false);
    setOutput(null);
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

  // Calculate line height for textarea
  const lineHeight = 24; // Approximate line height in pixels

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setEditedCode(newValue);
    // Update line count based on content
    setLineCount(newValue.split('\n').length);
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Shift+Enter adds a new line - expand by one line
    if (e.key === 'Enter' && e.shiftKey) {
      setLineCount(prev => prev + 1);
    }
    // Backspace at the start of a line might reduce lines
    if (e.key === 'Backspace') {
      const textarea = e.currentTarget;
      const cursorPos = textarea.selectionStart;
      const textBefore = editedCode.substring(0, cursorPos);
      // If cursor is at the start of a line (after a newline)
      if (textBefore.endsWith('\n') || cursorPos === 0) {
        const newLineCount = editedCode.split('\n').length - 1;
        if (newLineCount >= 1) {
          setTimeout(() => setLineCount(editedCode.split('\n').length), 0);
        }
      }
    }
  };

  // Get the appropriate theme class
  const getThemeClass = () => {
    if (isCleanTheme) return "code-theme-clean";
    if (isGrayTheme) return "code-theme-gray";
    return "";
  };

  // Get background/border styles based on theme
  const getPreStyles = () => {
    if (isMentorBubble) {
      return "bg-blue-600/20 border-blue-400/30";
    }
    if (isCleanTheme) {
      return "bg-white border-gray-200 shadow-sm";
    }
    if (isGrayTheme) {
      return "bg-[#3a3a3a] border-[#555]";
    }
    return "bg-[#1d1f21] border-border/50";
  };

  const displayCode = isEditing ? editedCode : code;

  // Visibility class for toolbar buttons
  const toolbarVisibility = showToolbarAlways ? "opacity-100" : "opacity-0 group-hover:opacity-100";

  return (
    <div 
      className={cn(
        "relative group mt-3 w-full",
        !showToolbarAlways && "min-w-[450px]",
        getThemeClass()
      )}
    >
      <pre
        className={cn(
          "p-4 rounded-xl text-sm font-mono overflow-x-auto w-full",
          "border",
          getPreStyles()
        )}
      >
        {/* Header with language and action buttons */}
        <div className="flex items-center justify-between mb-2">
          {language && (
            <span className={cn(
              "text-[10px] uppercase tracking-wider opacity-50",
              isCleanTheme ? "text-gray-500" : "text-muted-foreground"
            )}>
              {language}
            </span>
          )}
          <div className="flex items-center gap-1">
            {/* Edit/Cancel button */}
            {editable && (
              <Button
                variant="ghost"
                size="icon"
                onClick={isEditing ? handleCancelEdit : handleEdit}
                className={cn(
                  "h-7 w-7 rounded-full transition-opacity",
                  toolbarVisibility,
                  isCleanTheme
                    ? "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {isEditing ? (
                  <X className="w-3.5 h-3.5" />
                ) : (
                  <Pencil className="w-3.5 h-3.5" />
                )}
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
                  "h-7 w-7 rounded-full transition-opacity",
                  toolbarVisibility,
                  isCleanTheme
                    ? "text-gray-400 hover:text-green-600 hover:bg-green-50"
                    : "text-muted-foreground hover:text-green-500 hover:bg-green-500/10"
                )}
              >
                {isRunning ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
              </Button>
            )}
            
            {/* Copy button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className={cn(
                "h-7 w-7 rounded-full transition-opacity",
                toolbarVisibility,
                isMentorBubble 
                  ? "text-blue-100 hover:text-white hover:bg-blue-500/30"
                  : isCleanTheme
                    ? "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
        </div>
        
        {/* Code content or editor */}
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={editedCode}
            onChange={handleTextareaChange}
            onKeyDown={handleTextareaKeyDown}
            style={{ height: `${lineCount * lineHeight}px` }}
            className={cn(
              "w-full bg-transparent resize-none outline-none text-sm font-mono leading-relaxed overflow-hidden transition-[height] duration-150",
              isCleanTheme ? "text-gray-800" : "text-gray-100"
            )}
            spellCheck={false}
          />
        ) : (
          <code
            ref={codeRef}
            className={cn(
              `language-${normalizedLang} leading-relaxed`,
              isCleanTheme && "text-gray-800"
            )}
          >
            {displayCode}
          </code>
        )}
      </pre>
      
      {/* Collapsible Output section - sharp top, rounded bottom, close to code */}
      {showOutput && output !== null && (
        <div className={cn(
          "-mt-3 rounded-t-none rounded-b-xl border border-t-0 overflow-hidden",
          isCleanTheme 
            ? "bg-gray-100 border-gray-200" 
            : "bg-muted/50 border-border/50"
        )}>
          {/* Header - clickable to toggle */}
          <button
            onClick={handleToggleOutput}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 transition-colors",
              isCleanTheme ? "hover:bg-gray-200/50" : "hover:bg-muted"
            )}
          >
            <div className="flex items-center gap-2">
              <div className={cn(
                "flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-transform duration-200",
                isCleanTheme ? "bg-gray-200" : "bg-muted"
              )}>
                {outputExpanded ? (
                  <ChevronUp className={cn(
                    "w-3 h-3",
                    isCleanTheme ? "text-gray-500" : "text-muted-foreground"
                  )} />
                ) : (
                  <ChevronDown className={cn(
                    "w-3 h-3",
                    isCleanTheme ? "text-gray-500" : "text-muted-foreground"
                  )} />
                )}
              </div>
              <span className={cn(
                "text-xs font-medium",
                outputError 
                  ? "text-red-500" 
                  : isCleanTheme 
                    ? "text-gray-600" 
                    : "text-muted-foreground"
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
                "h-5 w-5 rounded-full",
                isCleanTheme
                  ? "text-gray-400 hover:text-gray-600 hover:bg-gray-200"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <X className="w-3 h-3" />
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
              <div className="px-3 pb-3">
                <pre className={cn(
                  "text-sm font-mono whitespace-pre-wrap overflow-x-auto",
                  outputError 
                    ? "text-red-500" 
                    : isCleanTheme 
                      ? "text-gray-800" 
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
        <div className="absolute top-2 right-16 px-2 py-1 text-xs bg-green-500 text-white rounded shadow-lg animate-in fade-in-0 zoom-in-95">
          Copied!
        </div>
      )}
    </div>
  );
};

export default CodeBlock;
