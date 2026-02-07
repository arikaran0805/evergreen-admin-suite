import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// =============================================================================
// TYPES
// =============================================================================

type FailureType =
  | 'COMPILE_ERROR'
  | 'RUNTIME_ERROR'
  | 'TIMEOUT'
  | 'WRONG_ANSWER'
  | 'VALIDATOR_ERROR';

type Status = 'PASS' | 'FAIL';
type ValidationMode = 'output_comparison' | 'test_cases' | 'custom_function';
type ExecutionMode = 'run' | 'submit';

interface TestCaseInput {
  input: string;
  expected_output: string;
  is_hidden?: boolean;
}

interface JudgeFixErrorRequest {
  code: string;
  language: string;
  validation_type: ValidationMode;
  mode?: ExecutionMode;
  // For output_comparison
  expected_output?: string;
  // For test_cases
  test_cases?: TestCaseInput[];
  // For custom_function
  custom_validator?: string;
  // Limits
  time_limit_ms?: number;
  memory_limit_mb?: number;
}

interface DiffLine {
  type: 'match' | 'missing' | 'extra' | 'incorrect';
  lineNumber: number;
  expected?: string;
  actual?: string;
}

interface TestCaseResult {
  id: number;
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
  error?: string;
  runtime_ms?: number;
  is_visible: boolean;
}

interface JudgeFixErrorResponse {
  status: Status;
  failureType?: FailureType;
  summaryMessage: string;
  stdout: string;
  stderr: string;
  diff?: DiffLine[];
  testResults?: TestCaseResult[];
  runtime_ms: number;
  passed_count: number;
  total_count: number;
}

// =============================================================================
// OUTPUT NORMALIZATION
// =============================================================================

/**
 * Normalize output per spec:
 * - Convert CRLF → LF
 * - Remove final trailing newline only
 * - Preserve internal whitespace
 */
function normalizeOutput(raw: string): string {
  let normalized = raw.replace(/\r\n/g, '\n');
  if (normalized.endsWith('\n')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

// =============================================================================
// DIFF GENERATION (for output_comparison)
// =============================================================================

function generateDiff(expected: string, actual: string): DiffLine[] {
  const expectedLines = expected.split('\n');
  const actualLines = actual.split('\n');
  const maxLen = Math.max(expectedLines.length, actualLines.length);
  const diff: DiffLine[] = [];

  for (let i = 0; i < maxLen; i++) {
    const exp = i < expectedLines.length ? expectedLines[i] : undefined;
    const act = i < actualLines.length ? actualLines[i] : undefined;

    if (exp !== undefined && act !== undefined) {
      if (exp === act) {
        diff.push({ type: 'match', lineNumber: i + 1, expected: exp, actual: act });
      } else {
        diff.push({ type: 'incorrect', lineNumber: i + 1, expected: exp, actual: act });
      }
    } else if (exp !== undefined && act === undefined) {
      diff.push({ type: 'missing', lineNumber: i + 1, expected: exp });
    } else if (act !== undefined && exp === undefined) {
      diff.push({ type: 'extra', lineNumber: i + 1, actual: act });
    }
  }

  return diff;
}

// =============================================================================
// SYNTAX/COMPILATION ERROR DETECTION
// =============================================================================

function isSyntaxOrCompilationError(stderr: string, language: string): boolean {
  if (!stderr || stderr.trim().length === 0) return false;
  const lang = language.toLowerCase().trim();
  const lower = stderr.toLowerCase();

  if (lang === 'python' || lang === 'python3') {
    return (
      stderr.includes('SyntaxError') ||
      stderr.includes('IndentationError') ||
      stderr.includes('TabError') ||
      lower.includes('invalid syntax') ||
      lower.includes('was never closed') ||
      lower.includes('expected an indented block') ||
      lower.includes('unexpected eof')
    );
  }

  if (lang === 'javascript' || lang === 'typescript') {
    return (
      stderr.includes('SyntaxError') ||
      lower.includes('unexpected token') ||
      lower.includes('unexpected end of input') ||
      lower.includes('unexpected identifier') ||
      lower.includes('invalid or unexpected token')
    );
  }

  if (lang === 'java') {
    return stderr.includes('error:') || lower.includes('reached end of file while parsing');
  }

  if (lang === 'c' || lang === 'cpp' || lang === 'c++') {
    return stderr.includes('error:');
  }

  return false;
}

// =============================================================================
// PISTON EXECUTION
// =============================================================================

interface PistonResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
  compileError?: string;
}

async function executePiston(
  code: string,
  language: string,
  timeLimitMs: number
): Promise<PistonResult> {
  const pistonLang = language === 'typescript' ? 'javascript' : language;

  const pistonResponse = await fetch('https://emkc.org/api/v2/piston/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: pistonLang,
      version: '*',
      files: [{ content: code }],
      run_timeout: timeLimitMs,
    }),
  });

  if (!pistonResponse.ok) {
    const errorText = await pistonResponse.text();
    console.error('Piston API error:', errorText);
    throw new Error('Code execution service unavailable');
  }

  const result = await pistonResponse.json();

  // Check for compilation errors
  if (result.compile?.stderr) {
    return {
      stdout: '',
      stderr: result.compile.stderr,
      exitCode: 1,
      timedOut: false,
      compileError: result.compile.stderr,
    };
  }

  const timedOut = result.run?.signal === 'SIGKILL' || result.run?.code === 137;

  return {
    stdout: result.run?.stdout || '',
    stderr: result.run?.stderr || '',
    exitCode: result.run?.code ?? 0,
    timedOut,
  };
}

