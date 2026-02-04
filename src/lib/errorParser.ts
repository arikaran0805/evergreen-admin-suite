/**
 * LeetCode-Style Error Parser
 * 
 * Core Rule: "Did the user's logic meaningfully begin execution?"
 * - NO  → Input Format Error (system fault)
 * - YES → Runtime Error (user fault)
 * 
 * Output is minimal, deterministic, and matches LeetCode exactly.
 */

// ============================================================================
// Types
// ============================================================================

export type ErrorCategory = 'syntax' | 'runtime' | 'internal';
export type ExecutionPhase = 'parse' | 'execution' | 'system';

export interface ParsedError {
  /** Error type displayed to user (e.g., "TypeError", "Runtime Error") */
  type: string;
  /** One-line normalized message */
  message: string;
  /** Error category */
  category: ErrorCategory;
  /** Phase where error occurred */
  executionPhase: ExecutionPhase;
  /** Whether this is a user code error */
  isUserCodeError: boolean;
  /** Raw stderr for internal logging */
  rawError: string;
}

// ============================================================================
// Line Offsets (for external use if needed)
// ============================================================================

export const USER_CODE_START_LINES: Record<string, number> = {
  python: 5,
  javascript: 3,
  typescript: 3,
  java: 10,
  cpp: 15,
  c: 12,
};

// ============================================================================
// Input Contract Error Detection
// ============================================================================

/**
 * Detects input contract failures where platform passed malformed input.
 * These are NOT the learner's fault and must be treated as system errors.
 * 
 * Conservative: prefer false-negative over false-positive.
 */
function isInputContractError(errorText: string, language: string): boolean {
  const text = errorText.toLowerCase();
  const lang = language.toLowerCase();

  // Python patterns
  if (lang === 'python') {
    const pythonPatterns = [
      'not all arguments converted during string formatting',
      'unsupported operand type',
      '% not supported between instances of',
      "can't multiply sequence by non-int",
      'object is not iterable',
      'is not iterable',
      'object is not subscriptable',
      'is not subscriptable',
      'object is not callable',
      'is not callable',
      'not enough values to unpack',
      'too many values to unpack',
      'cannot unpack non-iterable',
      'argument must be',
      'expected .* instance',
    ];
    
    for (const pattern of pythonPatterns) {
      if (text.includes(pattern) || new RegExp(pattern).test(text)) {
        // Exclude if clearly user logic error (after meaningful execution)
        if (hasUserExecutionContext(errorText)) return false;
        return true;
      }
    }
  }

  // JavaScript/TypeScript patterns
  if (lang === 'javascript' || lang === 'typescript') {
    const jsPatterns = [
      'is not iterable',
      'is not a function',
      'is not an object',
      'cannot read properties of undefined',
      'cannot read properties of null',
      'cannot read property',
      'cannot set properties of undefined',
      'cannot set properties of null',
      'undefined is not',
      'null is not',
    ];
    
    for (const pattern of jsPatterns) {
      if (text.includes(pattern)) {
        if (hasUserExecutionContext(errorText)) return false;
        return true;
      }
    }
  }

  // Java patterns
  if (lang === 'java') {
    const javaPatterns = [
      'classcastexception',
      'cannot be cast to',
      'incompatible types',
    ];
    
    for (const pattern of javaPatterns) {
      if (text.includes(pattern)) {
        if (hasUserExecutionContext(errorText)) return false;
        return true;
      }
    }
  }

  // C/C++ patterns - segfault on first call
  if (lang === 'c' || lang === 'cpp' || lang === 'c++') {
    if (text.includes('segmentation fault') || text.includes('sigsegv')) {
      // If no user stack trace, likely input contract issue
      if (!hasUserStackFrames(errorText)) return true;
    }
  }

  return false;
}

/**
 * Check if error shows evidence of meaningful user code execution.
 * If user code actually ran (not just function entry), it's a user error.
 */
