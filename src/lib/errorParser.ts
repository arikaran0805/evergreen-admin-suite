/**
 * LeetCode-style Error Parser
 * Transforms raw execution errors into clean, learner-friendly messages
 * 
 * RESPONSIBILITY: This parser handles ONLY:
 * - Syntax Errors (syntax, indentation, parse failures - occur BEFORE execution)
 * - Runtime Errors (crashes during execution - IndexError, TypeError, etc.)
 * - Internal Errors (platform/infrastructure failures - never blame the learner)
 * 
 * This parser does NOT handle:
 * - Logical Errors (wrong output comparison - Expected vs Your Output)
 * - Test case counts or pass/fail ratios
 * - Wrong Answer verdicts
 * These belong in a separate Result Evaluator that runs AFTER successful execution.
 * 
 * THREE LEARNER-FACING ERROR TYPES:
 * 1. Syntax Error - Code couldn't be parsed/compiled. No test results shown.
 * 2. Runtime Error - Code crashed during execution. Shows which test case crashed.
 * 3. Logical Error - Code ran but produced wrong output. (NOT handled here)
 */

// Line offsets for different languages (where user code starts in wrapped template)
export const USER_CODE_START_LINES: Record<string, number> = {
  python: 5,
  javascript: 3,
  typescript: 3,
  java: 10,
  cpp: 15,
};

// ============================================================================
// Types
// ============================================================================

/** 
 * Error categories for internal classification
 * - 'syntax': Parse/compile-time errors (SyntaxError, IndentationError)
 * - 'runtime': Execution crashes (NameError, TypeError, IndexError, etc.)
 * - 'internal': Platform/infrastructure failures (never user's fault)
 */
export type ErrorCategory = 'syntax' | 'runtime' | 'internal';

/** Execution phase where the error occurred */
export type ExecutionPhase = 'parse' | 'execution' | 'system';

export interface ParsedError {
  /** Original error type from the error message (e.g., "SyntaxError", "NameError") */
  type: string;
  /** Clean error message without stack traces */
  message: string;
  /** Error category for styling and UX */
  category: ErrorCategory;
  /** Phase where the error occurred */
  executionPhase: ExecutionPhase;
  /** Line number in the original wrapped code */
  originalLine?: number;
  /** Mapped line number in user's visible code */
  userLine?: number;
  /** Whether this is a user code error vs platform error */
  isUserCodeError: boolean;
  /** Human-friendly type label: "Syntax Error", "Runtime Error", or "Internal Error" */
  friendlyType: string;
  /** Combined message: friendly explanation + specific error */
  friendlyMessage: string;
  /** Guidance on what kind of fix is required */
  fixHint?: string;
  /** The actual code line that caused the error */
  codeLine?: string;
  /** Caret pointer position (e.g., "       ^") */
  pointer?: string;
  /** Full raw stderr for technical details */
  rawError: string;
  /** Legacy: code snippet (for backward compatibility) */
  codeSnippet?: string;
}

// ============================================================================
// Error Explanations with Category Mapping
// ============================================================================

interface ErrorInfo {
  friendlyType: string;
  explanation: string;
  fixHint: string;
  category: ErrorCategory;
  phase: ExecutionPhase;
}

