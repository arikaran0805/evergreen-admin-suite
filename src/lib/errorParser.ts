/**
 * UnlockMemory Universal Error Parser - "Student-First" Engine
 * Transforms scary raw system traces into clean, structured error cards
 * that prioritize the learner's code over system internals.
 * 
 * FEATURES:
 * 1. Path-Blind Privacy: Strips all server paths and replaces with generic names
 * 2. Smart Multi-Language Mapping: Detects user frames across Python/Java/C++/JS
 * 3. Internal Frame Segregation: Separates system traces for "View More" toggle
 * 4. Coach Persona: Supportive, peer-to-peer error explanations
 * 5. Visual Precision: Extracts code snippets and caret pointers
 */

// Line offsets for different languages (where user code starts in wrapped template)
export const USER_CODE_START_LINES: Record<string, number> = {
  python: 5,
  javascript: 3,
  typescript: 3,
  java: 10,
  cpp: 15,
  c: 12,
};

// User solution file names per language
const USER_FILE_NAMES: Record<string, string[]> = {
  python: ['Solution.py', 'solution.py', '<your_code>'],
  javascript: ['Solution.js', 'solution.js', '<anonymous>'],
  typescript: ['Solution.ts', 'solution.ts', '<anonymous>'],
  java: ['Solution.java', 'solution.java'],
  cpp: ['solution.cpp', 'Solution.cpp'],
  c: ['solution.c', 'Solution.c'],
};

// ============================================================================
// Types
// ============================================================================

export type ErrorCategory = 'syntax' | 'runtime' | 'internal' | 'input_contract';
export type ExecutionPhase = 'parse' | 'execution' | 'system';
export type ErrorType = string | 'InputContractError';

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
  /** Supportive coaching hint */
  coachHint?: string;
  /** Guidance on what kind of fix is required */
  fixHint?: string;
  /** The actual code line that caused the error */
  codeLine?: string;
  /** Caret pointer position (e.g., "       ^") */
  pointer?: string;
  /** Internal/system stack frames (for "View More" toggle) */
  internalTraceback: string[];
  /** User-relevant stack frames only */
  userTraceback: string[];
  /** Cleaned error output for display (paths stripped) */
  cleanedOutput: string;
  /** Full raw stderr for technical details */
  rawError: string;
  /** Legacy: code snippet (for backward compatibility) */
  codeSnippet?: string;
}

// ============================================================================
// Coach-Persona Error Explanations (Supportive, peer-to-peer tone)
// ============================================================================

interface ErrorInfo {
  friendlyType: string;
  explanation: string;
  coachHint: string;
  fixHint: string;
  category: ErrorCategory;
  phase: ExecutionPhase;
}