function hasUserExecutionContext(errorText: string): boolean {
  // Multiple user-code line references suggest user logic ran
  const lineRefs = (errorText.match(/line \d+/gi) || []).length;
  if (lineRefs > 2) return true;
  
  // Loop/recursion indicators
  if (/for .* in .*:/i.test(errorText)) return true;
  if (/while .*:/i.test(errorText)) return true;
  
  return false;
}

/**
 * Check if error contains user stack frames (vs only system frames).
 */
function hasUserStackFrames(errorText: string): boolean {
  const userFilePatterns = [
    /solution\.(py|java|cpp|c|js|ts)/i,
    /file ".*solution/i,
    /at solution\./i,
  ];
  return userFilePatterns.some(p => p.test(errorText));
}

// ============================================================================
// Syntax Error Detection (Internal)
// ============================================================================

function detectSyntaxError(errorText: string, language: string): boolean {
  const text = errorText.toLowerCase();
  
  // Python
  if (text.includes('syntaxerror')) return true;
  if (text.includes('indentationerror')) return true;
  if (text.includes('taberror')) return true;
  
  // JavaScript
  if (text.includes('unexpected token')) return true;
  if (text.includes('unexpected end of input')) return true;
  if (text.includes('unexpected identifier')) return true;
  
  // Java
  if (text.includes('error: \';\' expected')) return true;
  if (text.includes('error: illegal start')) return true;
  if (text.includes('reached end of file while parsing')) return true;
  
  // C/C++
  if (text.includes('error: expected')) return true;
  if (/error:.*before .*token/i.test(text)) return true;
  
  return false;
}

// ============================================================================
// Internal/System Error Detection
// ============================================================================

function isInternalError(errorText: string): boolean {
  const text = errorText.toLowerCase();
  
  const patterns = [
    'execution timed out',
    'time limit exceeded',
    'tle',
    'sigkill',
    'sigterm',
    'killed',
    'out of memory',
    'cannot allocate memory',
    'container error',
    'sandbox error',
    'infrastructure',
  ];
  
  return patterns.some(p => text.includes(p));
}

// ============================================================================
// Error Type Extraction
// ============================================================================

function extractErrorType(errorText: string, language: string): string {
  const lang = language.toLowerCase();
  
  // Python error types
  const pythonMatch = errorText.match(/^(\w+Error|\w+Exception):/m);
  if (pythonMatch) return pythonMatch[1];
  
  // JavaScript error types
  const jsMatch = errorText.match(/(TypeError|ReferenceError|RangeError|SyntaxError|Error):/);
  if (jsMatch) return jsMatch[1];
  
  // Java exceptions
  const javaMatch = errorText.match(/Exception in thread.*?(\w+Exception)/);
  if (javaMatch) return javaMatch[1];
  
  // C/C++ - typically just "error" or signal
  if (lang === 'c' || lang === 'cpp' || lang === 'c++') {
    if (errorText.toLowerCase().includes('segmentation fault')) return 'Runtime Error';
    if (errorText.toLowerCase().includes('sigsegv')) return 'Runtime Error';
  }
  
  return 'Error';
}

// ============================================================================
// Main Parser
// ============================================================================

/**
 * Parse raw execution error into LeetCode-style minimal output.
 * 
 * @param errorText - Raw stderr from execution
 * @param language - Programming language
 * @param userCodeLineCount - Number of lines in user's code (unused in minimal mode)
 */
