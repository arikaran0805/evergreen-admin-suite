import { cn } from "@/lib/utils";
import { parseCodeError } from "@/lib/errorParser";

interface ErrorDisplayProps {
  error: string;
  language: string;
  userCodeLineCount: number;
  className?: string;
  onLineClick?: (line: number) => void;
}

/**
 * Unified Error Display Component
 * 
 * 🔴 Global Error UI Rules (Mandatory)
 * ❌ No border
 * ❌ No copy icon
 * ✅ Red background (soft red)
 * ✅ Rounded corners
 * ✅ Padding inside container
 * ✅ Monospace font for code + stack traces
 * ✅ Emoji allowed
 * 
 * 🧱 Error Container Layout
 * Order: Title → Explanation → Code Line + caret → Hint
 */
export function ErrorDisplay({ 
  error, 
  language, 
  userCodeLineCount, 
  className,
  onLineClick
}: ErrorDisplayProps) {
  const parsed = parseCodeError(error, language, userCodeLineCount);

  return (
    <div className={cn(
      "rounded-lg bg-red-500/10 p-4 font-mono text-sm space-y-3",
      className
    )}>
      {/* 1. Error Title with emoji */}
      <div className="font-bold text-red-600 dark:text-red-400">
        ❌ {parsed.friendlyType}
      </div>

      {parsed.isUserCodeError ? (
        <>
          {/* 2. Friendly Explanation - simple human sentence */}
          <p className="text-sm text-red-600/90 dark:text-red-400/90">
            {parsed.friendlyMessage}
          </p>

          {/* 3. Code Line with caret (^) */}
          {parsed.codeLine && (
            <div className="bg-background/50 rounded px-2 py-1.5">
              <pre className="text-foreground/90 whitespace-pre overflow-x-auto text-xs">
                {parsed.codeLine}
              </pre>
              {parsed.pointer && (
                <pre className="whitespace-pre text-red-600 dark:text-red-400 text-xs">
                  {parsed.pointer.replace(/^\s{4}/, '')}
                </pre>
              )}
            </div>
          )}

          {/* Line reference - clickable */}
          {parsed.userLine && (
            <button
              onClick={() => onLineClick?.(parsed.userLine!)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline decoration-dashed"
            >
              Line {parsed.userLine}
            </button>
          )}

          {/* 4. Hint / Guidance with emoji */}
          {parsed.fixHint && (
            <p className="text-xs text-muted-foreground flex items-start gap-1.5">
              <span>💡</span>
              <span>{parsed.fixHint}</span>
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          This looks like a system issue on our side. Please try again.
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Compact Error (for test case results)
// ============================================================================

interface CompactErrorProps {
  error: string;
  language: string;
  userCodeLineCount: number;
  onLineClick?: (line: number) => void;
}

/**
 * Compact error display for inline use in test case results
 * Single red container, no borders, no icons
 */
export function CompactError({ 
  error, 
  language, 
  userCodeLineCount, 
  onLineClick
}: CompactErrorProps) {
  const parsed = parseCodeError(error, language, userCodeLineCount);
  
  if (!parsed.isUserCodeError) {
    return (
      <div className="text-muted-foreground text-xs font-mono bg-red-500/10 rounded-lg p-3">
        <span className="font-medium">Internal Error</span>
        <span className="ml-1 opacity-75">— system issue, please retry</span>
      </div>
    );
  }

  return (
    <div className="text-xs font-mono bg-red-500/10 rounded-lg p-3 space-y-2">
      {/* 1. Title with emoji */}
      <div className="font-bold text-red-600 dark:text-red-400">
        ❌ {parsed.friendlyType}
      </div>
      
      {/* 2. Explanation */}
      <div className="text-red-600/80 dark:text-red-400/80">
        {parsed.friendlyMessage}
      </div>
      
      {/* 3. Code snippet with caret */}
      {parsed.codeLine && (
        <div className="bg-background/50 rounded px-2 py-1">
          <pre className="text-foreground/70 whitespace-pre overflow-x-auto max-w-full">
            {parsed.codeLine}
          </pre>
          {parsed.pointer && (
            <pre className="whitespace-pre text-red-600 dark:text-red-400">
              {parsed.pointer.replace(/^\s{4}/, '')}
            </pre>
          )}
        </div>
      )}
      
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
      
      {/* 4. Hint with emoji */}
      {parsed.fixHint && (
        <p className="text-muted-foreground flex items-start gap-1.5">
          <span>💡</span>
          <span>{parsed.fixHint}</span>
        </p>
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
  
  if (!parsed.isUserCodeError) {
    return (
      <span className="text-muted-foreground text-xs">
        Internal error (not your code)
      </span>
    );
  }
  
  return (
    <span className="text-red-600 dark:text-red-400 text-xs font-mono">
      <span className="font-medium">
        ❌ {parsed.friendlyType}
      </span>
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