// =============================================================================
// VALIDATION: OUTPUT COMPARISON
// =============================================================================

async function validateOutputComparison(
  code: string,
  language: string,
  expectedOutput: string,
  timeLimitMs: number,
): Promise<JudgeFixErrorResponse> {
  const result = await executePiston(code, language, timeLimitMs);

  // Compile error
  if (result.compileError) {
    return {
      status: 'FAIL',
      failureType: 'COMPILE_ERROR',
      summaryMessage: 'Your code has a compilation/syntax error.',
      stdout: '',
      stderr: result.compileError.substring(0, 1000),
      runtime_ms: 0,
      passed_count: 0,
      total_count: 1,
    };
  }

  // Timeout
  if (result.timedOut) {
    return {
      status: 'FAIL',
      failureType: 'TIMEOUT',
      summaryMessage: 'Your code exceeded the time limit.',
      stdout: result.stdout,
      stderr: '',
      runtime_ms: timeLimitMs,
      passed_count: 0,
      total_count: 1,
    };
  }

  // Runtime error (non-zero exit with stderr and no stdout)
  if (result.exitCode !== 0 && result.stderr && !result.stdout.trim()) {
    const isCompile = isSyntaxOrCompilationError(result.stderr, language);
    return {
      status: 'FAIL',
      failureType: isCompile ? 'COMPILE_ERROR' : 'RUNTIME_ERROR',
      summaryMessage: isCompile
        ? 'Your code has a syntax error.'
        : 'Your code produced a runtime error.',
      stdout: '',
      stderr: result.stderr.substring(0, 1000),
      runtime_ms: 0,
      passed_count: 0,
      total_count: 1,
    };
  }

  // Compare output
  const normalizedActual = normalizeOutput(result.stdout);
  const normalizedExpected = normalizeOutput(expectedOutput);

  if (normalizedActual === normalizedExpected) {
    return {
      status: 'PASS',
      summaryMessage: 'Output matches expected result.',
      stdout: result.stdout,
      stderr: result.stderr,
      runtime_ms: 0,
      passed_count: 1,
      total_count: 1,
    };
  }

  const diff = generateDiff(normalizedExpected, normalizedActual);

  return {
    status: 'FAIL',
    failureType: 'WRONG_ANSWER',
    summaryMessage: 'Your output does not match the expected result.',
    stdout: result.stdout,
    stderr: result.stderr,
    diff,
    runtime_ms: 0,
    passed_count: 0,
    total_count: 1,
  };
}

// =============================================================================
// VALIDATION: TEST CASES
// =============================================================================