const ERROR_EXPLANATIONS: Record<string, ErrorInfo> = {
  // =========================================================================
  // Syntax Errors (parse/compile-time)
  // =========================================================================
  SyntaxError: {
    friendlyType: 'Syntax Error',
    explanation: "Hmm, Python couldn't understand your code. There might be a small typo somewhere!",
    coachHint: "💡 Look for missing brackets, colons, or quotes near the highlighted line. These are easy fixes once you spot them!",
    fixHint: 'Check for missing brackets, colons, or quotes near the indicated line.',
    category: 'syntax',
    phase: 'parse',
  },
  IndentationError: {
    friendlyType: 'Syntax Error',
    explanation: "Python is picky about spacing! Your indentation seems a bit off.",
    coachHint: "💡 In Python, consistent spacing is key. Make sure all code in the same block uses the same number of spaces.",
    fixHint: 'Make sure all code blocks use the same number of spaces.',
    category: 'syntax',
    phase: 'parse',
  },
  TabError: {
    friendlyType: 'Syntax Error',
    explanation: "You're mixing tabs and spaces—Python gets confused by that!",
    coachHint: "💡 Stick to one or the other. Most editors let you convert tabs to spaces automatically.",
    fixHint: 'Use only spaces (recommended) or only tabs, not both.',
    category: 'syntax',
    phase: 'parse',
  },

  // =========================================================================
  // Runtime Errors (crashes during execution)
  // =========================================================================
  NameError: {
    friendlyType: 'Runtime Error',
    explanation: "Oops! You're trying to use something that doesn't exist yet.",
    coachHint: "💡 Check the spelling of your variable names. Did you define it before using it?",
    fixHint: 'Check spelling and make sure the variable is defined before use.',
    category: 'runtime',
    phase: 'execution',
  },
  TypeError: {
    friendlyType: 'Runtime Error',
    explanation: "You're trying to do something with the wrong type of data.",
    coachHint: "💡 For example, you can't add a number to a string directly. Check what types your variables are!",
    fixHint: 'Check the types of your variables and convert if needed.',
    category: 'runtime',
    phase: 'execution',
  },
  ValueError: {
    friendlyType: 'Runtime Error',
    explanation: "The value you're using doesn't quite fit what's expected.",
    coachHint: "💡 Double-check the input values. Maybe a conversion is needed?",
    fixHint: 'Check the input values being passed to the function.',
    category: 'runtime',
    phase: 'execution',
  },
  IndexError: {
    friendlyType: 'Runtime Error',
    explanation: "It looks like you're reaching for an item that isn't there!",
    coachHint: "💡 Double-check your loop boundaries—remember that lists start at index 0, so the last item is at length-1.",
    fixHint: 'Check array/list bounds and ensure index is within range.',
    category: 'runtime',
    phase: 'execution',
  },
  KeyError: {
    friendlyType: 'Runtime Error',
    explanation: "That key doesn't exist in your dictionary.",
    coachHint: "💡 Try using .get() instead, or check if the key exists first with 'if key in dict:'",
    fixHint: 'Check if the key exists before accessing, or use .get() method.',
    category: 'runtime',
    phase: 'execution',
  },
  AttributeError: {
    friendlyType: 'Runtime Error',
    explanation: "You're calling a method or property that this object doesn't have.",
    coachHint: "💡 Make sure you're using the right method name. You can use dir(object) to see what's available!",
    fixHint: 'Check the object type and available methods.',
    category: 'runtime',
    phase: 'execution',
  },
  ZeroDivisionError: {
    friendlyType: 'Runtime Error',
    explanation: "Whoops! You tried to divide by zero—that's mathematically undefined.",
    coachHint: "💡 Add a quick check: if divisor != 0: before dividing. Edge cases matter!",
    fixHint: 'Add a check to ensure the divisor is not zero.',
    category: 'runtime',
    phase: 'execution',
  },
  RecursionError: {
    friendlyType: 'Runtime Error',
    explanation: "Your function is calling itself too many times without stopping!",
    coachHint: "💡 Every recursive function needs a base case—a condition where it stops calling itself.",
    fixHint: 'Ensure your recursion has a proper base case that terminates.',
    category: 'runtime',
    phase: 'execution',
  },
  MemoryError: {
    friendlyType: 'Runtime Error',
    explanation: "Your solution ran out of memory—it might be storing too much data.",
    coachHint: "💡 Think about optimizing: can you use less space? Sometimes a different approach is more efficient.",
    fixHint: 'Look for ways to reduce memory usage or use a more efficient algorithm.',
    category: 'runtime',
    phase: 'execution',
  },
  StopIteration: {
    friendlyType: 'Runtime Error',
    explanation: "You tried to get the next item from an empty iterator.",
    coachHint: "💡 Before calling next(), make sure there are still items left to iterate over.",
    fixHint: 'Check if the iterator has items before calling next().',
    category: 'runtime',
    phase: 'execution',
  },
  UnboundLocalError: {
    friendlyType: 'Runtime Error',
    explanation: "You're using a variable before it has a value in this scope.",
    coachHint: "💡 Either initialize it first, or if it's from outside the function, use the 'global' keyword.",
    fixHint: 'Initialize the variable before using it, or use "global" keyword.',
    category: 'runtime',
    phase: 'execution',
  },
  RuntimeError: {
    friendlyType: 'Runtime Error',
    explanation: "Something unexpected happened while running your code.",
    coachHint: "💡 Check the specific error message below for clues about what went wrong.",
    fixHint: 'Review the error message for specific guidance.',
    category: 'runtime',
    phase: 'execution',
  },
  Exception: {
    friendlyType: 'Runtime Error',
    explanation: "An exception was raised during execution.",
    coachHint: "💡 The error message should tell you exactly what happened. Let's fix it!",
    fixHint: 'Check the error message for details on what went wrong.',
    category: 'runtime',
    phase: 'execution',
  },
  AssertionError: {
    friendlyType: 'Runtime Error',
    explanation: "An assertion in your code failed.",
    coachHint: "💡 Check your assert statements—the condition evaluated to False.",
    fixHint: 'Verify the condition in your assert statement.',
    category: 'runtime',
    phase: 'execution',
  },
  OverflowError: {
    friendlyType: 'Runtime Error',
    explanation: "A number got too big for Python to handle!",
    coachHint: "💡 This is rare in Python, but can happen with certain math operations. Try a different approach.",
    fixHint: 'Use a different data type or algorithm to handle large numbers.',
    category: 'runtime',
    phase: 'execution',
  },
  ImportError: {
    friendlyType: 'Runtime Error',
    explanation: "Python couldn't import the module you requested.",
    coachHint: "💡 Double-check the module name. Is it installed? Is the spelling correct?",
    fixHint: 'Check the module name and ensure it is available.',
    category: 'runtime',
    phase: 'execution',
  },
  ModuleNotFoundError: {
    friendlyType: 'Runtime Error',
    explanation: "The module you're trying to import doesn't exist.",
    coachHint: "💡 Check the spelling, or use only the standard library modules available in this environment.",
    fixHint: 'Use only available standard library modules.',
    category: 'runtime',
    phase: 'execution',
  },

  // JavaScript errors
  ReferenceError: {
    friendlyType: 'Runtime Error',
    explanation: "You're using a variable that was never declared.",
    coachHint: "💡 Did you forget to declare it with let, const, or var? Check the spelling too!",
    fixHint: 'Check spelling and make sure the variable is declared.',
    category: 'runtime',
    phase: 'execution',
  },
  RangeError: {
    friendlyType: 'Runtime Error',
    explanation: "A value is outside the acceptable range.",
    coachHint: "💡 This often happens with array sizes or recursive calls. Check your numbers!",
    fixHint: 'Check array sizes and numeric values.',
    category: 'runtime',
    phase: 'execution',
  },

  // Java/C++ errors
  NullPointerException: {
    friendlyType: 'Runtime Error',
    explanation: "You tried to use something that's null (doesn't exist).",
    coachHint: "💡 Before using an object, make sure it's been initialized. Add a null check!",
    fixHint: 'Check for null before accessing object members.',
    category: 'runtime',
    phase: 'execution',
  },
  ArrayIndexOutOfBoundsException: {
    friendlyType: 'Runtime Error',
    explanation: "You're accessing an array index that doesn't exist.",
    coachHint: "💡 Arrays are 0-indexed, so an array of size n has indices 0 to n-1.",
    fixHint: 'Ensure array index is within bounds.',
    category: 'runtime',
    phase: 'execution',
  },

  // Generic fallback
  Error: {
    friendlyType: 'Runtime Error',
    explanation: "An unexpected error occurred in your code.",
    coachHint: "💡 Check the error message for clues. You've got this!",
    fixHint: 'Review the error message for specific guidance.',
    category: 'runtime',
    phase: 'execution',
  },
};

