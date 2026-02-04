import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Verdict types
type Verdict = 'accepted' | 'wrong_answer' | 'runtime_error' | 'time_limit_exceeded' | 'compilation_error';

interface TestCase {
  id: string | number;
  inputs: Record<string, unknown>;
  expected_output: unknown;
  is_visible?: boolean;
}

interface JudgeRequest {
  code: string;
  language: string;
  function_name: string;
  parameter_names: string[];
  test_cases: TestCase[];
  time_limit_ms?: number;
  memory_limit_mb?: number;
}

interface TestCaseResult {
  id: string | number;
  passed: boolean;
  actual_output?: unknown;
  expected_output?: unknown;
  runtime_ms?: number;
  error?: string;
  is_visible: boolean;
}

interface JudgeResponse {
  verdict: Verdict;
  passed_count: number;
  total_count: number;
  test_results: TestCaseResult[];
  error?: string;
  total_runtime_ms: number;
}

// =============================================================================
// INPUT NORMALIZATION - LeetCode-style type conversion
// =============================================================================

/**
 * Normalize a raw input value to its typed runtime equivalent.
 * This ensures user code NEVER receives raw strings that should be arrays/numbers.
 */
function normalizeInputValue(value: unknown): unknown {
  // Already typed correctly - pass through
  if (value === null || value === undefined) return value;
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map(normalizeInputValue);
  if (typeof value === 'object') {
    const normalized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      normalized[k] = normalizeInputValue(v);
    }
    return normalized;
  }

  // String handling - the critical part
  if (typeof value === 'string') {
    const trimmed = value.trim();
    
    // Empty string stays empty
    if (trimmed === '') return '';
    
    // Boolean literals
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (trimmed === 'True') return true;
    if (trimmed === 'False') return false;
    
    // None/null
    if (trimmed === 'null' || trimmed === 'None') return null;
    
    // Try JSON parse first (handles arrays, objects, quoted strings)
    if (trimmed.startsWith('[') || trimmed.startsWith('{') || trimmed.startsWith('"')) {
      try {
        const parsed = JSON.parse(trimmed);
        return normalizeInputValue(parsed);
      } catch {
        // Not valid JSON, continue with other strategies
      }
    }
    
    // Numeric string (integer or float)
    if (/^-?\d+$/.test(trimmed)) {
      return parseInt(trimmed, 10);
    }
    if (/^-?\d+\.\d+$/.test(trimmed)) {
      return parseFloat(trimmed);
    }
    
    // CSV format: "1,2,3" or "1, 2, 3" → [1, 2, 3]
    if (/^-?\d+(\s*,\s*-?\d+)+$/.test(trimmed)) {
      return trimmed.split(',').map(s => {
        const n = s.trim();
        return n.includes('.') ? parseFloat(n) : parseInt(n, 10);
      });
    }
    
    // Space-separated numbers: "1 2 3" → [1, 2, 3]
    if (/^-?\d+(\s+-?\d+)+$/.test(trimmed)) {
      return trimmed.split(/\s+/).map(s => {
        return s.includes('.') ? parseFloat(s) : parseInt(s, 10);
      });
    }
    
    // CSV strings with potential mixed content: "a,b,c" → ["a", "b", "c"]
    // Only if it looks like a list (has commas and no spaces around them suggesting sentence)
    if (trimmed.includes(',') && !/,\s+[a-z]/i.test(trimmed)) {
      const parts = trimmed.split(',').map(s => s.trim());
      // Check if all parts are numeric
      if (parts.every(p => /^-?\d+(\.\d+)?$/.test(p))) {
        return parts.map(p => p.includes('.') ? parseFloat(p) : parseInt(p, 10));
      }
      // Return as string array
      return parts;
    }
    
    // Plain string - return as-is
    return trimmed;
  }

  return value;
}

/**
 * Prepare all test case inputs for execution.
 * Returns normalized inputs or throws if conversion fails.
 */