const ERROR_EXPLANATIONS: Record<string, ErrorInfo> = {
  // =========================================================================
  // Syntax Errors (parse/compile-time - code couldn't even start running)
  // =========================================================================
  SyntaxError: {
    friendlyType: 'Syntax Error',
    explanation: 'There is a typo or invalid syntax in your code.',
    fixHint: 'Check for missing brackets, colons, or quotes near the indicated line.',
    category: 'syntax',
    phase: 'parse',
  },
  IndentationError: {
    friendlyType: 'Syntax Error',
    explanation: 'Check your spacing — Python requires consistent indentation.',
    fixHint: 'Make sure all code blocks use the same number of spaces.',
    category: 'syntax',
    phase: 'parse',
  },
  TabError: {
    friendlyType: 'Syntax Error',
    explanation: 'Inconsistent use of tabs and spaces for indentation.',
    fixHint: 'Use only spaces (recommended) or only tabs, not both.',
    category: 'syntax',
    phase: 'parse',
  },

  // =========================================================================
  // Runtime Errors (crashes during execution)
  // =========================================================================
  NameError: {
    friendlyType: 'Runtime Error',
    explanation: 'You used a variable or function that was never defined.',
    fixHint: 'Check spelling and make sure the variable is defined before use.',
    category: 'runtime',
    phase: 'execution',
  },
  TypeError: {
    friendlyType: 'Runtime Error',
    explanation: 'Operation applied to incompatible types.',
    fixHint: 'Check the types of your variables and convert if needed.',
    category: 'runtime',
    phase: 'execution',
  },
  ValueError: {
    friendlyType: 'Runtime Error',
    explanation: 'The value is invalid for this operation.',
    fixHint: 'Check the input values being passed to the function.',
    category: 'runtime',
    phase: 'execution',
  },
  IndexError: {
    friendlyType: 'Runtime Error',
    explanation: 'You tried to access an index that doesn\'t exist.',
    fixHint: 'Check array/list bounds and ensure index is within range.',
    category: 'runtime',
    phase: 'execution',
  },
  KeyError: {
    friendlyType: 'Runtime Error',
    explanation: 'The key doesn\'t exist in the dictionary.',
    fixHint: 'Check if the key exists before accessing, or use .get() method.',
    category: 'runtime',
    phase: 'execution',
  },
  AttributeError: {
    friendlyType: 'Runtime Error',
    explanation: 'The object doesn\'t have this attribute or method.',
    fixHint: 'Check the object type and available methods.',
    category: 'runtime',
    phase: 'execution',
  },
  ZeroDivisionError: {
    friendlyType: 'Runtime Error',
    explanation: 'You tried to divide by zero.',
    fixHint: 'Add a check to ensure the divisor is not zero.',
    category: 'runtime',
    phase: 'execution',
  },
  RecursionError: {
    friendlyType: 'Runtime Error',
    explanation: 'Too many recursive calls — check your base case.',
    fixHint: 'Ensure your recursion has a proper base case that terminates.',
    category: 'runtime',
    phase: 'execution',
  },
  MemoryError: {
    friendlyType: 'Runtime Error',
    explanation: 'Your code ran out of memory — optimize your solution.',
    fixHint: 'Look for ways to reduce memory usage or use a more efficient algorithm.',
    category: 'runtime',
    phase: 'execution',
  },
  StopIteration: {
    friendlyType: 'Runtime Error',
    explanation: 'Attempted to get next item from empty iterator.',
    fixHint: 'Check if the iterator has items before calling next().',
    category: 'runtime',
    phase: 'execution',
  },
  UnboundLocalError: {
    friendlyType: 'Runtime Error',
    explanation: 'Variable referenced before assignment in local scope.',
    fixHint: 'Initialize the variable before using it, or use "global" keyword.',
    category: 'runtime',
    phase: 'execution',
  },
  RuntimeError: {
    friendlyType: 'Runtime Error',
    explanation: 'An error occurred while running your code.',
    fixHint: 'Review the error message for specific guidance.',
    category: 'runtime',
    phase: 'execution',
  },
  Exception: {
    friendlyType: 'Runtime Error',
    explanation: 'An exception was raised during execution.',
    fixHint: 'Check the error message for details on what went wrong.',
    category: 'runtime',
    phase: 'execution',
  },

  // JavaScript errors
  ReferenceError: {
    friendlyType: 'Runtime Error',
    explanation: 'You used a variable that was never defined.',
    fixHint: 'Check spelling and make sure the variable is declared.',
    category: 'runtime',
    phase: 'execution',
  },
  RangeError: {
    friendlyType: 'Runtime Error',
    explanation: 'A value is not in the expected range.',
    fixHint: 'Check array sizes and numeric values.',
    category: 'runtime',
    phase: 'execution',
  },

  // Generic fallback
  Error: {
    friendlyType: 'Runtime Error',
    explanation: 'An unexpected error occurred.',
    fixHint: 'Review the error message for specific guidance.',
    category: 'runtime',
    phase: 'execution',
  },
};

