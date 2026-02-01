/**
 * Error Parser Utility
 * Maps runtime/syntax errors from wrapped code to user's visible editor lines
 */

// Line offsets for different languages (where user code starts in wrapped template)
export const USER_CODE_START_LINES: Record<string, number> = {
  python: 5,      // After: import json, sys, time, traceback + blank + comment
  javascript: 3,  // After: comment line
  typescript: 3,  // Same as JavaScript
  java: 10,       // Approximate, depends on boilerplate
  cpp: 15,        // Approximate, depends on includes
};

export interface ParsedError {
  type: string;
  message: string;
  originalLine?: number;
  userLine?: number;
  isUserCodeError: boolean;
  friendlyMessage: string;
  friendlyType: string;
  rawError: string;
  codeSnippet?: string;
}

// Common error explanations for beginners
const ERROR_EXPLANATIONS: Record<string, { type: string; explanation: string }> = {
  // Python errors
  SyntaxError: {
    type: 'Syntax Error',
    explanation: 'There is a typo or invalid syntax in your code',
  },
  IndentationError: {
    type: 'Indentation Error',
    explanation: 'Check your spacing - Python requires consistent indentation',
  },
  NameError: {
    type: 'Name Error',
    explanation: 'You used a variable or function that was never defined',
  },
  TypeError: {
    type: 'Type Error',
    explanation: 'Operation applied to incompatible types',
  },
  ValueError: {
    type: 'Value Error',
    explanation: 'The value is invalid for this operation',
  },
  IndexError: {
    type: 'Index Error',
    explanation: 'You tried to access an index that doesn\'t exist',
  },
  KeyError: {
    type: 'Key Error',
    explanation: 'The key doesn\'t exist in the dictionary',
  },
  AttributeError: {
    type: 'Attribute Error',
    explanation: 'The object doesn\'t have this attribute or method',
  },
  ZeroDivisionError: {
    type: 'Division Error',
    explanation: 'You tried to divide by zero',
  },
  RecursionError: {
    type: 'Recursion Error',
    explanation: 'Too many recursive calls - check your base case',
  },
  MemoryError: {
    type: 'Memory Error',
    explanation: 'Your code ran out of memory',
  },
  // JavaScript errors
  ReferenceError: {
    type: 'Reference Error',
    explanation: 'You used a variable that was never defined',
  },
  RangeError: {
    type: 'Range Error',
    explanation: 'A value is not in the expected range',
  },
  // Generic
  RuntimeError: {
    type: 'Runtime Error',
    explanation: 'An error occurred while running your code',
  },
  Error: {
    type: 'Error',
    explanation: 'An unexpected error occurred',
  },
};

// Parse Python error with line mapping
function parsePythonError(
  errorText: string,
  userCodeLineCount: number
): ParsedError {
  const result: ParsedError = {
    type: 'Error',
    message: errorText,
    isUserCodeError: true,
    friendlyMessage: errorText,
    friendlyType: 'Error',
    rawError: errorText,
  };

  // Extract error type and message
  // Format: "ErrorType: message"
  const errorTypeMatch = errorText.match(/^(\w+Error|\w+Exception):\s*(.*)$/m);
  if (errorTypeMatch) {
    result.type = errorTypeMatch[1];
    result.message = errorTypeMatch[2];
  }

  // Look for line number in Python traceback
  // Format: File "...", line X
  // or: File "<string>", line X
  const lineMatches = [...errorText.matchAll(/(?:File\s*"[^"]*",\s*line\s*|line\s*)(\d+)/gi)];
  
  if (lineMatches.length > 0) {
    // Get the last line reference (usually the most relevant)
    const lastMatch = lineMatches[lineMatches.length - 1];
    const originalLine = parseInt(lastMatch[1], 10);
    result.originalLine = originalLine;
    
    // Map to user's code line
    const userCodeStartLine = USER_CODE_START_LINES.python;
    const mappedLine = originalLine - userCodeStartLine + 1;
    
    if (mappedLine >= 1 && mappedLine <= userCodeLineCount) {
      result.userLine = mappedLine;
      result.isUserCodeError = true;
    } else if (mappedLine < 1) {
      // Error in boilerplate before user code
      result.isUserCodeError = false;
    } else {
      // Error in harness code after user code
      result.isUserCodeError = false;
    }
  }

  // Extract code snippet from SyntaxError output
  // Python shows: "    return count" then "    ^" or "    ^^^"
  const snippetMatch = errorText.match(/^\s{4}(.+)\n\s+\^+/m);
  if (snippetMatch) {
    result.codeSnippet = snippetMatch[1].trim();
  }

  // Get friendly error info
  const errorInfo = ERROR_EXPLANATIONS[result.type] || ERROR_EXPLANATIONS.Error;
  result.friendlyType = errorInfo.type;
  result.friendlyMessage = errorInfo.explanation;

  return result;
}

// Parse JavaScript/TypeScript error with line mapping
function parseJavaScriptError(
  errorText: string,
  userCodeLineCount: number
): ParsedError {
  const result: ParsedError = {
    type: 'Error',
    message: errorText,
    isUserCodeError: true,
    friendlyMessage: errorText,
    friendlyType: 'Error',
    rawError: errorText,
  };

  // Extract error type and message
  const errorTypeMatch = errorText.match(/^(\w+Error):\s*(.*)$/m);
  if (errorTypeMatch) {
    result.type = errorTypeMatch[1];
    result.message = errorTypeMatch[2];
  }

  // Look for line number in JS stack trace
  // Format: at functionName (file:line:column)
  // or: at file:line:column
  // or: <anonymous>:line:column
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
  result.friendlyMessage = errorInfo.explanation;

  return result;
}

/**
 * Parse error output from code execution and map to user's visible lines
 */
export function parseCodeError(
  errorText: string,
  language: string,
  userCodeLineCount: number
): ParsedError {
  if (!errorText || typeof errorText !== 'string') {
    return {
      type: 'Error',
      message: 'Unknown error',
      isUserCodeError: false,
      friendlyMessage: 'An unexpected error occurred',
      friendlyType: 'Error',
      rawError: errorText || '',
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
    isUserCodeError: true,
    friendlyMessage: 'An error occurred during execution',
    friendlyType: 'Error',
    rawError: errorText,
  };
}

/**
 * Format error for display
 */
export function formatErrorForDisplay(parsed: ParsedError): string {
  if (!parsed.isUserCodeError) {
    return `⚙️ Internal execution error (not your fault)\n${parsed.message}`;
  }

  let formatted = `❌ ${parsed.friendlyType}`;
  
  if (parsed.userLine) {
    formatted += ` at line ${parsed.userLine}`;
  }
  
  formatted += `\n${parsed.friendlyMessage}`;
  
  if (parsed.codeSnippet) {
    formatted += `\n\n→ ${parsed.codeSnippet}`;
  }
  
  if (parsed.message && parsed.message !== parsed.friendlyMessage) {
    formatted += `\n\nDetails: ${parsed.message}`;
  }

  return formatted;
}

/**
 * Get Monaco editor decorations for error line highlighting
 */
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
