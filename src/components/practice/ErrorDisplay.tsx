import { useState } from "react";
import { cn } from "@/lib/utils";
import { parseCodeError, hasInternalFrames, getInternalFramesForDisplay } from "@/lib/errorParser";
import { Copy, Check, ChevronUp, ChevronDown, Eye, EyeOff } from "lucide-react";

interface ErrorDisplayProps {
  error: string;
  language: string;
  userCodeLineCount: number;
  className?: string;
  onLineClick?: (line: number) => void;
}

/**
 * Student-First Error Display Component
 * 
 * Design:
 * - Clean error card with soft red background
 * - Shows user-relevant error info by default
 * - Internal system frames hidden behind "View More" toggle
 * - Supportive coaching hints
 * - Copy icon at top-right
 */
export function ErrorDisplay({ 
  error, 
  language, 
  userCodeLineCount, 
  className,
  onLineClick
}: ErrorDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [showInternals, setShowInternals] = useState(false);
  const parsed = parseCodeError(error, language, userCodeLineCount);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(parsed.rawError || error);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleLineClick = () => {
    if (parsed.userLine && onLineClick) {
      onLineClick(parsed.userLine);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Title */}
      <h3 className="text-xl font-semibold text-red-500">
        {parsed.friendlyType}
      </h3>

      {/* Error Container */}
      <div className="relative rounded-lg bg-red-500/10 p-4">
        {/* Copy Button - Top Right */}
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 p-1.5 rounded hover:bg-red-500/20 transition-colors text-red-400"
          title="Copy error"
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>

        {/* Main Error Content */}
        <div className="pr-10 space-y-3">
          {/* Error Type and Message */}
          <div className="font-mono text-sm text-red-500">
            <span className="font-semibold">{parsed.type}</span>
            {parsed.message && <span>: {parsed.message}</span>}
          </div>

          {/* Code Snippet with Pointer */}
          {parsed.codeLine && (
            <div className="bg-red-500/5 rounded p-2 overflow-x-auto">
              <pre className="font-mono text-sm text-red-500 whitespace-pre">
                {parsed.codeLine}
              </pre>
              {parsed.pointer && (
                <pre className="font-mono text-sm text-red-400 whitespace-pre">
                  {parsed.pointer}
                </pre>
              )}
            </div>
          )}

          {/* Line Reference - Clickable */}
          {parsed.userLine && (
            <button
              onClick={handleLineClick}
              className="text-sm text-red-400 hover:text-red-300 hover:underline transition-colors"
            >
              Line {parsed.userLine}
              {language === 'python' && ' (Solution.py)'}
              {language === 'java' && ' (Solution.java)'}
              {(language === 'cpp' || language === 'c++') && ' (solution.cpp)'}
            </button>
          )}

          {/* Coach Hint */}
          {parsed.coachHint && (
            <div className="text-sm text-muted-foreground bg-muted/30 rounded-md p-2 mt-2">
              {parsed.coachHint}
            </div>
          )}

          {/* Internal Frames (View More) */}
          {hasInternalFrames(parsed) && (
            <div className="mt-3 pt-3 border-t border-red-500/20">
              <button
                onClick={() => setShowInternals(!showInternals)}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showInternals ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5" />
                    Hide system trace
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5" />
                    View system trace ({parsed.internalTraceback.length} frames)
                  </>
                )}
              </button>
              
              {showInternals && (
                <div className="mt-2 p-2 bg-muted/20 rounded text-xs font-mono text-muted-foreground overflow-x-auto max-h-48 overflow-y-auto">
                  <pre className="whitespace-pre-wrap break-words">
                    {getInternalFramesForDisplay(parsed)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Compact Error (for test case results) - Same Student-First style
// ============================================================================

interface CompactErrorProps {
  error: string;
  language: string;
  userCodeLineCount: number;
  onLineClick?: (line: number) => void;
}

export function CompactError({ 
  error, 
  language, 
  userCodeLineCount, 
  onLineClick
}: CompactErrorProps) {
  const [copied, setCopied] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const parsed = parseCodeError(error, language, userCodeLineCount);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(parsed.rawError || error);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleLineClick = () => {
    if (parsed.userLine && onLineClick) {
      onLineClick(parsed.userLine);
    }
  };

  return (
    <div className="relative rounded-lg bg-red-500/10 p-3">
      {/* Copy Button */}
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1 rounded hover:bg-red-500/20 transition-colors text-red-400"
        title="Copy error"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Error Content */}
      <div className="pr-8 space-y-2">
        {/* Error Type and Message */}
        <div className="font-mono text-xs text-red-500">
          <span className="font-semibold">{parsed.type}</span>
          {parsed.message && <span>: {parsed.message}</span>}
        </div>

        {/* Code Snippet (collapsed by default for compact) */}
        {parsed.codeLine && (
          <div className={cn(
            "font-mono text-xs text-red-500 overflow-hidden",
            !showMore && "max-h-12"
          )}>
            <pre className="whitespace-pre-wrap break-words">
              {parsed.codeLine}
            </pre>
            {parsed.pointer && (
              <pre className="text-red-400 whitespace-pre">
                {parsed.pointer}
              </pre>
            )}
          </div>
        )}

        {/* Line Reference */}
        {parsed.userLine && (
          <button
            onClick={handleLineClick}
            className="text-xs text-red-400 hover:text-red-300 hover:underline transition-colors"
          >
            Line {parsed.userLine}
          </button>
        )}

        {/* Toggle for more details */}
        {(hasInternalFrames(parsed) || (parsed.codeLine && parsed.codeLine.length > 50)) && (
          <button
            onClick={() => setShowMore(!showMore)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showMore ? (
              <>
                <ChevronUp className="h-3 w-3" />
                View less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                View more
              </>
            )}
          </button>
        )}

        {/* Internal frames when expanded */}
        {showMore && hasInternalFrames(parsed) && (
          <div className="mt-2 p-2 bg-muted/20 rounded text-xs font-mono text-muted-foreground overflow-x-auto max-h-32 overflow-y-auto">
            <pre className="whitespace-pre-wrap break-words">
              {getInternalFramesForDisplay(parsed)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Inline Error (minimal inline display)
// ============================================================================

interface InlineErrorProps {
  error: string;
  language: string;
  userCodeLineCount: number;
  onLineClick?: (line: number) => void;
}

export function InlineError({ 
  error, 
  language, 
  userCodeLineCount, 
  onLineClick
}: InlineErrorProps) {
  const parsed = parseCodeError(error, language, userCodeLineCount);
  
  return (
    <span className="text-red-500 text-xs font-mono">
      <span className="font-medium">
        {parsed.type}{parsed.message ? `: ${parsed.message}` : ''}
      </span>
    </span>
  );
}