async function validateTestCases(
  code: string,
  language: string,
  testCases: TestCaseInput[],
  mode: ExecutionMode,
  timeLimitMs: number,
): Promise<JudgeFixErrorResponse> {
  const results: TestCaseResult[] = [];
  let allPassed = true;
  let globalError: string | undefined;
  let totalRuntime = 0;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const isVisible = !(tc.is_hidden);

    // In run mode, skip hidden tests
    if (mode === 'run' && tc.is_hidden) continue;

    // Build full code: learner code + test invocation in shared context
    const fullCode = `${code}\n\n# Test\n${tc.input}`;

    try {
      const startTime = Date.now();
      const result = await executePiston(fullCode, language, timeLimitMs);
      const runtime = Date.now() - startTime;
      totalRuntime += runtime;

      // Compile error → stop immediately
      if (result.compileError) {
        const isCompile = isSyntaxOrCompilationError(result.compileError, language);
        globalError = result.compileError.substring(0, 1000);
        allPassed = false;

        results.push({
          id: i,
          passed: false,
          input: isVisible ? tc.input : '[hidden]',
          expected: isVisible ? tc.expected_output : '[hidden]',
          actual: '',
          error: isCompile ? 'Compilation Error' : 'Runtime Error',
          runtime_ms: 0,
          is_visible: isVisible,
        });

        break; // Critical failure — stop
      }

      // Timeout
      if (result.timedOut) {
        allPassed = false;
        results.push({
          id: i,
          passed: false,
          input: isVisible ? tc.input : '[hidden]',
          expected: isVisible ? tc.expected_output : '[hidden]',
          actual: '',
          error: 'Time Limit Exceeded',
          runtime_ms: timeLimitMs,
          is_visible: isVisible,
        });
        break;
      }

      // Runtime error (stderr + no stdout)
      if (result.exitCode !== 0 && result.stderr && !result.stdout.trim()) {
        const isCompile = isSyntaxOrCompilationError(result.stderr, language);
        allPassed = false;

        if (isCompile) {
          globalError = result.stderr.substring(0, 1000);
          results.push({
            id: i,
            passed: false,
            input: isVisible ? tc.input : '[hidden]',
            expected: isVisible ? tc.expected_output : '[hidden]',
            actual: '',
            error: result.stderr.substring(0, 500),
            runtime_ms: runtime,
            is_visible: isVisible,
          });
          break;
        }

        results.push({
          id: i,
          passed: false,
          input: isVisible ? tc.input : '[hidden]',
          expected: isVisible ? tc.expected_output : '[hidden]',
          actual: '',
          error: result.stderr.substring(0, 500),
          runtime_ms: runtime,
          is_visible: isVisible,
        });

        if (mode === 'run') break; // Stop on first failure in run mode
        continue;
      }

      // Compare outputs
      const actualOutput = normalizeOutput(result.stdout);
      const expectedOutput = normalizeOutput(tc.expected_output);
      const passed = actualOutput === expectedOutput;

      if (!passed) allPassed = false;

      results.push({
        id: i,
        passed,
        input: isVisible ? tc.input : '[hidden]',
        expected: isVisible ? tc.expected_output : '[hidden]',
        actual: isVisible ? actualOutput : (passed ? '[hidden]' : '[hidden]'),
        runtime_ms: runtime,
        is_visible: isVisible,
      });

      // In run mode, stop on first failure
      if (mode === 'run' && !passed) break;

    } catch (err) {
      allPassed = false;
      results.push({
        id: i,
        passed: false,
        input: isVisible ? tc.input : '[hidden]',
        expected: isVisible ? tc.expected_output : '[hidden]',
        actual: '',
        error: err instanceof Error ? err.message : 'Execution failed',
        runtime_ms: 0,
        is_visible: isVisible,
      });
      break;
    }
  }

  // Shape hidden test results for submit mode
  const shapedResults = mode === 'submit'
    ? results.map(r => ({
        ...r,
        input: r.is_visible ? r.input : '[hidden]',
        expected: r.is_visible ? r.expected : '[hidden]',
        actual: r.is_visible ? r.actual : '[hidden]',
        error: r.is_visible ? r.error : (r.error ? 'Runtime Error' : undefined),
      }))
    : results;

  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;

  if (allPassed) {
    return {
      status: 'PASS',
      summaryMessage: `All ${totalCount} test cases passed.`,
      stdout: '',
      stderr: '',
      testResults: shapedResults,
      runtime_ms: totalRuntime,
      passed_count: passedCount,
      total_count: totalCount,
    };
  }

  // Determine failure type
  let failureType: FailureType = 'WRONG_ANSWER';
  const hasError = results.some(r => r.error);
  if (globalError && isSyntaxOrCompilationError(globalError, language)) {
    failureType = 'COMPILE_ERROR';
  } else if (results.some(r => r.error === 'Time Limit Exceeded')) {
    failureType = 'TIMEOUT';
  } else if (hasError) {
    failureType = 'RUNTIME_ERROR';
  }

  const summaryMessages: Record<FailureType, string> = {
    COMPILE_ERROR: 'Your code has a compilation/syntax error.',
    RUNTIME_ERROR: 'Your code produced a runtime error.',
    TIMEOUT: 'Your code exceeded the time limit.',
    WRONG_ANSWER: `${passedCount} / ${totalCount} test cases passed.`,
    VALIDATOR_ERROR: 'Validation error.',
  };

  return {
    status: 'FAIL',
    failureType,
    summaryMessage: summaryMessages[failureType],
    stdout: '',
    stderr: globalError || '',
    testResults: shapedResults,
    runtime_ms: totalRuntime,
    passed_count: passedCount,
    total_count: totalCount,
  };
}