function prepareTestCaseInputs(
  testCases: TestCase[],
  parameterNames: string[]
): { normalizedCases: Array<{ id: string | number; args: unknown[]; expected: unknown; is_visible: boolean }>; error?: string } {
  const normalizedCases: Array<{ id: string | number; args: unknown[]; expected: unknown; is_visible: boolean }> = [];

  for (const tc of testCases) {
    try {
      // Validate all required parameters exist
      for (const param of parameterNames) {
        if (!(param in tc.inputs)) {
          return { normalizedCases: [], error: `Missing input for parameter '${param}'` };
        }
      }

      // Normalize each input in parameter order
      const args: unknown[] = [];
      for (const param of parameterNames) {
        const raw = tc.inputs[param];
        const normalized = normalizeInputValue(raw);
        args.push(normalized);
      }

      normalizedCases.push({
        id: tc.id,
        args,
        expected: normalizeInputValue(tc.expected_output),
        is_visible: tc.is_visible ?? true,
      });
    } catch (e) {
      return { normalizedCases: [], error: `Input normalization failed: ${e instanceof Error ? e.message : 'Unknown error'}` };
    }
  }

  return { normalizedCases };
}

// =============================================================================
// CODE GENERATION - Language-specific execution wrappers
// =============================================================================

function generatePythonCode(
  userCode: string,
  functionName: string,
  normalizedCases: Array<{ id: string | number; args: unknown[]; expected: unknown; is_visible: boolean }>
): string {
  // Serialize cases with Python-compatible literals
  const casesForPython = normalizedCases.map(tc => ({
    id: tc.id,
    args: tc.args,
    expected: tc.expected,
  }));
  
  const testCasesJson = JSON.stringify(casesForPython);

  return `
import json
import time

# User submitted code
${userCode}

def _convert_json_to_python(val):
    """Convert JSON values to Python types"""
    if val is None:
        return None
    if isinstance(val, bool):
        return val
    if isinstance(val, (int, float)):
        return val
    if isinstance(val, str):
        return val
    if isinstance(val, list):
        return [_convert_json_to_python(x) for x in val]
    if isinstance(val, dict):
        return {k: _convert_json_to_python(v) for k, v in val.items()}
    return val

def _compare_outputs(actual, expected):
    """Compare outputs with type-aware comparison"""
    if actual is None and expected is None:
        return True
    if actual is None or expected is None:
        return False
    
    # Handle numeric comparison with tolerance for floats
    if isinstance(expected, float) or isinstance(actual, float):
        try:
            return abs(float(actual) - float(expected)) < 1e-9
        except (TypeError, ValueError):
            return False
    
    # Handle list/array comparison
    if isinstance(expected, list) and isinstance(actual, list):
        if len(expected) != len(actual):
            return False
        return all(_compare_outputs(a, e) for a, e in zip(actual, expected))
    
    # Handle dict comparison
    if isinstance(expected, dict) and isinstance(actual, dict):
        if set(expected.keys()) != set(actual.keys()):
            return False
        return all(_compare_outputs(actual[k], expected[k]) for k in expected)
    
    # Direct equality
    return actual == expected

def run_tests():
    test_cases = json.loads('''${testCasesJson}''')
    results = []
    
    for tc in test_cases:
        tc_id = tc['id']
        args = [_convert_json_to_python(a) for a in tc['args']]
        expected = _convert_json_to_python(tc['expected'])
        
        result = {
            'id': tc_id,
            'passed': False,
            'actual': None,
            'expected': expected,
            'runtime_ms': 0,
            'error': None
        }
        
        try:
            start_time = time.time()
            actual = ${functionName}(*args)
            end_time = time.time()
            
            result['runtime_ms'] = round((end_time - start_time) * 1000, 2)
            result['actual'] = actual
            result['passed'] = _compare_outputs(actual, expected)
            
        except Exception as e:
            result['error'] = type(e).__name__ + ': ' + str(e)[:200]
        
        results.append(result)
    
    print(json.dumps(results))

if __name__ == "__main__":
    run_tests()
`;
}

