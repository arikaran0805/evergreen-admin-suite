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
  inputs: Record<string, unknown>; // Structured inputs { paramName: value }
  expected_output: unknown;
  is_visible?: boolean;
}

interface JudgeRequest {
  code: string;
  language: string;
  function_name: string;
  parameter_names: string[];
  test_cases: TestCase[];
  time_limit_ms?: number; // Default 5000ms
  memory_limit_mb?: number; // Default 256MB
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

// Generate execution wrapper based on language
function generateExecutionCode(
  userCode: string,
  language: string,
  functionName: string,
  parameterNames: string[],
  testCases: TestCase[]
): string {
  if (language === 'python') {
    return generatePythonCode(userCode, functionName, parameterNames, testCases);
  } else if (language === 'javascript' || language === 'typescript') {
    return generateJavaScriptCode(userCode, functionName, parameterNames, testCases);
  }
  
  throw new Error(`Unsupported language: ${language}`);
}

function generatePythonCode(
  userCode: string,
  functionName: string,
  parameterNames: string[],
  testCases: TestCase[]
): string {
  const testCasesJson = JSON.stringify(testCases.map(tc => ({
    id: tc.id,
    inputs: tc.inputs,
    expected: tc.expected_output
  })));

  return `
import json
import sys
import time
import traceback

# User submitted code
${userCode}

def compare_outputs(actual, expected):
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
        return all(compare_outputs(a, e) for a, e in zip(actual, expected))
    
    # Handle dict comparison (order independent)
    if isinstance(expected, dict) and isinstance(actual, dict):
        if set(expected.keys()) != set(actual.keys()):
            return False
        return all(compare_outputs(actual[k], expected[k]) for k in expected)
    
    # Handle set comparison
    if isinstance(expected, set) and isinstance(actual, set):
        return expected == actual
    
    # Direct equality for primitives
    return actual == expected

def run_tests():
    test_cases = json.loads('''${testCasesJson}''')
    results = []
    
    for tc in test_cases:
        tc_id = tc['id']
        inputs = tc['inputs']
        expected = tc['expected']
        
        result = {
            'id': tc_id,
            'passed': False,
            'actual': None,
            'expected': expected,
            'runtime_ms': 0,
            'error': None
        }
        
        try:
            # Build arguments in correct order
            args = [inputs.get(p) for p in ${JSON.stringify(parameterNames)}]
            
            start_time = time.time()
            actual = ${functionName}(*args)
            end_time = time.time()
            
            result['runtime_ms'] = round((end_time - start_time) * 1000, 2)
            result['actual'] = actual
            result['passed'] = compare_outputs(actual, expected)
            
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
  parameterNames: string[],
  testCases: TestCase[]
): string {
  const testCasesJson = JSON.stringify(testCases.map(tc => ({
    id: tc.id,
    inputs: tc.inputs,
    expected: tc.expected_output
  })));

  return `
// User submitted code
${userCode}

function compareOutputs(actual, expected) {
  if (actual === null && expected === null) return true;
  if (actual === null || expected === null) return false;
  if (actual === undefined && expected === undefined) return true;
  if (actual === undefined || expected === undefined) return false;
  
  // Handle numeric comparison with tolerance for floats
  if (typeof expected === 'number' && typeof actual === 'number') {
    if (Number.isNaN(expected) && Number.isNaN(actual)) return true;
    return Math.abs(actual - expected) < 1e-9;
  }
  
  // Handle array comparison
  if (Array.isArray(expected) && Array.isArray(actual)) {
    if (expected.length !== actual.length) return false;
    return expected.every((e, i) => compareOutputs(actual[i], e));
  }
  
  // Handle object comparison (order independent)
  if (typeof expected === 'object' && typeof actual === 'object') {
    const expectedKeys = Object.keys(expected);
    const actualKeys = Object.keys(actual);
    if (expectedKeys.length !== actualKeys.length) return false;
    return expectedKeys.every(k => compareOutputs(actual[k], expected[k]));
  }
  
  // Direct equality for primitives
  return actual === expected;
}

function runTests() {
  const testCases = ${testCasesJson};
  const paramNames = ${JSON.stringify(parameterNames)};
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
      const args = paramNames.map(p => tc.inputs[p]);
      
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

// Parse Piston API response and extract results
function parseExecutionResults(
  output: string,
  testCases: TestCase[]
): { results: TestCaseResult[]; error?: string } {
  try {
    // Try to parse JSON results
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
      results: rawResults.map((r: any, i: number) => ({
        id: r.id ?? i,
        passed: r.passed,
        actual_output: r.actual,
        expected_output: r.expected,
        runtime_ms: r.runtime_ms,
        error: r.error,
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

serve(async (req) => {
  // Handle CORS preflight requests
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

    // Generate execution code
    const executionCode = generateExecutionCode(
      code,
      language,
      function_name,
      parameter_names || [],
      test_cases
    );

    // Execute via Piston API
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

    // Check for compilation errors
    if (pistonResult.compile?.stderr) {
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
    const output = stdout + (stderr ? '\n' + stderr : '');

    // Check for runtime errors in stderr
    if (stderr && !stdout.includes('[')) {
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

    // Parse results
    const { results: testResults, error: parseError } = parseExecutionResults(output, test_cases);

    // Determine verdict
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
