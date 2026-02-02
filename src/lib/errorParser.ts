/**
 * LeetCode-style Error Parser
 * Transforms raw execution errors into clean, learner-friendly messages
 * 
 * RESPONSIBILITY: This parser handles ONLY:
 * - Compilation failures (syntax, indentation, parse errors)
 * - Execution crashes (runtime errors)
 * - Platform/internal errors (timeouts, signals, infrastructure)
 * 
 * This parser does NOT handle:
 * - Output comparison (Expected vs Output)
 * - Test case counts or pass/fail ratios
 * - Wrong Answer verdicts
 * These belong in a separate Result Evaluator.
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

/** Error categories aligned with execution phases */
export type ErrorCategory = 'compilation' | 'execution' | 'internal';

/** Execution phase where the error occurred */
export type ExecutionPhase = 'compile' | 'runtime' | 'system';

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
  /** Human-friendly type label (e.g., "Compilation Error", "Runtime Error") */
  friendlyType: string;
  /** Combined message: friendly explanation + specific error */
  friendlyMessage: string;
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
  type: string;
  explanation: string;
  category: ErrorCategory;
  phase: ExecutionPhase;
}

const ERROR_EXPLANATIONS: Record<string, ErrorInfo> = {
  // =========================================================================
  // Compilation Errors (syntax, indentation, parse issues)
  // =========================================================================
  SyntaxError: {
    type: 'Compilation Error',
    explanation: 'There is a typo or invalid syntax in your code.',
    category: 'compilation',
    phase: 'compile',
  },
  IndentationError: {
    type: 'Compilation Error',
    explanation: 'Check your spacing — Python requires consistent indentation.',
    category: 'compilation',
    phase: 'compile',
  },
  TabError: {
    type: 'Compilation Error',
    explanation: 'Inconsistent use of tabs and spaces for indentation.',
    category: 'compilation',
    phase: 'compile',
  },

  // =========================================================================
  // Execution Errors (runtime crashes)
  // =========================================================================
  NameError: {
    type: 'Runtime Error',
    explanation: 'You used a variable or function that was never defined.',
    category: 'execution',
    phase: 'runtime',
  },
  TypeError: {
    type: 'Runtime Error',
    explanation: 'Operation applied to incompatible types.',
    category: 'execution',
    phase: 'runtime',
  },
  ValueError: {
    type: 'Runtime Error',
    explanation: 'The value is invalid for this operation.',
    category: 'execution',
    phase: 'runtime',
  },
  IndexError: {
    type: 'Runtime Error',
    explanation: 'You tried to access an index that doesn\'t exist.',
    category: 'execution',
    phase: 'runtime',
  },
  KeyError: {
    type: 'Runtime Error',
    explanation: 'The key doesn\'t exist in the dictionary.',
    category: 'execution',
    phase: 'runtime',
  },
  AttributeError: {
    type: 'Runtime Error',
    explanation: 'The object doesn\'t have this attribute or method.',
    category: 'execution',
    phase: 'runtime',
  },
  ZeroDivisionError: {
    type: 'Runtime Error',
    explanation: 'You tried to divide by zero.',
    category: 'execution',
    phase: 'runtime',
  },
  RecursionError: {
    type: 'Runtime Error',
    explanation: 'Too many recursive calls — check your base case.',
    category: 'execution',
    phase: 'runtime',
  },
  MemoryError: {
    type: 'Runtime Error',
    explanation: 'Your code ran out of memory — optimize your solution.',
    category: 'execution',
    phase: 'runtime',
  },
  StopIteration: {
    type: 'Runtime Error',
    explanation: 'Attempted to get next item from empty iterator.',
    category: 'execution',
    phase: 'runtime',
  },
  UnboundLocalError: {
    type: 'Runtime Error',
    explanation: 'Variable referenced before assignment in local scope.',
    category: 'execution',
    phase: 'runtime',
  },
  RuntimeError: {
    type: 'Runtime Error',
    explanation: 'An error occurred while running your code.',
    category: 'execution',
    phase: 'runtime',
  },
  Exception: {
    type: 'Runtime Error',
    explanation: 'An exception was raised during execution.',
    category: 'execution',
    phase: 'runtime',
  },

  // JavaScript errors
  ReferenceError: {
    type: 'Runtime Error',
    explanation: 'You used a variable that was never defined.',
    category: 'execution',
    phase: 'runtime',
  },
  RangeError: {
    type: 'Runtime Error',
    explanation: 'A value is not in the expected range.',
    category: 'execution',
    phase: 'runtime',
  },

  // Generic fallback
  Error: {
    type: 'Error',
    explanation: 'An unexpected error occurred.',
    category: 'execution',
    phase: 'runtime',
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
// Compilation Error Detection (syntax, indentation, parse)
// ============================================================================

const COMPILATION_ERROR_TYPES = [
  'SyntaxError',
  'IndentationError',
  'TabError',
];

function isCompilationErrorType(errorType: string): boolean {
  return COMPILATION_ERROR_TYPES.includes(errorType);
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
    category: 'execution',
    executionPhase: 'runtime',
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
  if (isCompilationErrorType(result.type)) {
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
  
  if (isCompilationErrorType(result.type)) {
    result.category = 'compilation';
    result.executionPhase = 'compile';
    result.friendlyType = 'Compilation Error';
  } else {
    result.category = errorInfo.category;
    result.executionPhase = errorInfo.phase;
    result.friendlyType = errorInfo.type;
  }

  // 7. Build combined friendly message (explanation + specific error)
  result.friendlyMessage = buildFriendlyMessage(errorInfo.explanation, result.message);

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
    category: 'execution',
    executionPhase: 'runtime',
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

  // Check for SyntaxError (compilation)
  if (result.type === 'SyntaxError') {
    result.category = 'compilation';
    result.executionPhase = 'compile';
    result.friendlyType = 'Compilation Error';
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
  if (result.category !== 'compilation') {
    result.category = errorInfo.category;
    result.executionPhase = errorInfo.phase;
    result.friendlyType = errorInfo.type;
  }
  result.friendlyMessage = buildFriendlyMessage(errorInfo.explanation, result.message);

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
 * RESPONSIBILITY: Handles ONLY compilation, execution, and internal errors.
 * Does NOT handle output comparison, test case results, or Wrong Answer logic.
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
    category: 'execution',
    executionPhase: 'runtime',
    isUserCodeError: true,
    friendlyType: 'Error',
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
    case 'compile':
      return 'during compilation';
    case 'runtime':
      return 'during execution';
    case 'system':
      return 'due to a system issue';
    default:
      return '';
  }
}
