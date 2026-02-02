import { useState } from "react";
import { ChevronDown, ChevronUp, AlertTriangle, XCircle, Cog } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseCodeError, cleanErrorMessage, getPhaseDisplayText, type ParsedError, type ErrorCategory } from "@/lib/errorParser";

interface ErrorDisplayProps {
  error: string;
  language: string;
  userCodeLineCount: number;
  className?: string;
  onLineClick?: (line: number) => void;
}

/**
 * LeetCode-style Error Display
 * Clean, learner-friendly error presentation
 */
export function ErrorDisplay({ 
  error, 
  language, 
  userCodeLineCount, 
  className,
  onLineClick 
}: ErrorDisplayProps) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  
  const parsed = parseCodeError(error, language, userCodeLineCount);
  
  // Get style based on error category
  const getCategoryStyle = (category: ErrorCategory) => {
    switch (category) {
      case 'compilation':
        return {
          headerBg: "bg-red-500/10",
          headerBorder: "border-red-500/20",
          headerText: "text-red-600 dark:text-red-400",
          icon: XCircle,
        };
      case 'execution':
        return {
          headerBg: "bg-red-500/10",
          headerBorder: "border-red-500/20",
          headerText: "text-red-600 dark:text-red-400",
          icon: AlertTriangle,
        };
      case 'internal':
        return {
          headerBg: "bg-muted",
          headerBorder: "border-border",
          headerText: "text-muted-foreground",
          icon: Cog,
        };
    }
  };
  
  const style = getCategoryStyle(parsed.category);
  const Icon = style.icon;

  return (
    <div className={cn(
      "rounded-lg border overflow-hidden font-mono text-sm",
      style.headerBg,
      style.headerBorder,
      className
    )}>
      {/* Error Header - LeetCode style */}
      <div className="px-4 py-3 border-b border-border/30">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", style.headerText)} />
          <span className={cn("font-bold text-base", style.headerText)}>
            {parsed.friendlyType}
          </span>
        </div>
      </div>

      {/* Error Content */}
      <div className="px-4 py-3 space-y-3 bg-background/50">
        {/* Error Message */}
        {parsed.isUserCodeError ? (
          <>
            {/* Primary error message (like: NameError: name 'count' is not defined) */}
            <p className={cn("text-sm", style.headerText)}>
              {parsed.type}: {parsed.friendlyMessage}
            </p>

            {/* Line reference with code snippet */}
            {parsed.userLine && (
              <div className="space-y-1">
                <button
                  onClick={() => onLineClick?.(parsed.userLine!)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors underline decoration-dashed"
                >
                  Line {parsed.userLine}:
                </button>
                
                {parsed.codeLine && (
                  <div className="pl-0">
                    <pre className="text-foreground/90 whitespace-pre overflow-x-auto">
                      {parsed.codeLine}
                    </pre>
                    {parsed.pointer && (
                      <pre className={cn("whitespace-pre", style.headerText)}>
                        {parsed.pointer.replace(/^\s{4}/, '')}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* If no line but we have code snippet */}
            {!parsed.userLine && parsed.codeLine && (
              <div className="space-y-1">
                <pre className="text-foreground/90 whitespace-pre overflow-x-auto">
                  {parsed.codeLine}
                </pre>
                {parsed.pointer && (
                  <pre className={cn("whitespace-pre", style.headerText)}>
                    {parsed.pointer.replace(/^\s{4}/, '')}
                  </pre>
                )}
              </div>
            )}
          </>
        ) : (
          // Internal error message
          <p className="text-sm text-muted-foreground">
            {parsed.friendlyMessage}
          </p>
        )}
      </div>

      {/* Technical Details (Collapsible) */}
      <div className="border-t border-border/30">
        <button
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="w-full flex items-center justify-between px-4 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <span>View technical details</span>
          {showTechnicalDetails ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </button>
        
        {showTechnicalDetails && (
          <div className="px-4 pb-4">
            <pre className="text-xs p-3 rounded bg-muted/50 overflow-x-auto whitespace-pre-wrap break-words border border-border/30 text-muted-foreground max-h-48 overflow-y-auto">
              {cleanErrorMessage(parsed.rawError)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Compact LeetCode-style Error (for test case results)
// ============================================================================

interface CompactErrorProps {
  error: string;
  language: string;
  userCodeLineCount: number;
  onLineClick?: (line: number) => void;
}

/**
 * Compact error display for inline use in test case results
 */
export function CompactError({ error, language, userCodeLineCount, onLineClick }: CompactErrorProps) {
  const parsed = parseCodeError(error, language, userCodeLineCount);
  
  if (!parsed.isUserCodeError) {
    return (
      <div className="text-muted-foreground text-xs font-mono">
        <span className="font-medium">Internal Error</span>
        <span className="ml-1 opacity-75">— system issue, please retry</span>
      </div>
    );
  }
  
  return (
    <div className="text-xs font-mono space-y-1">
      {/* Error header */}
      <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
        <span className="font-bold">{parsed.friendlyType}</span>
      </div>
      
      {/* Error message */}
      <div className="text-red-600/80 dark:text-red-400/80">
        {parsed.type}: {parsed.friendlyMessage}
      </div>
      
      {/* Line reference */}
      {parsed.userLine && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLineClick?.(parsed.userLine!);
          }}
          className="text-muted-foreground hover:text-foreground underline decoration-dashed transition-colors"
        >
          Line {parsed.userLine}
        </button>
      )}
      
      {/* Code snippet */}
      {parsed.codeLine && (
        <pre className="text-foreground/70 whitespace-pre overflow-x-auto max-w-full">
          {parsed.codeLine}
        </pre>
      )}
    </div>
  );
}

// ============================================================================
// Inline Error (Legacy support - minimal inline display)
// ============================================================================

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
        Internal error (not your code)
      </span>
    );
  }
  
  return (
    <span className="text-red-600 dark:text-red-400 text-xs font-mono">
      <span className="font-medium">{parsed.friendlyType}</span>
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
      {parsed.message && (
        <span className="ml-1 opacity-80">
          : {parsed.message.substring(0, 60)}{parsed.message.length > 60 ? '...' : ''}
        </span>
      )}
    </span>
  );
}