function generateJavaScriptCode(
  userCode: string,
  functionName: string,
  normalizedCases: Array<{ id: string | number; args: unknown[]; expected: unknown; is_visible: boolean }>
): string {
  const casesForJS = normalizedCases.map(tc => ({
    id: tc.id,
    args: tc.args,
    expected: tc.expected,
  }));
  
  const testCasesJson = JSON.stringify(casesForJS);

  return `
// User submitted code
${userCode}

function compareOutputs(actual, expected) {
  if (actual === null && expected === null) return true;
  if (actual === null || expected === null) return false;
  if (actual === undefined && expected === undefined) return true;
  if (actual === undefined || expected === undefined) return false;
  
  // Handle numeric comparison with tolerance
  if (typeof expected === 'number' && typeof actual === 'number') {
    if (Number.isNaN(expected) && Number.isNaN(actual)) return true;
    return Math.abs(actual - expected) < 1e-9;
  }
  
  // Handle array comparison
  if (Array.isArray(expected) && Array.isArray(actual)) {
    if (expected.length !== actual.length) return false;
    return expected.every((e, i) => compareOutputs(actual[i], e));
  }
  
  // Handle object comparison
  if (typeof expected === 'object' && typeof actual === 'object') {
    const expectedKeys = Object.keys(expected);
    const actualKeys = Object.keys(actual);
    if (expectedKeys.length !== actualKeys.length) return false;
    return expectedKeys.every(k => compareOutputs(actual[k], expected[k]));
  }
  
  return actual === expected;
}

function runTests() {
  const testCases = ${testCasesJson};
  const results = [];
  
  for (const tc of testCases) {
    const result = {
      id: tc.id,
      passed: false,
      actual: null,
      expected: tc.expected,
      runtime_ms: 0,
      error: null
    };
    
    try {
      const args = tc.args;
      
      const startTime = performance.now();
      const actual = ${functionName}(...args);
      const endTime = performance.now();
      
      result.runtime_ms = Math.round((endTime - startTime) * 100) / 100;
      result.actual = actual;
      result.passed = compareOutputs(actual, tc.expected);
      
    } catch (e) {
      result.error = (e.name || 'Error') + ': ' + (e.message || '').substring(0, 200);
    }
    
    results.push(result);
  }
  
  console.log(JSON.stringify(results));
}

runTests();
`;
}

// =============================================================================
// RESULT PARSING
// =============================================================================

