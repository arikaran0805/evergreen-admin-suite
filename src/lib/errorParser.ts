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

export interface ErrorLocation {
  /** Line number in user code (1-indexed) */
  userLine: number | null;
  /** Start column (1-indexed, for Monaco) */
  startColumn: number | null;
  /** End column (1-indexed, for Monaco) */
  endColumn: number | null;
  /** The actual line of code that failed */
  codeLine: string | null;
  /** Caret pointer string (e.g., "       ^") */
  pointer: string | null;
}

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
  /** Error location for Monaco highlighting */
  location: ErrorLocation;
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
  
  // C/C++ patterns
  result = result.replace(/\/piston\/[^\s:]+/gi, solutionFile);
  result = result.replace(/\/tmp\/[^\s:]+/gi, solutionFile);
  
  return result;
}

// ============================================================================
// Code Line and Caret Extraction (LeetCode-style)
// ============================================================================

/**
 * Extract exact error line, column, and caret pointer from error text.
 * Returns location info for Monaco Editor highlighting.
 */
export function extractCodeLineAndCaret(
  errorText: string,
  language: string
): ErrorLocation {
  const lang = language.toLowerCase();
  const lines = errorText.split('\n');
  
  const result: ErrorLocation = {
    userLine: null,
    startColumn: null,
    endColumn: null,
    codeLine: null,
    pointer: null,
  };
  
  // Get line offset for this language
  const lineOffset = USER_CODE_START_LINES[lang] || 0;
  
  if (lang === 'python') {
    return extractPythonLocation(lines, lineOffset);
  } else if (lang === 'javascript' || lang === 'typescript') {
    return extractJavaScriptLocation(lines, lineOffset);
  } else if (lang === 'java') {
    return extractJavaLocation(lines, lineOffset);
  } else if (lang === 'c' || lang === 'cpp' || lang === 'c++') {
    return extractCppLocation(lines, lineOffset);
  }
  
  return result;
}

/**
 * Python error location extraction.
 * Format: File "...", line N
 *           code_line
 *           ^
 */
function extractPythonLocation(lines: string[], lineOffset: number): ErrorLocation {
  const result: ErrorLocation = {
    userLine: null,
    startColumn: null,
    endColumn: null,
    codeLine: null,
    pointer: null,
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Match: File "...", line N
    const fileLineMatch = line.match(/File\s+"[^"]+",\s+line\s+(\d+)/i);
    if (fileLineMatch) {
      const rawLine = parseInt(fileLineMatch[1], 10);
      result.userLine = Math.max(1, rawLine - lineOffset);
      
      // Next line is usually the code line
      if (i + 1 < lines.length) {
        const codeLine = lines[i + 1];
        // Check it's not another File line or error line
        if (!codeLine.match(/^\s*File\s+"/i) && !codeLine.match(/^\w+Error:/)) {
          result.codeLine = codeLine.trimStart();
          
          // Look for caret on next line
          if (i + 2 < lines.length) {
            const pointerLine = lines[i + 2];
            // Caret line: only whitespace and ^
            if (pointerLine.match(/^\s*\^+\s*$/)) {
              result.pointer = pointerLine;
              // Calculate column from caret position
              const caretPos = pointerLine.indexOf('^');
              if (caretPos >= 0) {
                // Adjust for trimmed code line
                const originalIndent = codeLine.length - codeLine.trimStart().length;
                result.startColumn = Math.max(1, caretPos - originalIndent + 1);
                result.endColumn = result.startColumn;
              }
            }
          }
        }
      }
      
      // Found location, stop searching
      if (result.userLine !== null) break;
    }
  }
  
  // Fallback: highlight entire line if no column found
  if (result.userLine !== null && result.startColumn === null && result.codeLine) {
    result.startColumn = 1;
    result.endColumn = result.codeLine.length + 1;
  }
  
  return result;
}

/**
 * JavaScript/TypeScript error location extraction.
 * Format: at functionName (file:line:column) or file:line:column
 */
function extractJavaScriptLocation(lines: string[], lineOffset: number): ErrorLocation {
  const result: ErrorLocation = {
    userLine: null,
    startColumn: null,
    endColumn: null,
    codeLine: null,
    pointer: null,
  };
  
  for (const line of lines) {
    // Match: at ... (file:line:column) or at file:line:column
    const match = line.match(/:(\d+):(\d+)\)?$/);
    if (match) {
      const rawLine = parseInt(match[1], 10);
      const column = parseInt(match[2], 10);
      
      result.userLine = Math.max(1, rawLine - lineOffset);
      result.startColumn = column;
      result.endColumn = column;
      break;
    }
    
    // Match: at ... (file:line) - no column
    const lineOnlyMatch = line.match(/:(\d+)\)?$/);
    if (lineOnlyMatch && !result.userLine) {
      const rawLine = parseInt(lineOnlyMatch[1], 10);
      result.userLine = Math.max(1, rawLine - lineOffset);
      // No column - will highlight entire line
      break;
    }
  }
  
  return result;
}

