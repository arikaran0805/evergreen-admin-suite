import { useState } from "react";
import { cn } from "@/lib/utils";
import { parseCodeError } from "@/lib/errorParser";
import { Copy, Check, ChevronUp, ChevronDown } from "lucide-react";

interface ErrorDisplayProps {
  error: string;
  language: string;
  userCodeLineCount: number;
  className?: string;
  onLineClick?: (line: number) => void;
}

/**
 * LeetCode-style Error Display Component
 * 
 * Rules:
 * - Title: Always "Runtime Error" (no syntax vs runtime differentiation)
 * - Body: Monospace with ExceptionType: Message, code line, full stack trace
 * - No emojis, no hints, no beginner messaging
 * - Soft red background, no border, rounded corners
 * - Copy icon at top-right
 * - View less/more toggle when content exceeds height
 */
export function ErrorDisplay({ 
  error, 
  language, 
  userCodeLineCount, 
  className,
  onLineClick
}: ErrorDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);
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

  // Format the error content exactly like LeetCode
  const formattedContent = parsed.rawError || error;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Title - Always "Runtime Error" */}
      <h3 className="text-xl font-semibold text-red-500">
        Runtime Error
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

        {/* Error Content - Monospace */}
        <div className={cn(
          "font-mono text-sm text-red-500 pr-10 overflow-x-auto",
          !expanded && "max-h-32 overflow-hidden"
        )}>
          <pre className="whitespace-pre-wrap break-words">
            {formattedContent}
          </pre>
        </div>

        {/* View Less/More Toggle */}
        {formattedContent.split('\n').length > 5 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 mx-auto mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                View less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                View more
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Compact Error (for test case results) - Same LeetCode style
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
  const [expanded, setExpanded] = useState(false);
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

  const formattedContent = parsed.rawError || error;
  const lineCount = formattedContent.split('\n').length;

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
      <div className={cn(
        "font-mono text-xs text-red-500 pr-8 overflow-x-auto",
        !expanded && lineCount > 5 && "max-h-24 overflow-hidden"
      )}>
        <pre className="whitespace-pre-wrap break-words">
          {formattedContent}
        </pre>
      </div>

      {/* Toggle */}
      {lineCount > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 mx-auto mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
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
