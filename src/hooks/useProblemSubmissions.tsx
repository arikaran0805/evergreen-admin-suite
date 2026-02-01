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
const LAST_SUBMITTED_PREFIX = "problem_last_submitted_";

export function useProblemSubmissions(problemId: string | undefined) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);

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

    // Save last submitted code per language
    const lastCode = { 
      code: submission.code, 
      language: submission.language,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(`${LAST_SUBMITTED_PREFIX}${problemId}_${submission.language}`, JSON.stringify(lastCode));

    return newSubmission;
  }, [problemId]);

  // Get last submitted code for a specific language
  const getLastSubmittedCode = useCallback((language?: string) => {
    if (!problemId) return null;
    
    // If language specified, get for that language
    if (language) {
      try {
        const stored = localStorage.getItem(`${LAST_SUBMITTED_PREFIX}${problemId}_${language}`);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch {
        // Ignore
      }
      return null;
    }
    
    // If no language, get from most recent submission
    if (submissions.length > 0) {
      const latest = submissions[0];
      return { code: latest.code, language: latest.language };
    }
    
    return null;
  }, [problemId, submissions]);

  return {
    submissions,
    addSubmission,
    getLastSubmittedCode,
  };
}