// ============================================================================
// Internal Path Patterns to Strip
// ============================================================================

const INTERNAL_PATH_PATTERNS = [
  /\/usr\/lib\/python/i,
  /\/piston\/jobs\//i,
  /importlib/i,
  /_bootstrap/i,
  /_driver\.py/i,
  /site-packages/i,
  /<frozen/i,
  /runpy\.py/i,
  /code\.py/i,
  /__pycache__/i,
];

function isInternalFrame(line: string): boolean {
  return INTERNAL_PATH_PATTERNS.some(pattern => pattern.test(line));
}

// ============================================================================
// Internal/Platform Error Detection
// ============================================================================

const INTERNAL_ERROR_PATTERNS = [
  /execution timed out/i,
  /time limit exceeded/i,
  /TLE/i,
  /runner.*crash/i,
  /infrastructure.*fail/i,
  /internal.*error.*system/i,
  /piston.*error/i,
  /container.*error/i,
  /sandbox.*error/i,
  /SIGKILL/i,
  /SIGTERM/i,
  /signal\s*\d+/i,
  /killed/i,
  /out of memory.*system/i,
  /cannot allocate memory/i,
  /segmentation fault/i,
  /bus error/i,
  /core dumped/i,
];

function isInternalError(errorText: string): boolean {
  return INTERNAL_ERROR_PATTERNS.some(pattern => pattern.test(errorText));
}

// ============================================================================
// Syntax Error Detection (parse-time errors)
// ============================================================================

const SYNTAX_ERROR_TYPES = [
  'SyntaxError',
  'IndentationError',
  'TabError',
];

function isSyntaxErrorType(errorType: string): boolean {
  return SYNTAX_ERROR_TYPES.includes(errorType);
}

// ============================================================================
// Runtime Error Detection (execution-time crashes)
// ============================================================================

const RUNTIME_ERROR_TYPES = [
  'NameError',
  'TypeError',
  'ValueError',
  'IndexError',
  'KeyError',
  'AttributeError',
  'ZeroDivisionError',
  'RecursionError',
  'MemoryError',
  'StopIteration',
  'UnboundLocalError',
  'RuntimeError',
  'AssertionError',
  'OverflowError',
  'FileNotFoundError',
  'IOError',
  'ImportError',
  'ModuleNotFoundError',
  // JavaScript
  'ReferenceError',
  'RangeError',
  'URIError',
  'EvalError',
];

function isRuntimeErrorType(errorType: string): boolean {
  return RUNTIME_ERROR_TYPES.includes(errorType);
}

// ============================================================================
// Caret/Pointer Detection (improved for indented pointers)
// ============================================================================

/**
 * Detect caret pointer lines, supporting indented pointers
 * Matches: "^", "    ^", "        ^^^", etc.
 */
function isCaretLine(line: string): boolean {
  return /^\s*\^+\s*$/.test(line);
}

/**
 * Extract code line and caret pointer from Python error output
 * Handles both standard and indented caret formats
 */
function extractCodeAndPointer(
  lines: string[],
  startIndex: number
): { codeLine?: string; pointer?: string } {
  let codeLine: string | undefined;
  let pointer: string | undefined;

  for (let i = startIndex; i < Math.min(startIndex + 3, lines.length); i++) {
    const line = lines[i];
    
    // Skip empty lines and error type lines
    if (!line.trim()) continue;
    if (/^(\w+Error|\w+Exception):/.test(line.trim())) continue;
    if (/^File\s/.test(line.trim())) continue;
    
    // Check for caret pointer (supports indented pointers)
    if (isCaretLine(line)) {
      pointer = line;
      break;
    }
    
    // This is likely the code line
    if (!codeLine && line.trim()) {
      codeLine = line.replace(/^\s{4}/, ''); // Remove standard 4-space indent
    }
  }

  return { codeLine, pointer };
}

// ============================================================================
// Combine Friendly Explanation with Specific Error Message
// ============================================================================