// =============================================================================
// VALIDATION: CUSTOM VALIDATOR
// =============================================================================

async function validateCustom(
  code: string,
  language: string,
  customValidator: string,
  timeLimitMs: number,
): Promise<JudgeFixErrorResponse> {
  // Step 1: Execute learner's code
  const learnerResult = await executePiston(code, language, timeLimitMs);

  if (learnerResult.compileError) {
    return {
      status: 'FAIL',
      failureType: 'COMPILE_ERROR',
      summaryMessage: 'Your code has a compilation/syntax error.',
      stdout: '',
      stderr: learnerResult.compileError.substring(0, 1000),
      runtime_ms: 0,
      passed_count: 0,
      total_count: 1,
    };
  }

  if (learnerResult.timedOut) {
    return {
      status: 'FAIL',
      failureType: 'TIMEOUT',
      summaryMessage: 'Your code exceeded the time limit.',
      stdout: learnerResult.stdout,
      stderr: '',
      runtime_ms: timeLimitMs,
      passed_count: 0,
      total_count: 1,
    };
  }

  if (learnerResult.exitCode !== 0 && learnerResult.stderr && !learnerResult.stdout.trim()) {
    const isCompile = isSyntaxOrCompilationError(learnerResult.stderr, language);
    return {
      status: 'FAIL',
      failureType: isCompile ? 'COMPILE_ERROR' : 'RUNTIME_ERROR',
      summaryMessage: isCompile
        ? 'Your code has a syntax error.'
        : 'Your code produced a runtime error.',
      stdout: '',
      stderr: learnerResult.stderr.substring(0, 1000),
      runtime_ms: 0,
      passed_count: 0,
      total_count: 1,
    };
  }

  // Step 2: Run the custom validator with learner's output
  const validatorCode = buildValidatorCode(
    code,
    customValidator,
    learnerResult.stdout,
    language
  );

  try {
    const validatorResult = await executePiston(validatorCode, language, timeLimitMs);

    if (validatorResult.compileError || validatorResult.timedOut) {
      return {
        status: 'FAIL',
        failureType: 'VALIDATOR_ERROR',
        summaryMessage: 'Internal validation error. Please report this problem.',
        stdout: learnerResult.stdout,
        stderr: 'Validator failed to execute.',
        runtime_ms: 0,
        passed_count: 0,
        total_count: 1,
      };
    }

    // Parse validator output: expects JSON { pass: boolean, message: string, details?: any }
    const validatorStdout = normalizeOutput(validatorResult.stdout);
    try {
      const validatorOutput = JSON.parse(validatorStdout);

      if (validatorOutput.pass) {
        return {
          status: 'PASS',
          summaryMessage: validatorOutput.message || 'Custom validation passed.',
          stdout: learnerResult.stdout,
          stderr: '',
          runtime_ms: 0,
          passed_count: 1,
          total_count: 1,
        };
      }

      return {
        status: 'FAIL',
        failureType: 'WRONG_ANSWER',
        summaryMessage: validatorOutput.message || 'Custom validation failed.',
        stdout: learnerResult.stdout,
        stderr: '',
        runtime_ms: 0,
        passed_count: 0,
        total_count: 1,
      };
    } catch {
      // Validator didn't return valid JSON
      return {
        status: 'FAIL',
        failureType: 'VALIDATOR_ERROR',
        summaryMessage: 'Internal validation error. Please report this problem.',
        stdout: learnerResult.stdout,
        stderr: 'Validator returned invalid output.',
        runtime_ms: 0,
        passed_count: 0,
        total_count: 1,
      };
    }
  } catch (err) {
    return {
      status: 'FAIL',
      failureType: 'VALIDATOR_ERROR',
      summaryMessage: 'Internal validation error. Please report this problem.',
      stdout: learnerResult.stdout,
      stderr: err instanceof Error ? err.message : 'Validator execution failed',
      runtime_ms: 0,
      passed_count: 0,
      total_count: 1,
    };
  }
}

