import { useState } from "react";
import { AlertCircle, ChevronDown, ChevronUp, AlertTriangle, XCircle, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { parseCodeError, type ParsedError } from "@/lib/errorParser";

interface ErrorDisplayProps {
  error: string;
  language: string;
  userCodeLineCount: number;
  className?: string;
  onLineClick?: (line: number) => void;
}

export function ErrorDisplay({ 
  error, 
  language, 
  userCodeLineCount, 
  className,
  onLineClick 
}: ErrorDisplayProps) {
  const [showRawError, setShowRawError] = useState(false);
  
  const parsed = parseCodeError(error, language, userCodeLineCount);
  
  // Determine icon and colors based on error type
  const getErrorStyle = () => {
    if (!parsed.isUserCodeError) {
      return {
        icon: Settings2,
        bgColor: "bg-muted/50",
        borderColor: "border-border/50",
        textColor: "text-muted-foreground",
        iconColor: "text-muted-foreground",
      };
    }
    
    if (parsed.type.includes('Syntax') || parsed.type.includes('Indentation')) {
      return {
        icon: XCircle,
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/30",
        textColor: "text-red-600 dark:text-red-400",
        iconColor: "text-red-500",
      };
    }
    
    return {
      icon: AlertCircle,
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/30",
      textColor: "text-red-600 dark:text-red-400",
      iconColor: "text-red-500",
    };
  };
  
  const style = getErrorStyle();
  const Icon = style.icon;

  return (
    <div className={cn("rounded-lg border overflow-hidden", style.bgColor, style.borderColor, className)}>
      {/* Main Error Display */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", style.iconColor)} />
          
          <div className="flex-1 min-w-0 space-y-2">
            {/* Error Type & Line */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("font-semibold", style.textColor)}>
                {parsed.isUserCodeError ? `❌ ${parsed.friendlyType}` : "⚙️ Internal Error"}
              </span>
              {parsed.isUserCodeError && parsed.userLine && (
                <button
                  onClick={() => onLineClick?.(parsed.userLine!)}
                  className="text-sm px-2 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-400 transition-colors font-mono"
                >
                  line {parsed.userLine}
                </button>
              )}
            </div>
            
            {/* Friendly Explanation */}
            <p className="text-sm text-foreground/80">
              {parsed.isUserCodeError ? parsed.friendlyMessage : "This error is not your fault - it occurred in the test harness."}
            </p>
            
            {/* Code Snippet (if available) */}
            {parsed.codeSnippet && (
              <div className="mt-2 p-2 rounded bg-muted/50 font-mono text-sm border border-border/50">
                <span className="text-muted-foreground">→ </span>
                <span className="text-red-600 dark:text-red-400">{parsed.codeSnippet}</span>
              </div>
            )}
            
            {/* Error Details */}
            {parsed.message && parsed.isUserCodeError && (
              <p className="text-xs text-muted-foreground mt-1">
                {parsed.type}: {parsed.message}
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Technical Details Collapsible */}
      <div className="border-t border-border/30">
        <button
          onClick={() => setShowRawError(!showRawError)}
          className="w-full flex items-center justify-between px-4 py-2 text-xs text-muted-foreground hover:bg-muted/30 transition-colors"
        >
          <span>View technical details</span>
          {showRawError ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </button>
        
        {showRawError && (
          <div className="px-4 pb-4">
            <pre className="text-xs font-mono p-3 rounded bg-muted/50 overflow-x-auto whitespace-pre-wrap break-all border border-border/30 text-muted-foreground max-h-48 overflow-y-auto">
              {parsed.rawError}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// Compact inline error for test case results
interface InlineErrorProps {
  error: string;
  language: string;
  userCodeLineCount: number;
  onLineClick?: (line: number) => void;
}

export function InlineError({ error, language, userCodeLineCount, onLineClick }: InlineErrorProps) {
  const parsed = parseCodeError(error, language, userCodeLineCount);
  
  if (!parsed.isUserCodeError) {
    return (
      <span className="text-muted-foreground text-xs">
        ⚙️ Internal error (not your code)
      </span>
    );
  }
  
  return (
    <span className="text-red-600 dark:text-red-400 text-xs">
      {parsed.friendlyType}
      {parsed.userLine && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLineClick?.(parsed.userLine!);
          }}
          className="ml-1 underline hover:no-underline"
        >
          (line {parsed.userLine})
        </button>
      )}
      : {parsed.message?.substring(0, 50)}{parsed.message && parsed.message.length > 50 ? '...' : ''}
    </span>
  );
}