/**
 * Java error location extraction.
 * Format: at Class.method(File.java:line) or compiler error with line:column
 */
function extractJavaLocation(lines: string[], lineOffset: number): ErrorLocation {
  const result: ErrorLocation = {
    userLine: null,
    startColumn: null,
    endColumn: null,
    codeLine: null,
    pointer: null,
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Runtime: at Class.method(File.java:line)
    const runtimeMatch = line.match(/\.java:(\d+)\)/);
    if (runtimeMatch) {
      const rawLine = parseInt(runtimeMatch[1], 10);
      result.userLine = Math.max(1, rawLine - lineOffset);
      break;
    }
    
    // Compiler: File.java:line: error: message
    const compilerMatch = line.match(/\.java:(\d+):\s*error:/i);
    if (compilerMatch) {
      const rawLine = parseInt(compilerMatch[1], 10);
      result.userLine = Math.max(1, rawLine - lineOffset);
      
      // Look for code line and caret
      if (i + 1 < lines.length && !lines[i + 1].includes('error:')) {
        result.codeLine = lines[i + 1].trim();
        
        if (i + 2 < lines.length && lines[i + 2].match(/^\s*\^/)) {
          result.pointer = lines[i + 2];
          const caretPos = lines[i + 2].indexOf('^');
          if (caretPos >= 0) {
            result.startColumn = caretPos + 1;
            result.endColumn = caretPos + 1;
          }
        }
      }
      break;
    }
  }
  
  return result;
}

/**
 * C/C++ error location extraction.
 * Format: file:line:column: error: message
 */
function extractCppLocation(lines: string[], lineOffset: number): ErrorLocation {
  const result: ErrorLocation = {
    userLine: null,
    startColumn: null,
    endColumn: null,
    codeLine: null,
    pointer: null,
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Match: file:line:column: error/warning
    const match = line.match(/[^:\s]+:(\d+):(\d+):\s*(?:error|warning)/i);
    if (match) {
      const rawLine = parseInt(match[1], 10);
      const column = parseInt(match[2], 10);
      
      result.userLine = Math.max(1, rawLine - lineOffset);
      result.startColumn = column;
      result.endColumn = column;
      
      // Look for code line and caret
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (!nextLine.match(/:\d+:\s*(?:error|warning)/)) {
          result.codeLine = nextLine.trim();
          
          if (i + 2 < lines.length && lines[i + 2].match(/^\s*\^/)) {
            result.pointer = lines[i + 2];
          }
        }
      }
      break;
    }
    
    // Fallback: file:line: error (no column)
    const lineOnlyMatch = line.match(/[^:\s]+:(\d+):\s*(?:error|warning)/i);
    if (lineOnlyMatch && !result.userLine) {
      const rawLine = parseInt(lineOnlyMatch[1], 10);
      result.userLine = Math.max(1, rawLine - lineOffset);
      break;
    }
  }
  
  return result;
}

// ============================================================================
// Internal Frame Detection & Stripping
// ============================================================================

function isInternalFrame(line: string, language: string): boolean {
  const lineLower = line.toLowerCase();
  
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
  
  const lang = language.toLowerCase();
  
  if (lang === 'python') {
    if (lineLower.includes('module __main__')) return true;
    if (lineLower.includes('in <module>') && lineLower.includes('piston')) return true;
  }
  
  if (lang === 'javascript' || lang === 'typescript') {
    if (lineLower.includes('at module._compile')) return true;
    if (lineLower.includes('at object.module._extensions')) return true;
    if (lineLower.includes('at module.load')) return true;
    if (lineLower.includes('at function.module._load')) return true;
    if (lineLower.includes('at require')) return true;
  }
  
  if (lang === 'java') {
    if (lineLower.includes('at java.')) return true;
    if (lineLower.includes('at sun.')) return true;
    if (lineLower.includes('at jdk.')) return true;
  }
  
  return false;
}

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