function buildValidatorCode(
  learnerCode: string,
  customValidator: string,
  learnerStdout: string,
  language: string,
): string {
  const escapedStdout = JSON.stringify(learnerStdout);

  if (language === 'python' || language === 'python3') {
    return `
import json

# Learner's code (executed in namespace)
${learnerCode}

# Validator
_learner_stdout = ${escapedStdout}

${customValidator}

# Run validator
try:
    _result = validate(_learner_stdout, dir())
    if isinstance(_result, dict):
        print(json.dumps(_result))
    elif isinstance(_result, bool):
        print(json.dumps({"pass": _result, "message": "Passed" if _result else "Failed"}))
    else:
        print(json.dumps({"pass": False, "message": "Invalid validator return type"}))
except Exception as e:
    print(json.dumps({"pass": False, "message": f"Validator error: {str(e)}"}))
`;
  }

  // JavaScript / TypeScript
  return `
// Learner's code (executed in namespace)
${learnerCode}

// Validator
const _learnerStdout = ${escapedStdout};

${customValidator}

// Run validator
try {
  const _result = validate(_learnerStdout, globalThis);
  if (typeof _result === 'object' && _result !== null) {
    console.log(JSON.stringify(_result));
  } else if (typeof _result === 'boolean') {
    console.log(JSON.stringify({ pass: _result, message: _result ? 'Passed' : 'Failed' }));
  } else {
    console.log(JSON.stringify({ pass: false, message: 'Invalid validator return type' }));
  }
} catch (e) {
  console.log(JSON.stringify({ pass: false, message: 'Validator error: ' + (e.message || e) }));
}
`;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: JudgeFixErrorRequest = await req.json();

    const {
      code,
      language,
      validation_type,
      mode = 'run',
      expected_output,
      test_cases,
      custom_validator,
      time_limit_ms = 5000,
    } = body;

    // Validate required fields
    if (!code || !language || !validation_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: code, language, validation_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[JUDGE-FIX-ERROR][${mode.toUpperCase()}] ${validation_type} | ${language}`);

    let response: JudgeFixErrorResponse;

    switch (validation_type) {
      case 'output_comparison': {
        if (expected_output === undefined || expected_output === null) {
          return new Response(
            JSON.stringify({ error: 'expected_output is required for output_comparison' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        response = await validateOutputComparison(code, language, expected_output, time_limit_ms);
        break;
      }

      case 'test_cases': {
        if (!test_cases || test_cases.length === 0) {
          return new Response(
            JSON.stringify({ error: 'test_cases are required for test_cases validation' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        response = await validateTestCases(code, language, test_cases, mode, time_limit_ms);
        break;
      }

      case 'custom_function': {
        if (!custom_validator) {
          return new Response(
            JSON.stringify({ error: 'custom_validator is required for custom_function validation' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        response = await validateCustom(code, language, custom_validator, time_limit_ms);
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown validation_type: ${validation_type}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to judge fix-error code';
    console.error('Error in judge-fix-error:', error);

    const fallback: JudgeFixErrorResponse = {
      status: 'FAIL',
      failureType: 'RUNTIME_ERROR',
      summaryMessage: errorMessage,
      stdout: '',
      stderr: errorMessage,
      runtime_ms: 0,
      passed_count: 0,
      total_count: 0,
    };

    return new Response(
      JSON.stringify(fallback),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