// ============================================================================
// Path-Blind Privacy Rule - Language-Agnostic Path Stripping
// ============================================================================

const SERVER_PATH_PATTERNS = [
  /\/piston\/jobs\/[a-zA-Z0-9\-_\/]+/g,
  /\/usr\/lib\/[a-zA-Z0-9\-_\/\.]+/g,
  /\/usr\/local\/[a-zA-Z0-9\-_\/\.]+/g,
  /\/home\/[a-zA-Z0-9\-_\/\.]+/g,
  /\/tmp\/[a-zA-Z0-9\-_\/\.]+/g,
  /\/var\/[a-zA-Z0-9\-_\/\.]+/g,
  /node:internal\/[a-zA-Z0-9\-_\/]+/g,
  /C:\\[a-zA-Z0-9\-_\\\.]+/g,
  /<frozen\s+[^>]+>/g,
];

function stripServerPaths(text: string, language: string): string {
  let result = text;
  
  // Replace all server paths with generic name
  for (const pattern of SERVER_PATH_PATTERNS) {
    result = result.replace(pattern, '<system>');
  }
  
  // Replace file references based on language
  const langLower = language.toLowerCase();
  const userFileName = langLower === 'python' ? 'Solution.py' 
    : langLower === 'java' ? 'Solution.java'
    : langLower === 'cpp' || langLower === 'c++' ? 'solution.cpp'
    : langLower === 'c' ? 'solution.c'
    : langLower === 'javascript' || langLower === 'typescript' ? 'Solution.js'
    : '<your_code>';
  
  // Normalize various file references to user-friendly name
  result = result
    .replace(/File "\/piston\/jobs\/[^"]+"/g, `File "${userFileName}"`)
    .replace(/File "<string>"/g, `File "${userFileName}"`)
    .replace(/File "<module>"/g, `File "${userFileName}"`)
    .replace(/<anonymous>/g, userFileName);
  
  return result;
}

// ============================================================================
// Internal Frame Detection Patterns
// ============================================================================

const INTERNAL_FRAME_PATTERNS = [
  /importlib/i,
  /_bootstrap/i,
  /_driver\.py/i,
  /site-packages/i,
  /<frozen/i,
  /runpy\.py/i,
  /__pycache__/i,
  /node:internal/i,
  /node_modules/i,
  /\.m2\/repository/i,  // Java maven
  /jdk.*internal/i,
  /java\.base\//i,
  /reflect\.Method/i,
  /libstdc\+\+/i,  // C++ stdlib
  /libc\+\+/i,
  /__libc_start/i,
];

