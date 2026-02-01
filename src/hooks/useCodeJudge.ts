import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Verdict types matching the edge function
export type Verdict = 'accepted' | 'wrong_answer' | 'runtime_error' | 'time_limit_exceeded' | 'compilation_error';

export interface TestCaseInput {
  id: string | number;
  inputs: Record<string, unknown>;
  expected_output: unknown;
  is_visible?: boolean;
}

export interface TestCaseResult {
  id: string | number;
  passed: boolean;
  actual_output?: unknown;
  expected_output?: unknown;
  runtime_ms?: number;
  error?: string;
  is_visible: boolean;
}

export interface JudgeResponse {
  verdict: Verdict;
  passed_count: number;
  total_count: number;
  test_results: TestCaseResult[];
  error?: string;
  total_runtime_ms: number;
}

interface JudgeRequest {
  code: string;
  language: string;
  function_name: string;
  parameter_names: string[];
  test_cases: TestCaseInput[];
  time_limit_ms?: number;
}

export function useCodeJudge() {
  const [isJudging, setIsJudging] = useState(false);
  const [result, setResult] = useState<JudgeResponse | null>(null);

  const judge = async (request: JudgeRequest): Promise<JudgeResponse> => {
    setIsJudging(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('judge-code', {
        body: request
      });

      if (error) {
        const errorResponse: JudgeResponse = {
          verdict: 'runtime_error',
          passed_count: 0,
          total_count: request.test_cases.length,
          test_results: request.test_cases.map(tc => ({
            id: tc.id,
            passed: false,
            is_visible: tc.is_visible ?? true,
            error: error.message
          })),
          error: error.message,
          total_runtime_ms: 0
        };
        setResult(errorResponse);
        return errorResponse;
      }

      const judgeResult = data as JudgeResponse;
      setResult(judgeResult);
      return judgeResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const errorResponse: JudgeResponse = {
        verdict: 'runtime_error',
        passed_count: 0,
        total_count: request.test_cases.length,
        test_results: request.test_cases.map(tc => ({
          id: tc.id,
          passed: false,
          is_visible: tc.is_visible ?? true,
          error: errorMessage
        })),
        error: errorMessage,
        total_runtime_ms: 0
      };
      setResult(errorResponse);
      return errorResponse;
    } finally {
      setIsJudging(false);
    }
  };

  const reset = () => {
    setResult(null);
  };

  return {
    judge,
    isJudging,
    result,
    reset
  };
}

// Helper to convert database test cases to judge format
export function convertTestCasesToJudgeFormat(
  testCases: Array<{
    id?: string | number;
    input: string;
    expected_output?: string;
    is_visible?: boolean;
  }>,
  parameterNames: string[]
): TestCaseInput[] {
  return testCases.map((tc, index) => {
    // Parse the input string which contains variable assignments
    // e.g., "nums = [2,7,11,15]\ntarget = 9"
    const inputs: Record<string, unknown> = {};
    
    // Try to parse input as structured data
    const lines = tc.input.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      const match = line.match(/^(\w+)\s*=\s*(.+)$/);
      if (match) {
        const [, paramName, valueStr] = match;
        try {
          // Try to parse as JSON
          inputs[paramName] = JSON.parse(valueStr.trim());
        } catch {
          // If not valid JSON, try Python-style conversion
          const cleanValue = valueStr.trim()
            .replace(/'/g, '"') // Python strings
            .replace(/True/g, 'true')
            .replace(/False/g, 'false')
            .replace(/None/g, 'null');
          try {
            inputs[paramName] = JSON.parse(cleanValue);
          } catch {
            // Store as string if all else fails
            inputs[paramName] = valueStr.trim();
          }
        }
      }
    }

    // Parse expected output
    let expected: unknown = tc.expected_output;
    if (typeof tc.expected_output === 'string') {
      try {
        expected = JSON.parse(tc.expected_output.trim()
          .replace(/'/g, '"')
          .replace(/True/g, 'true')
          .replace(/False/g, 'false')
          .replace(/None/g, 'null'));
      } catch {
        expected = tc.expected_output.trim();
      }
    }

    return {
      id: tc.id ?? index,
      inputs,
      expected_output: expected,
      is_visible: tc.is_visible ?? true
    };
  });
}

// Get verdict display info
export function getVerdictDisplay(verdict: Verdict): {
  label: string;
  color: string;
  bgColor: string;
} {
  switch (verdict) {
    case 'accepted':
      return {
        label: 'Accepted',
        color: 'text-green-500',
        bgColor: 'bg-green-500/10'
      };
    case 'wrong_answer':
      return {
        label: 'Wrong Answer',
        color: 'text-red-500',
        bgColor: 'bg-red-500/10'
      };
    case 'runtime_error':
      return {
        label: 'Runtime Error',
        color: 'text-red-500',
        bgColor: 'bg-red-500/10'
      };
    case 'time_limit_exceeded':
      return {
        label: 'Time Limit Exceeded',
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/10'
      };
    case 'compilation_error':
      return {
        label: 'Compilation Error',
        color: 'text-red-500',
        bgColor: 'bg-red-500/10'
      };
    default:
      return {
        label: 'Unknown',
        color: 'text-muted-foreground',
        bgColor: 'bg-muted'
      };
  }
}
