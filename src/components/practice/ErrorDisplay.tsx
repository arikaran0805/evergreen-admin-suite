import { useState } from "react";
import { cn } from "@/lib/utils";
import { parseCodeError, isInputContractErrorResult } from "@/lib/errorParser";
import { Copy, Check, AlertTriangle } from "lucide-react";

interface ErrorDisplayProps {
  error: string;
  language: string;
  userCodeLineCount: number;
  className?: string;
  onLineClick?: (line: number) => void;
}

/**
 * LeetCode-Style Error Display Component
 * 
 * Design:
 * - Minimal error card matching LeetCode's exact behavior
 * - Input Contract Errors: amber theme, no blame
 * - Runtime/Syntax Errors: red theme, minimal message
 * - No stack traces, no coaching, no line highlights
 */
export function ErrorDisplay({ 
  error, 
  language, 
  userCodeLineCount, 
  className,
  onLineClick
}: ErrorDisplayProps) {
  const [copied, setCopied] = useState(false);
  const parsed = parseCodeError(error, language, userCodeLineCount);
  
  // Check if this is an input contract error (platform issue, not user's fault)
  const isContractError = isInputContractErrorResult(parsed);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(parsed.rawError || error);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Input Contract Error: LeetCode-style neutral UI
  if (isContractError) {
    return (
      <div className={cn("space-y-3", className)}>
        {/* Title - Amber/Orange for platform issues */}
        <h3 className="text-xl font-semibold text-amber-500 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          {parsed.type}
        </h3>

        {/* Error Container - Amber background, calm styling */}
        <div className="relative rounded-lg bg-amber-500/10 p-4">
          {/* Main Message */}
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {parsed.message}
          </p>
        </div>
      </div>
    );
  }

  // Standard Error Display (user errors) - Minimal LeetCode style
  return (
    <div className={cn("space-y-3", className)}>
      {/* Title */}
      <h3 className="text-xl font-semibold text-red-500">
        {parsed.type}
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

        {/* Main Error Content - Minimal */}
        <div className="pr-10">
          <p className="font-mono text-sm text-red-500">
            {parsed.message}
          </p>
        </div>
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
  const parsed = parseCodeError(error, language, userCodeLineCount);
  
  // Check if this is an input contract error
  const isContractError = isInputContractErrorResult(parsed);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(parsed.rawError || error);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Input Contract Error: Compact amber UI
  if (isContractError) {
    return (
      <div className="relative rounded-lg bg-amber-500/10 p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
              {parsed.type}
            </p>
            <p className="text-xs text-muted-foreground">
              {parsed.message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Standard compact error display
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
      <div className="pr-8">
        <div className="font-mono text-xs text-red-500">
          <span className="font-semibold">{parsed.type}</span>
          {parsed.message && <span>: {parsed.message}</span>}
        </div>
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
  const isContractError = isInputContractErrorResult(parsed);
  
  // Input contract errors show amber with type
  if (isContractError) {
    return (
      <span className="text-amber-500 text-xs">
        <span className="font-medium">{parsed.type}</span>
      </span>
    );
  }
  
  return (
    <span className="text-red-500 text-xs font-mono">
      <span className="font-medium">
        {parsed.type}{parsed.message ? `: ${parsed.message}` : ''}
      </span>
    </span>
  );
}
