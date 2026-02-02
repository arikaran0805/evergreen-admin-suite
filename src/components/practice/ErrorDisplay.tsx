import { useState } from "react";
import { ChevronDown, ChevronUp, AlertTriangle, XCircle, Cog } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseCodeError, cleanErrorMessage, isSyntaxError, isRuntimeError, type ParsedError, type ErrorCategory } from "@/lib/errorParser";

interface ErrorDisplayProps {
  error: string;
  language: string;
  userCodeLineCount: number;
  className?: string;
  onLineClick?: (line: number) => void;
  /** 
   * Error message style:
   * - 'beginner': Friendly explanations, coaching hints, simplified wording
   * - 'standard': Raw language-native error output, stripped of internal paths
   * - 'advanced': Full raw error output exactly as produced, no stripping
   */
  errorMessageStyle?: 'beginner' | 'standard' | 'advanced';
}

/**
 * LeetCode-style Error Display
 * Supports both Beginner (friendly) and Standard (raw) error presentation
 */
export function ErrorDisplay({ 
  error, 
  language, 
  userCodeLineCount, 
  className,
  onLineClick,
  errorMessageStyle = 'beginner'
}: ErrorDisplayProps) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  
  const parsed = parseCodeError(error, language, userCodeLineCount);
  
  // Get style based on error category
  const getCategoryStyle = (category: ErrorCategory) => {
    switch (category) {
      case 'syntax':
        return {
          headerBg: "bg-red-500/10",
          headerBorder: "border-red-500/20",
          headerText: "text-red-600 dark:text-red-400",
          icon: XCircle,
        };
      case 'runtime':
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
  const isBeginnerMode = errorMessageStyle === 'beginner';
  const isAdvancedMode = errorMessageStyle === 'advanced';

  // ADVANCED MODE: Full raw error output exactly as produced, no stripping
  if (isAdvancedMode) {
    return (
      <div className={cn(
        "rounded-lg border overflow-hidden font-mono text-sm",
        style.headerBg,
        style.headerBorder,
        className
      )}>
        {/* Error Header */}
        <div className="px-4 py-3 border-b border-border/30">
          <div className="flex items-center gap-2">
            <Icon className={cn("h-4 w-4", style.headerText)} />
            <span className={cn("font-bold text-base", style.headerText)}>
              {parsed.type}
            </span>
            {parsed.userLine && (
              <button
                onClick={() => onLineClick?.(parsed.userLine!)}
                className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-400 transition-colors"
              >
                line {parsed.userLine}
              </button>
            )}
          </div>
        </div>

        {/* Full Raw Error Content - No stripping at all */}
        <div className="px-4 py-3 bg-background/50">
          <pre className="text-xs whitespace-pre-wrap break-words text-foreground/90 overflow-x-auto max-h-96 overflow-y-auto">
            {parsed.rawError}
          </pre>
        </div>
      </div>
    );
  }

  // STANDARD MODE: Show raw language-native error output, stripped of internal paths
  if (!isBeginnerMode) {
    return (
      <div className={cn(
        "rounded-lg border overflow-hidden font-mono text-sm",
        style.headerBg,
        style.headerBorder,
        className
      )}>
        {/* Error Header */}
        <div className="px-4 py-3 border-b border-border/30">
          <div className="flex items-center gap-2">
            <Icon className={cn("h-4 w-4", style.headerText)} />
            <span className={cn("font-bold text-base", style.headerText)}>
              {parsed.type}
            </span>
            {parsed.userLine && (
              <button
                onClick={() => onLineClick?.(parsed.userLine!)}
                className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-400 transition-colors"
              >
                line {parsed.userLine}
              </button>
            )}
          </div>
        </div>

        {/* Raw Error Content - Cleaned of internal paths */}
        <div className="px-4 py-3 bg-background/50">
          <pre className="text-xs whitespace-pre-wrap break-words text-foreground/90 overflow-x-auto max-h-64 overflow-y-auto">
            {cleanErrorMessage(parsed.rawError)}
          </pre>
        </div>
      </div>
    );
  }

  // BEGINNER MODE: Show friendly explanations and coaching hints
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
        {parsed.isUserCodeError ? (
          <>
            {/* Primary error message - human-friendly for both syntax and runtime */}
            <p className={cn("text-sm", style.headerText)}>
              {parsed.friendlyMessage}
            </p>

            {/* Runtime Error: Show specific error type and message */}
            {isRuntimeError(parsed) && (
              <div className="text-xs font-mono bg-muted/50 rounded px-2 py-1.5 border border-border/30">
                <span className="text-red-600 dark:text-red-400 font-medium">{parsed.type}</span>
                <span className="text-muted-foreground">: </span>
                <span className="text-foreground/80">{parsed.message}</span>
              </div>
            )}

            {/* Fix hint - coaching guidance */}
            {parsed.fixHint && (
              <p className="text-xs text-muted-foreground italic flex items-start gap-1.5">
                <span>💡</span>
                <span>{parsed.fixHint}</span>
              </p>
            )}

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

      {/* Technical Details (Collapsible) - Raw stderr output */}
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
              {isSyntaxError(parsed) ? parsed.rawError : cleanErrorMessage(parsed.rawError)}
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
  errorMessageStyle?: 'beginner' | 'standard' | 'advanced';
}

/**
 * Compact error display for inline use in test case results
 * Supports Beginner (friendly), Standard (cleaned raw), and Advanced (full raw) modes
 */
export function CompactError({ error, language, userCodeLineCount, onLineClick, errorMessageStyle = 'beginner' }: CompactErrorProps) {
  const parsed = parseCodeError(error, language, userCodeLineCount);
  const isBeginnerMode = errorMessageStyle === 'beginner';
  const isAdvancedMode = errorMessageStyle === 'advanced';
  
  if (!parsed.isUserCodeError) {
    return (
      <div className="text-muted-foreground text-xs font-mono">
        <span className="font-medium">Internal Error</span>
        <span className="ml-1 opacity-75">— system issue, please retry</span>
      </div>
    );
  }

  // ADVANCED MODE: Full raw error output, no stripping
  if (isAdvancedMode) {
    return (
      <div className="text-xs font-mono space-y-1">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <span className="font-bold">{parsed.type}</span>
          {parsed.userLine && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLineClick?.(parsed.userLine!);
              }}
              className="text-xs px-1 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 transition-colors"
            >
              line {parsed.userLine}
            </button>
          )}
        </div>
        <pre className="text-foreground/70 whitespace-pre-wrap overflow-x-auto max-w-full max-h-48 overflow-y-auto">
          {parsed.rawError}
        </pre>
      </div>
    );
  }

  // STANDARD MODE: Raw language-native error, cleaned of internal paths
  if (!isBeginnerMode) {
    return (
      <div className="text-xs font-mono space-y-1">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <span className="font-bold">{parsed.type}</span>
          {parsed.userLine && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLineClick?.(parsed.userLine!);
              }}
              className="text-xs px-1 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 transition-colors"
            >
              line {parsed.userLine}
            </button>
          )}
        </div>
        <pre className="text-foreground/70 whitespace-pre-wrap overflow-x-auto max-w-full">
          {cleanErrorMessage(parsed.rawError)}
        </pre>
      </div>
    );
  }
  
  // BEGINNER MODE: Friendly explanations
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
  errorMessageStyle?: 'beginner' | 'standard' | 'advanced';
}

export function InlineError({ error, language, userCodeLineCount, onLineClick, errorMessageStyle = 'beginner' }: InlineErrorProps) {
  const parsed = parseCodeError(error, language, userCodeLineCount);
  const isBeginnerMode = errorMessageStyle === 'beginner';
  
  if (!parsed.isUserCodeError) {
    return (
      <span className="text-muted-foreground text-xs">
        Internal error (not your code)
      </span>
    );
  }
  
  // For both Standard and Advanced, show raw type (Advanced just uses longer messages elsewhere)
  return (
    <span className="text-red-600 dark:text-red-400 text-xs font-mono">
      <span className="font-medium">{isBeginnerMode ? parsed.friendlyType : parsed.type}</span>
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