function isInternalFrame(line: string): boolean {
  return INTERNAL_FRAME_PATTERNS.some(pattern => pattern.test(line));
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
// Input Contract Error Detection (LeetCode-style)
// ============================================================================

/**
 * Patterns that indicate the platform passed malformed or mismatched input
 * to an otherwise correct user solution. These are NOT the learner's fault.
 * 
 * Examples:
 * - Python: "not all arguments converted during string formatting"
 * - JavaScript: "num % 2 is not a function"
 * 
 * This happens when the platform passes string instead of array, wrong type, etc.
 */
const INPUT_CONTRACT_ERROR_PATTERNS: Record<string, RegExp[]> = {
  python: [
    // String formatting errors when platform passes wrong type
    /not all arguments converted during string formatting/i,
    /unsupported operand type\(s\)/i,
    /% not supported between instances of/i,
    /can't multiply sequence by non-int of type/i,
    // Iteration errors when platform passes non-iterable
    /object is not iterable/i,
    /is not iterable/i,
    // Type mismatch on function entry
    /argument .* must be .*, not/i,
    /expected .* instance, .* found/i,
    // Subscription errors
    /object is not subscriptable/i,
    /is not subscriptable/i,
    // Callable errors when input is not what was expected
    /object is not callable/i,
    /is not callable/i,
    // Unpacking errors from wrong input shape
    /not enough values to unpack/i,
    /too many values to unpack/i,
    /cannot unpack non-iterable/i,
  ],
  javascript: [
    // Iteration/callable errors
    /is not iterable/i,
    /is not a function/i,
    /is not an object/i,
    // Property access on wrong type
    /Cannot read properties? of (undefined|null)/i,
    /Cannot read property .* of (undefined|null)/i,
    // Type coercion failures
    /Cannot convert .* to .*/i,
    // Spread/rest errors
    /Invalid attempt to spread non-iterable/i,
    /Invalid attempt to destructure non-iterable/i,
  ],
  typescript: [
    // Same as JavaScript
    /is not iterable/i,
    /is not a function/i,
    /is not an object/i,
    /Cannot read properties? of (undefined|null)/i,
    /Cannot read property .* of (undefined|null)/i,
    /Cannot convert .* to .*/i,
    /Invalid attempt to spread non-iterable/i,
    /Invalid attempt to destructure non-iterable/i,
  ],
  java: [
    // Class cast errors from wrong input type
    /ClassCastException/i,
    /cannot be cast to/i,
    // Array type mismatch
    /ArrayStoreException/i,
    // Incompatible argument types
    /incompatible types:/i,
    /cannot be converted to/i,
    // Method invocation on wrong type
    /cannot find symbol.*method/i,
  ],
  cpp: [
    // Type mismatch crashes
    /no matching function for call/i,
    /cannot convert/i,
    /invalid conversion from/i,
    // Immediate segfault from bad input (heuristic)
    /segmentation fault/i,
    /bus error/i,
    // Bad alloc from unexpected input size
    /bad_alloc/i,
    /terminate called/i,
  ],
  c: [
    /segmentation fault/i,
    /bus error/i,
    /incompatible pointer type/i,
    /incompatible integer to pointer conversion/i,
  ],
};

/**
 * Additional context patterns that strengthen the input contract error diagnosis
 * These help distinguish platform input errors from genuine user logic bugs
 */
const INPUT_CONTRACT_CONTEXT_PATTERNS = [
  // Error occurs at function entry or very early
  /line 1[:\s]/i,
  /at line 1\b/i,
  // Error in argument processing
  /argument\s*\d*/i,
  /parameter/i,
  // Error mentions the solution function
  /in (solve|solution|run|main|twoSum|addTwoNumbers)/i,
];

/**
 * Patterns that indicate this is a genuine user error, NOT an input contract error
 * Used to avoid false positives
 */
const USER_ERROR_INDICATORS = [
  // User defined variables/functions
  /undefined variable/i,
  /is not defined/i,
  // User logic errors
  /division by zero/i,
  /index out of (range|bounds)/i,
  // Recursion issues
  /maximum recursion depth/i,
  /stack overflow/i,
  // User's syntax errors
  /syntax error/i,
  /unexpected token/i,
];

/**
 * Detect if an error is an Input Contract Error (platform passed bad input)
 * 
 * This is conservative to avoid false positives:
 * 1. Check if error matches input contract patterns
 * 2. Check if NOT a clear user error
 * 3. Optionally check for context patterns that strengthen diagnosis
 * 
 * @param errorText - Raw error text from execution
 * @param language - Programming language
 * @returns true if this is likely an input contract error
 */
export function isInputContractError(errorText: string, language: string): boolean {
  if (!errorText || typeof errorText !== 'string') return false;
  
  const normalizedLang = language.toLowerCase();
  const patterns = INPUT_CONTRACT_ERROR_PATTERNS[normalizedLang] || [];
  
  // Check if error matches any input contract pattern
  const matchesContractPattern = patterns.some(pattern => pattern.test(errorText));
  if (!matchesContractPattern) return false;
  
  // Check if this is clearly a user error (avoid false positives)
  const isUserError = USER_ERROR_INDICATORS.some(pattern => pattern.test(errorText));
  if (isUserError) return false;
  
  // For segmentation faults (C/C++), be more conservative
  // Only treat as input contract error if it happens very early
  if (/segmentation fault|bus error/i.test(errorText)) {
    const hasEarlyContext = INPUT_CONTRACT_CONTEXT_PATTERNS.some(p => p.test(errorText));
    // Without early context, we can't be sure it's an input issue
    // So we'll still classify it as input contract for C/C++ since these often indicate bad input
    if (normalizedLang === 'cpp' || normalizedLang === 'c') {
      return true; // C/C++ segfaults are often input issues in judge context
    }
    return hasEarlyContext;
  }
  
  return true;
}

/**
 * Create an Input Contract Error result
 * This follows LeetCode's UX principles:
 * - No raw stack traces
 * - No line highlights
 * - Neutral, calm, instructional tone
 * - Never blames the learner
 */
function createInputContractError(errorText: string): ParsedError {
  return {
    type: 'InputContractError',
    message: 'Input format mismatch',
    category: 'input_contract',
    executionPhase: 'system',
    isUserCodeError: false,
    friendlyType: 'Input Format Error',
    friendlyMessage: "Your code looks correct, but the input was passed in an unexpected format.",
    coachHint: "💡 This usually happens when the platform input format doesn't match the function signature. This is not your fault!",
    fixHint: "Check that the problem input format matches the function parameters. The test may need adjustment.",
    // No line highlights for input contract errors
    userLine: undefined,
    codeLine: undefined,
    pointer: undefined,
    // Keep internal traceback for debugging but don't show to user
    internalTraceback: [],
    userTraceback: [],
    cleanedOutput: '',
    rawError: errorText,
  };
}

// ============================================================================
// Syntax Error Detection
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
// Runtime Error Detection
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
  // Java
  'NullPointerException',
  'ArrayIndexOutOfBoundsException',
  'ClassCastException',
  'NumberFormatException',
  'IllegalArgumentException',
  // C++
  'std::out_of_range',
  'std::runtime_error',
  'std::logic_error',
];