function parseStackLines(errorText: string, language: string): string[] {
  const lines = errorText.split('\n');
  const stackLines: string[] = [];
  const lang = language.toLowerCase();
  
  if (lang === 'python') {
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
          break;
        }
      }
    }
  } else if (lang === 'javascript' || lang === 'typescript') {
    for (const line of lines) {
      if (line.trim().startsWith('at ')) {
        stackLines.push(line.trim());
      }
    }
  } else if (lang === 'java') {
    for (const line of lines) {
      if (line.trim().startsWith('at ')) {
        stackLines.push(line.trim());
      }
    }
  } else {
    for (const line of lines) {
      if (line.match(/\.(c|cpp|h|hpp):\d+/) || line.includes('at 0x')) {
        stackLines.push(line.trim());
      }
    }
  }
  
  return stackLines;
}

function buildUserTraceback(errorText: string, language: string): [string[], string[]] {
  const stackLines = parseStackLines(errorText, language);
  const [userFrames, internalFrames] = stripInternalFrames(stackLines, language);
  const normalizedUserFrames = userFrames.map(frame => normalizeFileNames(frame, language));
  return [normalizedUserFrames, internalFrames];
}

// ============================================================================
// Input Contract Error Detection
// ============================================================================

function isInputContractError(errorText: string, language: string): boolean {
  const text = errorText.toLowerCase();
  const lang = language.toLowerCase();

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
        if (hasUserExecutionContext(errorText)) return false;
        return true;
      }
    }
  }

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

  if (lang === 'c' || lang === 'cpp' || lang === 'c++') {
    if (text.includes('segmentation fault') || text.includes('sigsegv')) {
      if (!hasUserStackFrames(errorText)) return true;
    }
  }

  return false;
}

function hasUserExecutionContext(errorText: string): boolean {
  const lineRefs = (errorText.match(/line \d+/gi) || []).length;
  if (lineRefs > 2) return true;
  if (/for .* in .*:/i.test(errorText)) return true;
  if (/while .*:/i.test(errorText)) return true;
  return false;
}

function hasUserStackFrames(errorText: string): boolean {
  const userFilePatterns = [
    /solution\.(py|java|cpp|c|js|ts)/i,
    /file ".*solution/i,
    /at solution\./i,
  ];
  return userFilePatterns.some(p => p.test(errorText));
}

// ============================================================================
// Syntax Error Detection
// ============================================================================

function detectSyntaxError(errorText: string, language: string): boolean {
  const text = errorText.toLowerCase();
  
  if (text.includes('syntaxerror')) return true;
  if (text.includes('indentationerror')) return true;
  if (text.includes('taberror')) return true;
  if (text.includes('unexpected token')) return true;
  if (text.includes('unexpected end of input')) return true;
  if (text.includes('unexpected identifier')) return true;
  if (text.includes('error: \';\' expected')) return true;
  if (text.includes('error: illegal start')) return true;
  if (text.includes('reached end of file while parsing')) return true;
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
  
  const pythonMatch = errorText.match(/^(\w+Error|\w+Exception):/m);
  if (pythonMatch) return pythonMatch[1];
  
  const jsMatch = errorText.match(/(TypeError|ReferenceError|RangeError|SyntaxError|Error):/);
  if (jsMatch) return jsMatch[1];
  
  const javaMatch = errorText.match(/Exception in thread.*?(\w+Exception)/);
  if (javaMatch) return javaMatch[1];
  
  if (lang === 'c' || lang === 'cpp' || lang === 'c++') {
    if (errorText.toLowerCase().includes('segmentation fault')) return 'Runtime Error';
    if (errorText.toLowerCase().includes('sigsegv')) return 'Runtime Error';
  }
  
  return 'Error';
}

function extractErrorMessage(errorText: string, errorType: string): string {
  const regex = new RegExp(`${errorType}:\\s*(.+?)(?:\\n|$)`, 'i');
  const match = errorText.match(regex);
  
  if (match && match[1]) {
    let msg = match[1].trim();
    msg = msg.replace(/File "[^"]+",?\s*/g, '');
    msg = msg.replace(/line \d+,?\s*/gi, '');
    return msg;
  }
  
  return '';
}

// ============================================================================
// Main Parser
// ============================================================================

