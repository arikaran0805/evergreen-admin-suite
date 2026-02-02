/**
 * LeetCode-style Error Parser
 * Transforms raw execution errors into clean, learner-friendly messages
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

export type ErrorCategory = 'syntax' | 'runtime' | 'internal';

export interface ParsedError {
  /** Original error type from the error message (e.g., "SyntaxError", "NameError") */
  type: string;
  /** Clean error message without stack traces */
  message: string;
  /** Error category for styling */
  category: ErrorCategory;
  /** Line number in the original wrapped code */
  originalLine?: number;
  /** Mapped line number in user's visible code */
  userLine?: number;
  /** Whether this is a user code error vs platform error */
  isUserCodeError: boolean;
  /** Human-friendly type label (e.g., "Syntax Error") */
  friendlyType: string;
  /** Human-friendly explanation for beginners */
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
// Error Explanations
// ============================================================================

const ERROR_EXPLANATIONS: Record<string, { type: string; explanation: string; category: ErrorCategory }> = {
  // Syntax Errors
  SyntaxError: {
    type: 'Syntax Error',
    explanation: 'There is a typo or invalid syntax in your code',
    category: 'syntax',
  },
  IndentationError: {
    type: 'Indentation Error',
    explanation: 'Check your spacing - Python requires consistent indentation',
    category: 'syntax',
  },
  TabError: {
    type: 'Tab Error',
    explanation: 'Inconsistent use of tabs and spaces for indentation',
    category: 'syntax',
  },

  // Runtime Errors
  NameError: {
    type: 'Name Error',
    explanation: 'You used a variable or function that was never defined',
    category: 'runtime',
  },
  TypeError: {
    type: 'Type Error',
    explanation: 'Operation applied to incompatible types',
    category: 'runtime',
  },
  ValueError: {
    type: 'Value Error',
    explanation: 'The value is invalid for this operation',
    category: 'runtime',
  },
  IndexError: {
    type: 'Index Error',
    explanation: 'You tried to access an index that doesn\'t exist',
    category: 'runtime',
  },
  KeyError: {
    type: 'Key Error',
    explanation: 'The key doesn\'t exist in the dictionary',
    category: 'runtime',
  },
  AttributeError: {
    type: 'Attribute Error',
    explanation: 'The object doesn\'t have this attribute or method',
    category: 'runtime',
  },
  ZeroDivisionError: {
    type: 'Division Error',
    explanation: 'You tried to divide by zero',
    category: 'runtime',
  },
  RecursionError: {
    type: 'Recursion Error',
    explanation: 'Too many recursive calls - check your base case',
    category: 'runtime',
  },
  MemoryError: {
    type: 'Memory Error',
    explanation: 'Your code ran out of memory - optimize your solution',
    category: 'runtime',
  },
  StopIteration: {
    type: 'Iterator Error',
    explanation: 'Attempted to get next item from empty iterator',
    category: 'runtime',
  },
  UnboundLocalError: {
    type: 'Variable Error',
    explanation: 'Variable referenced before assignment in local scope',
    category: 'runtime',
  },

  // JavaScript errors
  ReferenceError: {
    type: 'Reference Error',
    explanation: 'You used a variable that was never defined',
    category: 'runtime',
  },
  RangeError: {
    type: 'Range Error',
    explanation: 'A value is not in the expected range',
    category: 'runtime',
  },

  // Generic
  RuntimeError: {
    type: 'Runtime Error',
    explanation: 'An error occurred while running your code',
    category: 'runtime',
  },
  Exception: {
    type: 'Exception',
    explanation: 'An exception was raised during execution',
    category: 'runtime',
  },
  Error: {
    type: 'Error',
    explanation: 'An unexpected error occurred',
    category: 'runtime',
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
    isUserCodeError: true,
    friendlyType: 'Error',
    friendlyMessage: 'An error occurred',
    rawError: errorText,
  };

  const lines = errorText.split('\n');

  // 1. Extract error type and message from the last error line
  // Look for patterns like: "SyntaxError: invalid syntax" or "NameError: name 'x' is not defined"
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

  // 2. Handle SyntaxError with "... was never closed" style messages
  // Python 3.10+ shows more detailed syntax error messages
  if (result.type === 'SyntaxError' && !result.message) {
    // Look for messages like "'[' was never closed"
    for (let i = 0; i < lines.length; i++) {
      const syntaxMatch = lines[i].match(/^\s*(?:SyntaxError:\s*)?(.+(?:was never closed|unexpected EOF|invalid syntax).*)$/i);
      if (syntaxMatch) {
        result.message = syntaxMatch[1].trim();
        break;
      }
    }
  }

  // 3. Extract line number - find the LAST user-code relevant line reference
  // Skip internal frames
  let relevantLineNumber: number | undefined;
  let codeLineText: string | undefined;
  let pointerText: string | undefined;

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
        
        // The code line is typically the next line
        if (i + 1 < lines.length && lines[i + 1].trim()) {
          const nextLine = lines[i + 1];
          // Check if it's a code line (not an error message or another File line)
          if (!nextLine.match(/^(\w+Error|\w+Exception|File\s)/)) {
            codeLineText = nextLine.replace(/^\s{4}/, ''); // Remove leading 4 spaces
            
            // The pointer is typically after the code line
            if (i + 2 < lines.length) {
              const pointerLine = lines[i + 2];
              if (/^\s*\^+\s*$/.test(pointerLine)) {
                pointerText = pointerLine;
              }
            }
          }
        }
      }
    }
  }

  // 4. For SyntaxError, try to extract code snippet and pointer from standard format
  if (result.type.includes('Syntax') || result.type.includes('Indentation')) {
    // Python shows:
    //     code_line_here
    //         ^
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      // Skip empty lines and error type lines
      if (!trimmed || trimmed.match(/^(\w+Error|\w+Exception):/)) continue;
      
      // Look for pointer line
      if (/^\^+$/.test(trimmed) && i > 0) {
        // Previous line should be the code
        const codeLine = lines[i - 1];
        if (codeLine && !codeLine.match(/File\s/)) {
          codeLineText = codeLine.replace(/^\s+/, '');
          pointerText = lines[i];
        }
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

  // 6. Set code line and pointer
  if (codeLineText) {
    result.codeLine = codeLineText;
    result.codeSnippet = codeLineText; // backward compatibility
  }
  if (pointerText) {
    result.pointer = pointerText;
  }

  // 7. Get friendly error info
  const errorInfo = ERROR_EXPLANATIONS[result.type] || ERROR_EXPLANATIONS.Error;
  result.friendlyType = errorInfo.type;
  result.friendlyMessage = result.message || errorInfo.explanation;
  result.category = errorInfo.category;

  // 8. Special handling: if message is the same as default explanation, use the specific error message
  if (result.message && result.message !== errorInfo.explanation) {
    result.friendlyMessage = result.message;
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
    isUserCodeError: true,
    friendlyType: 'Error',
    friendlyMessage: 'An error occurred',
    rawError: errorText,
  };

  // Extract error type and message
  const errorTypeMatch = errorText.match(/^(\w+Error):\s*(.*)$/m);
  if (errorTypeMatch) {
    result.type = errorTypeMatch[1];
    result.message = errorTypeMatch[2].trim();
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

  // Get friendly error info
  const errorInfo = ERROR_EXPLANATIONS[result.type] || ERROR_EXPLANATIONS.Error;
  result.friendlyType = errorInfo.type;
  result.friendlyMessage = result.message || errorInfo.explanation;
  result.category = errorInfo.category;

  return result;
}

// ============================================================================
// Internal Error Detection
// ============================================================================

function isInternalError(errorText: string): boolean {
  const internalPatterns = [
    /execution timed out/i,
    /runner.*crash/i,
    /infrastructure.*fail/i,
    /internal.*error.*system/i,
    /piston.*error/i,
    /container.*error/i,
    /sandbox.*error/i,
    /SIGKILL/i,
    /out of memory.*system/i,
  ];
  
  return internalPatterns.some(pattern => pattern.test(errorText));
}

// ============================================================================
// Main Parser
// ============================================================================

/**
 * Parse error output from code execution and map to user's visible lines
 * Implements LeetCode-style error normalization
 */
export function parseCodeError(
  errorText: string,
  language: string,
  userCodeLineCount: number
): ParsedError {
  // Handle null/undefined
  if (!errorText || typeof errorText !== 'string') {
    return {
      type: 'Error',
      message: 'Unknown error',
      category: 'internal',
      isUserCodeError: false,
      friendlyType: 'Internal Error',
      friendlyMessage: 'This looks like a system issue on our side. Please try again.',
      rawError: errorText || '',
    };
  }

  // Check for internal/platform errors first
  if (isInternalError(errorText)) {
    return {
      type: 'InternalError',
      message: errorText,
      category: 'internal',
      isUserCodeError: false,
      friendlyType: 'Internal Error',
      friendlyMessage: 'This looks like a system issue on our side. Please try again.',
      rawError: errorText,
    };
  }

  const normalizedLang = language.toLowerCase();

  if (normalizedLang === 'python') {
    return parsePythonError(errorText, userCodeLineCount);
  }

  if (normalizedLang === 'javascript' || normalizedLang === 'typescript') {
    return parseJavaScriptError(errorText, userCodeLineCount);
  }

  // Generic fallback
  return {
    type: 'Error',
    message: errorText,
    category: 'runtime',
    isUserCodeError: true,
    friendlyType: 'Error',
    friendlyMessage: 'An error occurred during execution',
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
// Monaco Editor Decorations
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