function buildFriendlyMessage(explanation: string, specificMessage: string): string {
  if (!specificMessage || specificMessage === explanation) {
    return explanation;
  }
  
  // Clean up the specific message
  const cleanMessage = specificMessage.trim();
  
  // If explanation already contains the essence of the message, don't duplicate
  if (explanation.toLowerCase().includes(cleanMessage.toLowerCase())) {
    return explanation;
  }
  
  // Combine: friendly explanation + specific error
  return `${explanation} ${cleanMessage}`;
}

// ============================================================================
// Python Error Parser
// ============================================================================

function parsePythonError(
  errorText: string,
  userCodeLineCount: number
): ParsedError {
  const result: ParsedError = {
    type: 'Error',
    message: '',
    category: 'runtime',
    executionPhase: 'execution',
    isUserCodeError: true,
    friendlyType: 'Runtime Error',
    friendlyMessage: 'An error occurred',
    rawError: errorText,
  };

  const lines = errorText.split('\n');

  // 1. Extract error type and message from the last error line
  let errorTypeLineIndex = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    const match = lines[i].match(/^(\w+(?:Error|Exception)):\s*(.*)$/);
    if (match) {
      result.type = match[1];
      result.message = match[2].trim();
      errorTypeLineIndex = i;
      break;
    }
  }

  // 2. Handle SyntaxError with detailed messages (Python 3.10+)
  if (result.type === 'SyntaxError' && !result.message) {
    for (let i = 0; i < lines.length; i++) {
      const syntaxMatch = lines[i].match(/^\s*(?:SyntaxError:\s*)?(.+(?:was never closed|unexpected EOF|invalid syntax|expected).*)$/i);
      if (syntaxMatch) {
        result.message = syntaxMatch[1].trim();
        break;
      }
    }
  }

  // 3. Extract line number - find the LAST user-code relevant line reference
  let relevantLineNumber: number | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip internal frames
    if (isInternalFrame(line)) continue;

    // Match: File "...", line X or File "<string>", line X
    const fileLineMatch = line.match(/File\s*"([^"]*)",\s*line\s*(\d+)/i);
    if (fileLineMatch) {
      const fileName = fileLineMatch[1];
      const lineNum = parseInt(fileLineMatch[2], 10);
      
      // Skip if it's clearly an internal file
      if (!isInternalFrame(fileName)) {
        relevantLineNumber = lineNum;
        
        // Extract code line and pointer from subsequent lines
        const { codeLine, pointer } = extractCodeAndPointer(lines, i + 1);
        if (codeLine) {
          result.codeLine = codeLine;
          result.codeSnippet = codeLine;
        }
        if (pointer) {
          result.pointer = pointer;
        }
      }
    }
  }

  // 4. For SyntaxError, also scan for standalone code + pointer blocks
  if (isSyntaxErrorType(result.type)) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Look for caret pointer line (supports indented pointers)
      if (isCaretLine(line) && i > 0) {
        // Previous non-empty line should be the code
        for (let j = i - 1; j >= 0; j--) {
          const prevLine = lines[j];
          if (prevLine.trim() && !prevLine.match(/File\s/) && !prevLine.match(/^(\w+Error|\w+Exception):/)) {
            result.codeLine = prevLine.replace(/^\s+/, '');
            result.codeSnippet = result.codeLine;
            result.pointer = line;
            break;
          }
        }
        break;
      }
    }
  }

  // 5. Map line number to user's visible code
  if (relevantLineNumber !== undefined) {
    result.originalLine = relevantLineNumber;
    const userCodeStartLine = USER_CODE_START_LINES.python;
    const mappedLine = relevantLineNumber - userCodeStartLine + 1;
    
    if (mappedLine >= 1 && mappedLine <= userCodeLineCount) {
      result.userLine = mappedLine;
      result.isUserCodeError = true;
    } else if (mappedLine < 1) {
      result.isUserCodeError = false;
    }
  }

  // 6. Determine category and phase based on error type
  const errorInfo = ERROR_EXPLANATIONS[result.type] || ERROR_EXPLANATIONS.Error;
  
  if (isSyntaxErrorType(result.type)) {
    result.category = 'syntax';
    result.executionPhase = 'parse';
    result.friendlyType = 'Syntax Error';
    // For syntax errors: Keep ONLY the human-friendly explanation
    // Raw compiler messages go in "View technical details" via rawError
    result.friendlyMessage = errorInfo.explanation;
  } else if (isRuntimeErrorType(result.type)) {
    result.category = 'runtime';
    result.executionPhase = 'execution';
    result.friendlyType = 'Runtime Error';
    // For runtime errors: Primary message explains code crashed
    // Specific error details shown separately in UI
    result.friendlyMessage = 'Your code started running but crashed during execution.';
    result.fixHint = errorInfo.fixHint || 'This often happens due to invalid indexing, division by zero, or accessing missing values.';
  } else {
    result.category = errorInfo.category;
    result.executionPhase = errorInfo.phase;
    result.friendlyType = errorInfo.friendlyType;
    result.friendlyMessage = buildFriendlyMessage(errorInfo.explanation, result.message);
    result.fixHint = errorInfo.fixHint;
  }

  return result;
}