function isRuntimeErrorType(errorType: string): boolean {
  return RUNTIME_ERROR_TYPES.includes(errorType);
}

// ============================================================================
// Caret/Pointer Detection and Generation
// ============================================================================

function isCaretLine(line: string): boolean {
  return /^\s*\^+\s*$/.test(line);
}

/**
 * Generate a caret pointer if column number is provided but no caret exists
 */
function generatePointer(column: number, leadingSpaces: number = 0): string {
  const spaces = ' '.repeat(leadingSpaces + column - 1);
  return `${spaces}^`;
}

/**
 * Extract column number from error message (various formats)
 */
function extractColumnNumber(errorText: string): number | undefined {
  // Python: "column X" or ":X" at end
  const colMatch = errorText.match(/column\s*(\d+)/i) 
    || errorText.match(/:\s*line\s*\d+,\s*column\s*(\d+)/i)
    || errorText.match(/\(at column (\d+)\)/i);
  
  if (colMatch) {
    return parseInt(colMatch[1], 10);
  }
  
  // Java/C++: "^" position or column in parentheses
  const javaColMatch = errorText.match(/\^/);
  if (javaColMatch && javaColMatch.index !== undefined) {
    return javaColMatch.index + 1;
  }
  
  return undefined;
}

/**
 * Extract code line and caret pointer from error output
 */
function extractCodeAndPointer(
  lines: string[],
  startIndex: number
): { codeLine?: string; pointer?: string; column?: number } {
  let codeLine: string | undefined;
  let pointer: string | undefined;
  let column: number | undefined;

  for (let i = startIndex; i < Math.min(startIndex + 4, lines.length); i++) {
    const line = lines[i];
    
    if (!line.trim()) continue;
    if (/^(\w+Error|\w+Exception):/.test(line.trim())) continue;
    if (/^File\s/.test(line.trim())) continue;
    
    // Check for caret pointer
    if (isCaretLine(line)) {
      pointer = line;
      column = line.indexOf('^') + 1;
      break;
    }
    
    // This is likely the code line
    if (!codeLine && line.trim()) {
      codeLine = line.replace(/^\s{4}/, ''); // Remove standard 4-space indent
    }
  }

  return { codeLine, pointer, column };
}

// ============================================================================
// Frame Segregation - Separate user frames from internal frames
// ============================================================================

interface SegregatedFrames {
  userFrames: string[];
  internalFrames: string[];
  userLine?: number;
  codeLine?: string;
  pointer?: string;
}

