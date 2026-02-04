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
  /** User-relevant stack frames (cleaned, normalized) */
  userTraceback: string[];
  /** Internal/system frames (hidden by default) */
  internalTraceback: string[];
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
// File Name Normalization (LeetCode-style)
// ============================================================================

/**
 * Get the normalized filename for a language.
 */
function getSolutionFileName(language: string): string {
  const lang = language.toLowerCase();
  switch (lang) {
    case 'python':
    case 'python3':
      return 'Solution.py';
    case 'javascript':
    case 'js':
    case 'typescript':
    case 'ts':
      return 'Solution.js';
    case 'java':
      return 'Solution.java';
    case 'cpp':
    case 'c++':
      return 'solution.cpp';
    case 'c':
      return 'solution.c';
    default:
      return 'Solution.py';
  }
}

/**
 * Normalize all file references to LeetCode-style "Solution.ext".
 * Replaces internal paths, <string>, <anonymous>, etc.
 */
function normalizeFileNames(text: string, language: string): string {
  const solutionFile = getSolutionFileName(language);
  
  // Replace various file patterns with normalized name
  let result = text;
  
  // Python patterns
  result = result.replace(/File "<string>"/gi, `File "${solutionFile}"`);
  result = result.replace(/File "<stdin>"/gi, `File "${solutionFile}"`);
  result = result.replace(/File "<module>"/gi, `File "${solutionFile}"`);
  result = result.replace(/File "\/piston\/[^"]+"/gi, `File "${solutionFile}"`);
  result = result.replace(/File "\/tmp\/[^"]+"/gi, `File "${solutionFile}"`);
  result = result.replace(/File "\/home\/[^"]+"/gi, `File "${solutionFile}"`);
  result = result.replace(/File "run\.py"/gi, `File "${solutionFile}"`);
  result = result.replace(/File "code\.py"/gi, `File "${solutionFile}"`);
  
  // JavaScript patterns
  result = result.replace(/at <anonymous>/gi, `at ${solutionFile}`);
  result = result.replace(/at Object\.<anonymous>/gi, `at ${solutionFile}`);
  result = result.replace(/\(\/piston\/[^)]+\)/gi, `(${solutionFile})`);
  result = result.replace(/\(\/tmp\/[^)]+\)/gi, `(${solutionFile})`);
  result = result.replace(/at .*\/piston\/[^\s]+/gi, `at ${solutionFile}`);
  result = result.replace(/at evalmachine\.<anonymous>/gi, `at ${solutionFile}`);
  
  // Java patterns
  result = result.replace(/at Main\./gi, `at ${solutionFile.replace('.java', '')}\.`);
  result = result.replace(/at Solution\./gi, `at Solution\.`);
  
  // C/C++ patterns - strip absolute paths
  result = result.replace(/\/piston\/[^\s:]+/gi, solutionFile);
  result = result.replace(/\/tmp\/[^\s:]+/gi, solutionFile);
  
  return result;
}

// ============================================================================
// Internal Frame Detection & Stripping
// ============================================================================

/**
 * Check if a stack frame line is internal (should be hidden).
 */
function isInternalFrame(line: string, language: string): boolean {
  const lineLower = line.toLowerCase();
  
  // Universal internal patterns
  const internalPatterns = [
    '/piston/',
    '/tmp/runner',
    'supabase/functions',
    '<frozen importlib',
    '<frozen runpy',
    'node:internal',
    'node:vm',
    'internal/modules',
    'timers.js',
    'bootstrap_node.js',
    'run_tests',
    'runTests',
    '_run_code',
    '_run_module',
    '__bootstrap__',
    'importlib._bootstrap',
    'exec(compile',
    'evalmachine',
    '_convert_json',
    '_compare_outputs',
  ];
  
  for (const pattern of internalPatterns) {
    if (lineLower.includes(pattern.toLowerCase())) {
      return true;
    }
  }
  
  // Language-specific internal frames
  const lang = language.toLowerCase();
  
  if (lang === 'python') {
    // Python internal modules
    if (lineLower.includes('module __main__')) return true;
    if (lineLower.includes('in <module>') && lineLower.includes('piston')) return true;
  }
  
  if (lang === 'javascript' || lang === 'typescript') {
    // Node.js internals
    if (lineLower.includes('at module._compile')) return true;
    if (lineLower.includes('at object.module._extensions')) return true;
    if (lineLower.includes('at module.load')) return true;
    if (lineLower.includes('at function.module._load')) return true;
    if (lineLower.includes('at require')) return true;
  }
  
  if (lang === 'java') {
    // Java system classes
    if (lineLower.includes('at java.')) return true;
    if (lineLower.includes('at sun.')) return true;
    if (lineLower.includes('at jdk.')) return true;
  }
  
  return false;
}

/**
 * Strip internal frames from stack trace, keeping only user-relevant lines.
 * Returns [userFrames, internalFrames].
 */
function stripInternalFrames(lines: string[], language: string): [string[], string[]] {
  const userFrames: string[] = [];
  const internalFrames: string[] = [];
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    if (isInternalFrame(line, language)) {
      internalFrames.push(line);
    } else {
      userFrames.push(line);
    }
  }
  
  return [userFrames, internalFrames];
}

/**
 * Parse traceback/stack trace into individual frames.
 */
