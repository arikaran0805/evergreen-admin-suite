import { useState, useEffect, useCallback } from "react";

export interface Submission {
  id: string;
  code: string;
  language: string;
  status: "accepted" | "wrong_answer" | "runtime_error" | "time_limit_exceeded" | "compilation_error";
  passed_count: number;
  total_count: number;
  runtime_ms: number;
  submitted_at: string;
}

const STORAGE_KEY_PREFIX = "problem_submissions_";
const LAST_CODE_PREFIX = "problem_last_code_";

export function useProblemSubmissions(problemId: string | undefined) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [lastSubmittedCode, setLastSubmittedCode] = useState<{ code: string; language: string } | null>(null);

  // Load submissions from localStorage
  useEffect(() => {
    if (!problemId) return;
    
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${problemId}`);
    if (stored) {
      try {
        setSubmissions(JSON.parse(stored));
      } catch {
        setSubmissions([]);
      }
    }

    const lastCode = localStorage.getItem(`${LAST_CODE_PREFIX}${problemId}`);
    if (lastCode) {
      try {
        setLastSubmittedCode(JSON.parse(lastCode));
      } catch {
        setLastSubmittedCode(null);
      }
    }
  }, [problemId]);

  const addSubmission = useCallback((submission: Omit<Submission, "id" | "submitted_at">) => {
    if (!problemId) return;

    const newSubmission: Submission = {
      ...submission,
      id: crypto.randomUUID(),
      submitted_at: new Date().toISOString(),
    };

    setSubmissions((prev) => {
      const updated = [newSubmission, ...prev].slice(0, 20); // Keep last 20 submissions
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${problemId}`, JSON.stringify(updated));
      return updated;
    });

    // Save last submitted code
    const lastCode = { code: submission.code, language: submission.language };
    setLastSubmittedCode(lastCode);
    localStorage.setItem(`${LAST_CODE_PREFIX}${problemId}`, JSON.stringify(lastCode));

    return newSubmission;
  }, [problemId]);

  const getLastSubmittedCode = useCallback(() => {
    return lastSubmittedCode;
  }, [lastSubmittedCode]);

  return {
    submissions,
    addSubmission,
    lastSubmittedCode,
    getLastSubmittedCode,
  };
}