// ============================================================================
// JavaScript Error Parser
// ============================================================================

function parseJavaScriptError(
  errorText: string,
  userCodeLineCount: number
): ParsedError {
  const result: ParsedError = {
    type: 'Error',
    message: '',
    category: 'runtime',
    executionPhase: 'execution',
    isUserCodeError: true,
    friendlyType: 'Runtime Error',
    friendlyMessage: 'An error occurred',
    rawError: errorText,
  };

  // Extract error type and message
  const errorTypeMatch = errorText.match(/^(\w+Error):\s*(.*)$/m);
  if (errorTypeMatch) {
    result.type = errorTypeMatch[1];
    result.message = errorTypeMatch[2].trim();
  }

  // Check for SyntaxError (syntax category)
  if (result.type === 'SyntaxError') {
    result.category = 'syntax';
    result.executionPhase = 'parse';
    result.friendlyType = 'Syntax Error';
  }

  // Look for line number in JS stack trace
  const lineMatches = [
    ...errorText.matchAll(/<anonymous>:(\d+):\d+/g),
    ...errorText.matchAll(/at\s+.*:(\d+):\d+/g),
  ];

  if (lineMatches.length > 0) {
    const originalLine = parseInt(lineMatches[0][1], 10);
    result.originalLine = originalLine;
    
    const userCodeStartLine = USER_CODE_START_LINES.javascript;
    const mappedLine = originalLine - userCodeStartLine + 1;
    
    if (mappedLine >= 1 && mappedLine <= userCodeLineCount) {
      result.userLine = mappedLine;
      result.isUserCodeError = true;
    } else {
      result.isUserCodeError = false;
    }
  }

  // Get friendly error info and build combined message
  const errorInfo = ERROR_EXPLANATIONS[result.type] || ERROR_EXPLANATIONS.Error;
  if (result.category !== 'syntax') {
    result.category = errorInfo.category;
    result.executionPhase = errorInfo.phase;
    result.friendlyType = errorInfo.friendlyType;
  }
  result.friendlyMessage = buildFriendlyMessage(errorInfo.explanation, result.message);
  result.fixHint = errorInfo.fixHint;

  return result;
}

// ============================================================================
// Create Internal Error Result
// ============================================================================

function createInternalError(errorText: string): ParsedError {
  return {
    type: 'InternalError',
    message: errorText,
    category: 'internal',
    executionPhase: 'system',
    isUserCodeError: false,
    friendlyType: 'Internal Error',
    friendlyMessage: 'This looks like a system issue on our side. Please try again.',
    fixHint: 'This is not your fault. Please try running your code again.',
    rawError: errorText,
  };
}

// ============================================================================
// Main Parser
// ============================================================================

/**
 * Parse error output from code execution and map to user's visible lines
 * Implements LeetCode-style error normalization
 * 
 * RESPONSIBILITY: Handles ONLY Syntax Errors, Runtime Errors, and Internal Errors.
 * Does NOT handle Logical Errors (output comparison, test case results, Wrong Answer).
 */