export function parseCodeError(
  errorText: string,
  language: string,
  userCodeLineCount: number = 0
): ParsedError {
  const rawError = errorText || '';
  
  // Empty input
  if (!rawError.trim()) {
    return {
      type: 'Error',
      message: 'Unknown error.',
      category: 'runtime',
      executionPhase: 'execution',
      isUserCodeError: true,
      rawError,
    };
  }

  // =========================================================================
  // 1. Check for Input Contract Errors (FIRST - short-circuits everything)
  // =========================================================================
  if (isInputContractError(rawError, language)) {
    const errorType = extractErrorType(rawError, language);
    const displayType = errorType.includes('Type') ? 'TypeError' : 'Runtime Error';
    
    return {
      type: displayType,
      message: 'Invalid input format.',
      category: 'internal',
      executionPhase: 'system',
      isUserCodeError: false,
      rawError,
    };
  }

  // =========================================================================
  // 2. Check for Internal/System Errors
  // =========================================================================
  if (isInternalError(rawError)) {
    return {
      type: 'Internal Error',
      message: 'System error occurred.',
      category: 'internal',
      executionPhase: 'system',
      isUserCodeError: false,
      rawError,
    };
  }

  // =========================================================================
  // 3. Check for Syntax Errors
  // =========================================================================
  if (detectSyntaxError(rawError, language)) {
    return {
      type: 'Syntax Error',
      message: 'Invalid syntax.',
      category: 'syntax',
      executionPhase: 'parse',
      isUserCodeError: true,
      rawError,
    };
  }

  // =========================================================================
  // 4. Runtime Errors (User Logic Errors)
  // =========================================================================
  const errorType = extractErrorType(rawError, language);
  const normalizedMessage = normalizeRuntimeMessage(rawError, errorType);
  
  return {
    type: errorType,
    message: normalizedMessage,
    category: 'runtime',
    executionPhase: 'execution',
    isUserCodeError: true,
    rawError,
  };
}

/**
 * Normalize runtime error message to one clean line.
 */
function normalizeRuntimeMessage(errorText: string, errorType: string): string {
  // Extract message after error type
  const colonMatch = errorText.match(new RegExp(`${errorType}:\\s*(.+?)(?:\\n|$)`));
  if (colonMatch && colonMatch[1]) {
    const msg = colonMatch[1].trim();
    // Strip any path references
    const cleaned = msg
      .replace(/\/[^\s]+/g, '')
      .replace(/File "[^"]+"/g, '')
      .replace(/line \d+/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned) return cleaned;
  }
  
  // Generic fallback based on error type
  switch (errorType) {
    case 'TypeError':
      return 'Invalid operation for the given data type.';
    case 'NameError':
    case 'ReferenceError':
      return 'Variable or function not defined.';
    case 'IndexError':
    case 'ArrayIndexOutOfBoundsException':
      return 'Index out of bounds.';
    case 'KeyError':
      return 'Key not found.';
    case 'ValueError':
      return 'Invalid value.';
    case 'ZeroDivisionError':
      return 'Division by zero.';
    case 'AttributeError':
      return 'Attribute not found.';
    case 'RecursionError':
      return 'Maximum recursion depth exceeded.';
    case 'NullPointerException':
      return 'Null pointer access.';
    default:
      return 'Runtime error occurred.';
  }
}

// ============================================================================
// Helper Exports (for ErrorDisplay compatibility)
// ============================================================================

/**
 * Check if parsed result is an input contract error.
 */
export function isInputContractErrorResult(parsed: ParsedError): boolean {
  return parsed.category === 'internal' && 
         parsed.executionPhase === 'system' && 
         !parsed.isUserCodeError &&
         parsed.message === 'Invalid input format.';
}

/**
 * Check if there are internal frames (always false in minimal mode).
 */
export function hasInternalFrames(parsed: ParsedError): boolean {
  return false;
}

/**
 * Get internal frames for display (empty in minimal mode).
 */
export function getInternalFramesForDisplay(parsed: ParsedError): string {
  return '';
}

// ============================================================================
// Exported Detection Helpers (for TestCasePanel)
// ============================================================================

/**
 * Check if a ParsedError represents a syntax error.
 */
export function isSyntaxError(parsed: ParsedError): boolean {
  return parsed.category === 'syntax';
}

/**
 * Check if a ParsedError represents a runtime error.
 */
export function isRuntimeError(parsed: ParsedError): boolean {
  return parsed.category === 'runtime';
}

/**
 * Check if text looks like an error message.
 */
export function looksLikeError(text?: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return (
    lower.includes('error') ||
    lower.includes('exception') ||
    lower.includes('traceback') ||
    lower.includes('failed') ||
    lower.includes('segmentation fault')
  );
}