function segregateFrames(
  errorText: string,
  language: string,
  userCodeLineCount: number
): SegregatedFrames {
  const lines = errorText.split('\n');
  const userFrames: string[] = [];
  const internalFrames: string[] = [];
  let userLine: number | undefined;
  let codeLine: string | undefined;
  let pointer: string | undefined;
  
  const langLower = language.toLowerCase();
  const userFileNames = USER_FILE_NAMES[langLower] || ['<your_code>'];
  const userCodeOffset = USER_CODE_START_LINES[langLower] || 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (!trimmedLine) continue;
    
    // Check if this is an internal frame
    if (isInternalFrame(line)) {
      internalFrames.push(line);
      continue;
    }
    
    // Check for user file reference
    const isUserFrame = userFileNames.some(name => 
      line.toLowerCase().includes(name.toLowerCase())
    ) || line.includes('<string>') || line.includes('<module>');
    
    if (isUserFrame) {
      // Extract line number
      const lineMatch = line.match(/line\s*(\d+)/i);
      if (lineMatch) {
        const rawLine = parseInt(lineMatch[1], 10);
        const mappedLine = rawLine - userCodeOffset + 1;
        
        if (mappedLine >= 1 && mappedLine <= userCodeLineCount) {
          userLine = mappedLine;
        }
      }
      
      // Extract code and pointer from subsequent lines
      const extracted = extractCodeAndPointer(lines, i + 1);
      if (extracted.codeLine) codeLine = extracted.codeLine;
      if (extracted.pointer) pointer = extracted.pointer;
      
      userFrames.push(line);
    } else if (/^(\w+Error|\w+Exception):/.test(trimmedLine)) {
      // Error type line - goes to user frames
      userFrames.push(line);
    } else if (isCaretLine(line)) {
      // Caret pointer - associate with user frames
      pointer = line;
      userFrames.push(line);
    } else if (!line.startsWith(' ') && !line.includes('Traceback')) {
      // Code snippet lines typically aren't indented with "at" or "File"
      userFrames.push(line);
    } else {
      // Default to user frames if not clearly internal
      if (!line.includes('Traceback')) {
        userFrames.push(line);
      }
    }
  }
  
  return { userFrames, internalFrames, userLine, codeLine, pointer };
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
    internalTraceback: [],
    userTraceback: [],
    cleanedOutput: '',
    rawError: errorText,
  };

  const lines = errorText.split('\n');
  
  // Segregate frames
  const segregated = segregateFrames(errorText, 'python', userCodeLineCount);
  result.internalTraceback = segregated.internalFrames;
  result.userTraceback = segregated.userFrames;
  result.userLine = segregated.userLine;
  result.codeLine = segregated.codeLine;
  result.codeSnippet = segregated.codeLine;
  result.pointer = segregated.pointer;

  // Extract error type and message from the last error line
  for (let i = lines.length - 1; i >= 0; i--) {
    const match = lines[i].match(/^(\w+(?:Error|Exception)):\s*(.*)$/);
    if (match) {
      result.type = match[1];
      result.message = match[2].trim();
      break;
    }
  }

  // Handle SyntaxError with detailed messages (Python 3.10+)
  if (result.type === 'SyntaxError' && !result.message) {
    for (const line of lines) {
      const syntaxMatch = line.match(/^\s*(?:SyntaxError:\s*)?(.+(?:was never closed|unexpected EOF|invalid syntax|expected).*)$/i);
      if (syntaxMatch) {
        result.message = syntaxMatch[1].trim();
        break;
      }
    }
  }

  // Determine category and phase
  const errorInfo = ERROR_EXPLANATIONS[result.type] || ERROR_EXPLANATIONS.Error;
  
  if (isSyntaxErrorType(result.type)) {
    result.category = 'syntax';
    result.executionPhase = 'parse';
    result.friendlyType = 'Syntax Error';
    result.friendlyMessage = errorInfo.explanation;
    result.coachHint = errorInfo.coachHint;
  } else if (isRuntimeErrorType(result.type)) {
    result.category = 'runtime';
    result.executionPhase = 'execution';
    result.friendlyType = 'Runtime Error';
    result.friendlyMessage = errorInfo.explanation;
    result.coachHint = errorInfo.coachHint;
  } else {
    result.category = errorInfo.category;
    result.executionPhase = errorInfo.phase;
    result.friendlyType = errorInfo.friendlyType;
    result.friendlyMessage = errorInfo.explanation;
    result.coachHint = errorInfo.coachHint;
  }
  
  result.fixHint = errorInfo.fixHint;
  
  // Generate cleaned output (paths stripped, internal frames removed)
  result.cleanedOutput = buildCleanedOutput(result, 'python');

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
    internalTraceback: [],
    userTraceback: [],
    cleanedOutput: '',
    rawError: errorText,
  };

  // Segregate frames
  const segregated = segregateFrames(errorText, 'javascript', userCodeLineCount);
  result.internalTraceback = segregated.internalFrames;
  result.userTraceback = segregated.userFrames;

  // Extract error type and message
  const errorTypeMatch = errorText.match(/^(\w+Error):\s*(.*)$/m);
  if (errorTypeMatch) {
    result.type = errorTypeMatch[1];
    result.message = errorTypeMatch[2].trim();
  }

  // Check for SyntaxError
  if (result.type === 'SyntaxError') {
    result.category = 'syntax';
    result.executionPhase = 'parse';
    result.friendlyType = 'Syntax Error';
  }

  // Look for line number in JS stack trace
  const lineMatches = [
    ...errorText.matchAll(/<anonymous>:(\d+):\d+/g),
    ...errorText.matchAll(/at\s+.*:(\d+):\d+/g),
    ...errorText.matchAll(/Solution\.js:(\d+):\d+/g),
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
  if (result.category !== 'syntax') {
    result.category = errorInfo.category;
    result.executionPhase = errorInfo.phase;
    result.friendlyType = errorInfo.friendlyType;
  }
  result.friendlyMessage = errorInfo.explanation;
  result.coachHint = errorInfo.coachHint;
  result.fixHint = errorInfo.fixHint;
  
  // Generate cleaned output
  result.cleanedOutput = buildCleanedOutput(result, 'javascript');

  return result;
}