export function parseCodeError(
  errorText: string,
  language: string,
  userCodeLineCount: number
): ParsedError {
  // Handle null/undefined
  if (!errorText || typeof errorText !== 'string') {
    return createInternalError(errorText || '');
  }

  // Check for internal/platform errors first (timeouts, signals, infrastructure)
  // These should NEVER blame the learner
  if (isInternalError(errorText)) {
    return createInternalError(errorText);
  }

  const normalizedLang = language.toLowerCase();

  if (normalizedLang === 'python') {
    return parsePythonError(errorText, userCodeLineCount);
  }

  if (normalizedLang === 'javascript' || normalizedLang === 'typescript') {
    return parseJavaScriptError(errorText, userCodeLineCount);
  }

  // Generic fallback for unsupported languages
  return {
    type: 'Error',
    message: errorText,
    category: 'runtime',
    executionPhase: 'execution',
    isUserCodeError: true,
    friendlyType: 'Runtime Error',
    friendlyMessage: 'An error occurred during execution.',
    rawError: errorText,
  };
}

// ============================================================================
// Format Error for Display (Legacy support)
// ============================================================================

export function formatErrorForDisplay(parsed: ParsedError): string {
  if (!parsed.isUserCodeError) {
    return `Internal Error\n\nThis looks like a system issue on our side. Please try again.`;
  }

  let formatted = `${parsed.friendlyType}\n\n`;
  formatted += `${parsed.friendlyMessage}`;
  
  if (parsed.userLine && parsed.codeLine) {
    formatted += `\n\nLine ${parsed.userLine}:\n${parsed.codeLine}`;
    if (parsed.pointer) {
      formatted += `\n${parsed.pointer}`;
    }
  }

  return formatted;
}

// ============================================================================
// Monaco Editor Decorations (Preserved)
// ============================================================================

export function getErrorLineDecorations(
  userLine: number | undefined
): Array<{
  range: { startLineNumber: number; endLineNumber: number; startColumn: number; endColumn: number };
  options: {
    isWholeLine: boolean;
    className: string;
    glyphMarginClassName?: string;
    glyphMarginHoverMessage?: { value: string };
  };
}> {
  if (!userLine) return [];

  return [
    {
      range: {
        startLineNumber: userLine,
        endLineNumber: userLine,
        startColumn: 1,
        endColumn: 1,
      },
      options: {
        isWholeLine: true,
        className: 'error-line-highlight',
        glyphMarginClassName: 'error-line-glyph',
        glyphMarginHoverMessage: { value: 'Error on this line' },
      },
    },
  ];
}

// ============================================================================
// Clean Error Message (Strip paths and internal details)
// ============================================================================

export function cleanErrorMessage(errorText: string): string {
  const lines = errorText.split('\n');
  const cleanedLines: string[] = [];
  
  for (const line of lines) {
    // Skip internal stack frames
    if (isInternalFrame(line)) continue;
    
    // Skip "Traceback (most recent call last):" header
    if (line.includes('Traceback (most recent call last)')) continue;
    
    // Skip "During handling of the above exception" messages
    if (line.includes('During handling of')) continue;
    
    // Clean file paths
    let cleanedLine = line
      .replace(/File "\/piston\/jobs\/[^"]+"/g, 'File "<your code>"')
      .replace(/File "<string>"/g, 'File "<your code>"');
    
    cleanedLines.push(cleanedLine);
  }
  
  return cleanedLines.join('\n').trim();
}

// ============================================================================
// Utility: Check if error is user-actionable
// ============================================================================

export function isUserActionableError(parsed: ParsedError): boolean {
  return parsed.isUserCodeError && parsed.category !== 'internal';
}

// ============================================================================
// Utility: Get phase display text
// ============================================================================

export function getPhaseDisplayText(phase: ExecutionPhase): string {
  switch (phase) {
    case 'parse':
      return 'before execution (parsing)';
    case 'execution':
      return 'during execution';
    case 'system':
      return 'due to a system issue';
    default:
      return '';
  }
}

// ============================================================================
// Utility: Check if this is a syntax error (no test results should be shown)
// ============================================================================

export function isSyntaxError(parsed: ParsedError): boolean {
  return parsed.category === 'syntax';
}

// ============================================================================
// Utility: Check if this is a runtime error (show failing test case only)
// ============================================================================

export function isRuntimeError(parsed: ParsedError): boolean {
  return parsed.category === 'runtime';
}