function parseStackLines(errorText: string, language: string): string[] {
  const lines = errorText.split('\n');
  const stackLines: string[] = [];
  const lang = language.toLowerCase();
  
  if (lang === 'python') {
    // Python: "  File "..." or "    ..." continuation
    let inTraceback = false;
    for (const line of lines) {
      if (line.includes('Traceback (most recent call last)')) {
        inTraceback = true;
        continue;
      }
      if (inTraceback) {
        if (line.startsWith('  File ') || line.startsWith('    ')) {
          stackLines.push(line.trim());
        } else if (line.match(/^\w+Error:|^\w+Exception:/)) {
          // Error line itself - stop
          break;
        }
      }
    }
  } else if (lang === 'javascript' || lang === 'typescript') {
    // JavaScript: "    at ..." lines
    for (const line of lines) {
      if (line.trim().startsWith('at ')) {
        stackLines.push(line.trim());
      }
    }
  } else if (lang === 'java') {
    // Java: "	at ..." lines
    for (const line of lines) {
      if (line.trim().startsWith('at ')) {
        stackLines.push(line.trim());
      }
    }
  } else {
    // C/C++: various formats, look for file:line patterns
    for (const line of lines) {
      if (line.match(/\.(c|cpp|h|hpp):\d+/) || line.includes('at 0x')) {
        stackLines.push(line.trim());
      }
    }
  }
  
  return stackLines;
}

/**
 * Build clean user traceback from raw error.
 */
function buildUserTraceback(errorText: string, language: string): [string[], string[]] {
  // Parse stack lines
  const stackLines = parseStackLines(errorText, language);
  
  // Strip internal frames
  const [userFrames, internalFrames] = stripInternalFrames(stackLines, language);
  
  // Normalize file names in user frames
  const normalizedUserFrames = userFrames.map(frame => normalizeFileNames(frame, language));
  
  return [normalizedUserFrames, internalFrames];
}

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

/**
 * Extract the error message line (after error type).
 */
function extractErrorMessage(errorText: string, errorType: string): string {
  // Look for "ErrorType: message" pattern
  const regex = new RegExp(`${errorType}:\\s*(.+?)(?:\\n|$)`, 'i');
  const match = errorText.match(regex);
  
  if (match && match[1]) {
    let msg = match[1].trim();
    // Clean up any remaining path fragments
    msg = msg.replace(/File "[^"]+",?\s*/g, '');
    msg = msg.replace(/line \d+,?\s*/gi, '');
    return msg;
  }
  
  return '';
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
      userTraceback: [],
      internalTraceback: [],
    };
  }

  // Build traceback arrays
  const [userTraceback, internalTraceback] = buildUserTraceback(rawError, language);

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
      userTraceback: [],
      internalTraceback: internalTraceback,
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
      userTraceback: [],
      internalTraceback: internalTraceback,
    };
  }

  // =========================================================================
  // 3. Check for Syntax Errors
  // =========================================================================
  if (detectSyntaxError(rawError, language)) {
    const errorType = extractErrorType(rawError, language) || 'SyntaxError';
    const errorMessage = extractErrorMessage(rawError, errorType) || 'Invalid syntax.';
    
    return {
      type: errorType,
      message: normalizeFileNames(errorMessage, language),
      category: 'syntax',
      executionPhase: 'parse',
      isUserCodeError: true,
      rawError,
      userTraceback: userTraceback,
      internalTraceback: internalTraceback,
    };
  }

  // =========================================================================
  // 4. Runtime Errors (User Logic Errors)
  // =========================================================================
  const errorType = extractErrorType(rawError, language);
  const rawMessage = extractErrorMessage(rawError, errorType);
  const normalizedMessage = rawMessage 
    ? normalizeFileNames(rawMessage, language)
    : normalizeRuntimeMessage(rawError, errorType);
  
  return {
    type: errorType,
    message: normalizedMessage,
    category: 'runtime',
    executionPhase: 'execution',
    isUserCodeError: true,
    rawError,
    userTraceback: userTraceback,
    internalTraceback: internalTraceback,
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
 * Check if there are internal frames available for "View More".
 */
export function hasInternalFrames(parsed: ParsedError): boolean {
  return parsed.internalTraceback.length > 0;
}

/**
 * Get internal frames formatted for display.
 */
export function getInternalFramesForDisplay(parsed: ParsedError): string {
  if (parsed.internalTraceback.length === 0) return '';
  return parsed.internalTraceback.join('\n');
}

/**
 * Get user traceback formatted for display.
 */
export function getUserTracebackForDisplay(parsed: ParsedError): string {
  if (parsed.userTraceback.length === 0) return '';
  return parsed.userTraceback.join('\n');
}

/**
 * Format full error output (type + message + user traceback).
 */
export function formatErrorOutput(parsed: ParsedError): string {
  const parts: string[] = [];
  
  // Error type and message on first line (LeetCode style)
  if (parsed.message) {
    parts.push(`${parsed.type}: ${parsed.message}`);
  } else {
    parts.push(parsed.type);
  }
  
  // Add user traceback if present
  if (parsed.userTraceback.length > 0) {
    parts.push('');
    parts.push(...parsed.userTraceback);
  }
  
  return parts.join('\n');
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