// ============================================================================
// Java Error Parser
// ============================================================================

function parseJavaError(
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
    internalTraceback: [],
    userTraceback: [],
    cleanedOutput: '',
    rawError: errorText,
  };

  // Segregate frames
  const segregated = segregateFrames(errorText, 'java', userCodeLineCount);
  result.internalTraceback = segregated.internalFrames;
  result.userTraceback = segregated.userFrames;

  // Extract Java exception type and message
  const exceptionMatch = errorText.match(/^([\w.]+(?:Exception|Error)):\s*(.*)$/m);
  if (exceptionMatch) {
    result.type = exceptionMatch[1].split('.').pop() || exceptionMatch[1];
    result.message = exceptionMatch[2].trim();
  }

  // Look for line number in stack trace
  const lineMatch = errorText.match(/Solution\.java:(\d+)/i);
  if (lineMatch) {
    const originalLine = parseInt(lineMatch[1], 10);
    result.originalLine = originalLine;
    
    const userCodeStartLine = USER_CODE_START_LINES.java;
    const mappedLine = originalLine - userCodeStartLine + 1;
    
    if (mappedLine >= 1 && mappedLine <= userCodeLineCount) {
      result.userLine = mappedLine;
      result.isUserCodeError = true;
    }
  }

  // Get friendly error info
  const errorInfo = ERROR_EXPLANATIONS[result.type] || ERROR_EXPLANATIONS.Error;
  result.friendlyMessage = errorInfo.explanation;
  result.coachHint = errorInfo.coachHint;
  result.fixHint = errorInfo.fixHint;
  
  // Generate cleaned output
  result.cleanedOutput = buildCleanedOutput(result, 'java');

  return result;
}

// ============================================================================
// C++ Error Parser
// ============================================================================

function parseCppError(
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
    internalTraceback: [],
    userTraceback: [],
    cleanedOutput: '',
    rawError: errorText,
  };

  // Segregate frames
  const segregated = segregateFrames(errorText, 'cpp', userCodeLineCount);
  result.internalTraceback = segregated.internalFrames;
  result.userTraceback = segregated.userFrames;

  // Extract C++ error type
  const errorMatch = errorText.match(/^(std::[\w_]+|error:)\s*(.*)$/mi);
  if (errorMatch) {
    result.type = errorMatch[1];
    result.message = errorMatch[2].trim();
  }

  // Look for line number in compiler output (solution.cpp:X:Y)
  const lineMatch = errorText.match(/solution\.cpp:(\d+)(?::(\d+))?/i);
  if (lineMatch) {
    const originalLine = parseInt(lineMatch[1], 10);
    result.originalLine = originalLine;
    
    const userCodeStartLine = USER_CODE_START_LINES.cpp;
    const mappedLine = originalLine - userCodeStartLine + 1;
    
    if (mappedLine >= 1 && mappedLine <= userCodeLineCount) {
      result.userLine = mappedLine;
      result.isUserCodeError = true;
      
      // Generate pointer if column is available
      if (lineMatch[2]) {
        const column = parseInt(lineMatch[2], 10);
        result.pointer = generatePointer(column);
      }
    }
  }

  // Get friendly error info
  const errorInfo = ERROR_EXPLANATIONS[result.type] || ERROR_EXPLANATIONS.Error;
  result.friendlyMessage = errorInfo.explanation;
  result.coachHint = errorInfo.coachHint;
  result.fixHint = errorInfo.fixHint;
  
  // Generate cleaned output
  result.cleanedOutput = buildCleanedOutput(result, 'cpp');

  return result;
}

// ============================================================================
// Build Cleaned Output (for UI display)
// ============================================================================

function buildCleanedOutput(parsed: ParsedError, language: string): string {
  const lines: string[] = [];
  
  // Add error type and message
  if (parsed.type && parsed.message) {
    lines.push(`${parsed.type}: ${parsed.message}`);
  } else if (parsed.type) {
    lines.push(parsed.type);
  }
  
  // Add code line if available
  if (parsed.codeLine) {
    lines.push('');
    lines.push(`    ${parsed.codeLine}`);
    if (parsed.pointer) {
      lines.push(parsed.pointer);
    }
  }
  
  // Add user line reference
  if (parsed.userLine) {
    lines.push(`Line ${parsed.userLine}  (${language === 'python' ? 'Solution.py' : language === 'java' ? 'Solution.java' : 'solution.cpp'})`);
  }
  
  // Strip server paths from the output
  return stripServerPaths(lines.join('\n'), language);
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
    friendlyMessage: "Hmm, this looks like a hiccup on our end, not your code!",
    coachHint: "💡 Try running your code again. If it keeps happening, let us know!",
    fixHint: 'This is not your fault. Please try running your code again.',
    internalTraceback: [],
    userTraceback: [],
    cleanedOutput: errorText,
    rawError: errorText,
  };
}

