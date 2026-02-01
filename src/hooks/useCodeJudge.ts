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

// Helper to parse a value string (handles JSON, Python literals, etc.)
function parseValue(valueStr: string): unknown {
  const trimmed = valueStr.trim();
  
  // Try direct JSON parse first
  try {
    return JSON.parse(trimmed);
  } catch {
    // Try Python-style conversion
    const cleanValue = trimmed
      .replace(/'/g, '"') // Python strings use single quotes
      .replace(/\bTrue\b/g, 'true')
      .replace(/\bFalse\b/g, 'false')
      .replace(/\bNone\b/g, 'null');
    
    try {
      return JSON.parse(cleanValue);
    } catch {
      // Return as string if all else fails
      return trimmed;
    }
  }
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
    const inputs: Record<string, unknown> = {};
    const inputStr = tc.input.trim();
    
    // Try to parse input as structured data with variable assignments
    // e.g., "nums = [2,7,11,15]\ntarget = 9"
    const lines = inputStr.split('\n').filter(line => line.trim());
    let hasAssignments = false;
    
    for (const line of lines) {
      const match = line.match(/^(\w+)\s*=\s*(.+)$/);
      if (match) {
        hasAssignments = true;
        const [, paramName, valueStr] = match;
        inputs[paramName] = parseValue(valueStr.trim());
      }
    }
    
    // If no assignments found, try to parse as raw value(s)
    // Handle single parameter case: input is just the value like "[2, 4, 6]"
    if (!hasAssignments && parameterNames.length > 0) {
      if (parameterNames.length === 1) {
        // Single parameter - entire input is the value
        inputs[parameterNames[0]] = parseValue(inputStr);
      } else {
        // Multiple parameters - try to parse as comma-separated or JSON array
        try {
          // Try parsing as JSON array first
          const parsed = JSON.parse(inputStr);
          if (Array.isArray(parsed) && parsed.length === parameterNames.length) {
            parameterNames.forEach((name, i) => {
              inputs[name] = parsed[i];
            });
          }
        } catch {
          // Try splitting by newlines or commas
          const values = lines.length === parameterNames.length 
            ? lines 
            : inputStr.split(',').map(v => v.trim());
          
          parameterNames.forEach((name, i) => {
            if (values[i] !== undefined) {
              inputs[name] = parseValue(values[i]);
            }
          });
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