function parseExecutionResults(
  output: string,
  testCases: TestCase[]
): { results: TestCaseResult[]; error?: string } {
  try {
    const jsonMatch = output.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return {
        results: testCases.map(tc => ({
          id: tc.id,
          passed: false,
          is_visible: tc.is_visible ?? true,
          error: 'Failed to parse execution results'
        })),
        error: output.substring(0, 500)
      };
    }
    
    const rawResults = JSON.parse(jsonMatch[0]);
    
    return {
      results: rawResults.map((r: Record<string, unknown>, i: number) => ({
        id: r.id ?? i,
        passed: r.passed as boolean,
        actual_output: r.actual,
        expected_output: r.expected,
        runtime_ms: r.runtime_ms as number,
        error: r.error as string | undefined,
        is_visible: testCases[i]?.is_visible ?? true
      }))
    };
  } catch (e) {
    return {
      results: testCases.map(tc => ({
        id: tc.id,
        passed: false,
        is_visible: tc.is_visible ?? true,
        error: 'Failed to parse execution results'
      })),
      error: `Parse error: ${e instanceof Error ? e.message : 'Unknown error'}`
    };
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: JudgeRequest = await req.json();
    
    const {
      code,
      language,
      function_name,
      parameter_names,
      test_cases,
      time_limit_ms = 5000,
    } = body;

    // Validate required fields
    if (!code || !language || !function_name || !test_cases?.length) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: code, language, function_name, test_cases' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Judging ${language} code for function: ${function_name}`);
    console.log(`Test cases: ${test_cases.length}, Time limit: ${time_limit_ms}ms`);

    // =========================================================================
    // STEP 1: Normalize all inputs BEFORE code generation
    // =========================================================================
    const { normalizedCases, error: normalizationError } = prepareTestCaseInputs(
      test_cases,
      parameter_names || []
    );

    if (normalizationError) {
      // Input conversion failure - return clean error without calling user code
      const response: JudgeResponse = {
        verdict: 'runtime_error',
        passed_count: 0,
        total_count: test_cases.length,
        test_results: test_cases.map(tc => ({
          id: tc.id,
          passed: false,
          is_visible: tc.is_visible ?? true,
          error: 'Invalid input format.'
        })),
        error: 'Invalid input format.',
        total_runtime_ms: 0
      };
      
      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================================
    // STEP 2: Generate execution code with pre-normalized inputs
    // =========================================================================
    let executionCode: string;
    
    if (language === 'python') {
      executionCode = generatePythonCode(code, function_name, normalizedCases);
    } else if (language === 'javascript' || language === 'typescript') {
      executionCode = generateJavaScriptCode(code, function_name, normalizedCases);
    } else {
      return new Response(
        JSON.stringify({ error: `Unsupported language: ${language}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================================
    // STEP 3: Execute via Piston API
    // =========================================================================
    const pistonResponse = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: language === 'typescript' ? 'javascript' : language,
        version: '*',
        files: [{ content: executionCode }],
        run_timeout: time_limit_ms,
      }),
    });

    if (!pistonResponse.ok) {
      const errorText = await pistonResponse.text();
      console.error('Piston API error:', errorText);
      
      const response: JudgeResponse = {
        verdict: 'runtime_error',
        passed_count: 0,
        total_count: test_cases.length,
        test_results: test_cases.map(tc => ({
          id: tc.id,
          passed: false,
          is_visible: tc.is_visible ?? true,
          error: 'Code execution service unavailable'
        })),
        error: 'Code execution service unavailable',
        total_runtime_ms: 0
      };
      
      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pistonResult = await pistonResponse.json();
    console.log('Piston result:', JSON.stringify(pistonResult).substring(0, 500));

    // Check for compilation errors (non-Python)
    if (pistonResult.compile?.stderr && language !== 'python') {
      const response: JudgeResponse = {
        verdict: 'compilation_error',
        passed_count: 0,
        total_count: test_cases.length,
        test_results: test_cases.map(tc => ({
          id: tc.id,
          passed: false,
          is_visible: tc.is_visible ?? true,
          error: pistonResult.compile.stderr.substring(0, 500)
        })),
        error: pistonResult.compile.stderr.substring(0, 500),
        total_runtime_ms: 0
      };
      
      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for timeout
    if (pistonResult.run?.signal === 'SIGKILL' || pistonResult.run?.code === 137) {
      const response: JudgeResponse = {
        verdict: 'time_limit_exceeded',
        passed_count: 0,
        total_count: test_cases.length,
        test_results: test_cases.map(tc => ({
          id: tc.id,
          passed: false,
          is_visible: tc.is_visible ?? true,
          error: 'Time Limit Exceeded'
        })),
        error: 'Execution exceeded time limit',
        total_runtime_ms: time_limit_ms
      };
      
      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get output
    const stdout = pistonResult.run?.stdout || '';
    const stderr = pistonResult.run?.stderr || '';

    // Only treat stderr as runtime error if there's NO valid JSON output
    if (stderr && !stdout.trim()) {
      const response: JudgeResponse = {
        verdict: 'runtime_error',
        passed_count: 0,
        total_count: test_cases.length,
        test_results: test_cases.map(tc => ({
          id: tc.id,
          passed: false,
          is_visible: tc.is_visible ?? true,
          error: stderr.substring(0, 500)
        })),
        error: stderr.substring(0, 500),
        total_runtime_ms: 0
      };
      
      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================================
    // STEP 4: Parse results
    // =========================================================================
    const { results: testResults, error: parseError } = parseExecutionResults(stdout, test_cases);

    const passedCount = testResults.filter(r => r.passed).length;
    const totalCount = testResults.length;
    const hasRuntimeError = testResults.some(r => r.error && !r.passed);
    const totalRuntime = testResults.reduce((sum, r) => sum + (r.runtime_ms || 0), 0);

    let verdict: Verdict;
    if (parseError) {
      verdict = 'runtime_error';
    } else if (passedCount === totalCount) {
      verdict = 'accepted';
    } else if (hasRuntimeError) {
      verdict = 'runtime_error';
    } else {
      verdict = 'wrong_answer';
    }

    const response: JudgeResponse = {
      verdict,
      passed_count: passedCount,
      total_count: totalCount,
      test_results: testResults,
      error: parseError,
      total_runtime_ms: Math.round(totalRuntime * 100) / 100
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to judge code';
    console.error('Error judging code:', error);
    
    return new Response(
      JSON.stringify({ 
        verdict: 'runtime_error',
        passed_count: 0,
        total_count: 0,
        test_results: [],
        error: errorMessage,
        total_runtime_ms: 0
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