// ============================================================================
// Main Parser
// ============================================================================

/**
 * Parse error output from code execution and map to user's visible lines
 * Implements student-first error normalization with LeetCode-style error ownership
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

  // Check for internal/platform errors first (TLE, OOM, crashes, etc.)
  if (isInternalError(errorText)) {
    return createInternalError(errorText);
  }

  // LeetCode-style: Check for Input Contract Errors BEFORE normal parsing
  // These are platform input mismatches, NOT user errors
  if (isInputContractError(errorText, language)) {
    return createInputContractError(errorText);
  }

  const normalizedLang = language.toLowerCase();

  if (normalizedLang === 'python') {
    return parsePythonError(errorText, userCodeLineCount);
  }

  if (normalizedLang === 'javascript' || normalizedLang === 'typescript') {
    return parseJavaScriptError(errorText, userCodeLineCount);
  }

  if (normalizedLang === 'java') {
    return parseJavaError(errorText, userCodeLineCount);
  }

  if (normalizedLang === 'cpp' || normalizedLang === 'c++' || normalizedLang === 'c') {
    return parseCppError(errorText, userCodeLineCount);
  }

  // Generic fallback
  return {
    type: 'Error',
    message: errorText,
    category: 'runtime',
    executionPhase: 'execution',
    isUserCodeError: true,
    friendlyType: 'Runtime Error',
    friendlyMessage: "Something went wrong while running your code.",
    coachHint: "💡 Check the error message for clues!",
    internalTraceback: [],
    userTraceback: [],
    cleanedOutput: stripServerPaths(errorText, language),
    rawError: errorText,
  };
}

// ============================================================================
// Format Error for Display (Legacy support)
// ============================================================================

export function formatErrorForDisplay(parsed: ParsedError): string {
  if (!parsed.isUserCodeError) {
    return `Internal Error\n\n${parsed.friendlyMessage}`;
  }

  let formatted = `${parsed.friendlyType}\n\n`;
  formatted += `${parsed.friendlyMessage}`;
  
  if (parsed.coachHint) {
    formatted += `\n\n${parsed.coachHint}`;
  }
  
  if (parsed.userLine && parsed.codeLine) {
    formatted += `\n\nLine ${parsed.userLine}:\n${parsed.codeLine}`;
    if (parsed.pointer) {
      formatted += `\n${parsed.pointer}`;
    }
  }

  return formatted;
}

// ============================================================================
// Clean Error Message (Strip paths and internal details)
// ============================================================================

export function cleanErrorMessage(errorText: string, language: string = 'python'): string {
  const lines = errorText.split('\n');
  const cleanedLines: string[] = [];
  
  for (const line of lines) {
    // Skip internal stack frames
    if (isInternalFrame(line)) continue;
    
    // Skip "Traceback (most recent call last):" header
    if (line.includes('Traceback (most recent call last)')) continue;
    
    // Skip "During handling of the above exception" messages
    if (line.includes('During handling of')) continue;
    
    cleanedLines.push(line);
  }
  
  // Strip server paths from the result
  return stripServerPaths(cleanedLines.join('\n').trim(), language);
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
// Utility Functions
// ============================================================================

export function isUserActionableError(parsed: ParsedError): boolean {
  return parsed.isUserCodeError && parsed.category !== 'internal' && parsed.category !== 'input_contract';
}

export function isInputContractErrorResult(parsed: ParsedError): boolean {
  return parsed.category === 'input_contract' || parsed.type === 'InputContractError';
}

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

export function isSyntaxError(parsed: ParsedError): boolean {
  return parsed.category === 'syntax';
}

export function isRuntimeError(parsed: ParsedError): boolean {
  return parsed.category === 'runtime';
}

// ============================================================================
// Pattern Detection for Raw Output
// ============================================================================

const RUNTIME_ERROR_PATTERN = new RegExp(
  `^(${[...RUNTIME_ERROR_TYPES, ...SYNTAX_ERROR_TYPES].join('|')}):`,
  'i'
);

export function containsErrorPattern(text: string | undefined | null): boolean {
  if (!text) return false;
  return RUNTIME_ERROR_PATTERN.test(text.trim());
}

export function looksLikeError(text: string | undefined | null): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  
  if (RUNTIME_ERROR_PATTERN.test(trimmed)) return true;
  if (/^Traceback \(most recent call last\)/i.test(trimmed)) return true;
  if (/^[A-Z][a-zA-Z]*Error:/m.test(trimmed)) return true;
  
  return false;
}

// ============================================================================
// Get Internal Frames for "View More" Toggle
// ============================================================================

export function getInternalFramesForDisplay(parsed: ParsedError): string {
  if (parsed.internalTraceback.length === 0) return '';
  return parsed.internalTraceback.join('\n');
}

export function hasInternalFrames(parsed: ParsedError): boolean {
  return parsed.internalTraceback.length > 0;
}