export function parseCodeError(
  errorText: string,
  language: string,
  userCodeLineCount: number = 0
): ParsedError {
  const rawError = errorText || '';
  
  // Default empty location
  const emptyLocation: ErrorLocation = {
    userLine: null,
    startColumn: null,
    endColumn: null,
    codeLine: null,
    pointer: null,
  };
  
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
      location: emptyLocation,
    };
  }

  // Build traceback arrays
  const [userTraceback, internalTraceback] = buildUserTraceback(rawError, language);
  
  // Extract location info
  const location = extractCodeLineAndCaret(rawError, language);

  // =========================================================================
  // 1. Input Contract Errors
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
      internalTraceback,
      location: emptyLocation, // No location for system errors
    };
  }

  // =========================================================================
  // 2. Internal/System Errors
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
      internalTraceback,
      location: emptyLocation,
    };
  }

  // =========================================================================
  // 3. Syntax Errors
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
      userTraceback,
      internalTraceback,
      location: {
        ...location,
        codeLine: location.codeLine ? normalizeFileNames(location.codeLine, language) : null,
      },
    };
  }

  // =========================================================================
  // 4. Runtime Errors
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
    userTraceback,
    internalTraceback,
    location: {
      ...location,
      codeLine: location.codeLine ? normalizeFileNames(location.codeLine, language) : null,
    },
  };
}

function normalizeRuntimeMessage(errorText: string, errorType: string): string {
  const colonMatch = errorText.match(new RegExp(`${errorType}:\\s*(.+?)(?:\\n|$)`));
  if (colonMatch && colonMatch[1]) {
    const msg = colonMatch[1].trim();
    const cleaned = msg
      .replace(/\/[^\s]+/g, '')
      .replace(/File "[^"]+"/g, '')
      .replace(/line \d+/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned) return cleaned;
  }
  
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
// Helper Exports
// ============================================================================

export function isInputContractErrorResult(parsed: ParsedError): boolean {
  return parsed.category === 'internal' && 
         parsed.executionPhase === 'system' && 
         !parsed.isUserCodeError &&
         parsed.message === 'Invalid input format.';
}

export function hasInternalFrames(parsed: ParsedError): boolean {
  return parsed.internalTraceback.length > 0;
}

export function getInternalFramesForDisplay(parsed: ParsedError): string {
  if (parsed.internalTraceback.length === 0) return '';
  return parsed.internalTraceback.join('\n');
}

export function getUserTracebackForDisplay(parsed: ParsedError): string {
  if (parsed.userTraceback.length === 0) return '';
  return parsed.userTraceback.join('\n');
}

export function formatErrorOutput(parsed: ParsedError): string {
  const parts: string[] = [];
  
  // Error type and message
  if (parsed.message) {
    parts.push(`${parsed.type}: ${parsed.message}`);
  } else {
    parts.push(parsed.type);
  }
  
  // Add location info if available (LeetCode style)
  if (parsed.location.userLine !== null) {
    const solutionFile = 'Solution.py'; // Will be correct based on language
    parts.push('');
    parts.push(`  File "${solutionFile}", line ${parsed.location.userLine}`);
    
    if (parsed.location.codeLine) {
      parts.push(`    ${parsed.location.codeLine}`);
    }
    
    if (parsed.location.pointer) {
      parts.push(parsed.location.pointer);
    }
  }
  
  // Add user traceback if present and no inline location
  if (parsed.userTraceback.length > 0 && parsed.location.userLine === null) {
    parts.push('');
    parts.push(...parsed.userTraceback);
  }
  
  return parts.join('\n');
}

/**
 * Get Monaco-compatible decoration info for error highlighting.
 */
export function getMonacoDecorationInfo(parsed: ParsedError): {
  line: number | null;
  startColumn: number;
  endColumn: number;
  hasExactColumn: boolean;
} {
  const loc = parsed.location;
  
  if (loc.userLine === null) {
    return { line: null, startColumn: 1, endColumn: 1, hasExactColumn: false };
  }
  
  // If we have exact column info
  if (loc.startColumn !== null) {
    return {
      line: loc.userLine,
      startColumn: loc.startColumn,
      endColumn: loc.endColumn ?? loc.startColumn,
      hasExactColumn: true,
    };
  }
  
  // Fallback: highlight entire line
  return {
    line: loc.userLine,
    startColumn: 1,
    endColumn: loc.codeLine ? loc.codeLine.length + 1 : 1000,
    hasExactColumn: false,
  };
}

// ============================================================================
// Detection Helpers
// ============================================================================

export function isSyntaxError(parsed: ParsedError): boolean {
  return parsed.category === 'syntax';
}

export function isRuntimeError(parsed: ParsedError): boolean {
  return parsed.category === 'runtime';
}

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
