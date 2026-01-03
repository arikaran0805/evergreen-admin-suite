import { useEffect, useRef, useCallback } from 'react';

const DRAFT_PREFIX = 'lovable_draft_';
const DEBOUNCE_MS = 1000;

export function useAutoSaveDraft(key: string, value: string, enabled: boolean = true) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>('');

  // Save draft to localStorage with debounce
  const saveDraft = useCallback((content: string) => {
    if (!enabled || !key) return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (content !== lastSavedRef.current && content.trim()) {
        try {
          localStorage.setItem(`${DRAFT_PREFIX}${key}`, content);
          lastSavedRef.current = content;
        } catch (e) {
          console.warn('Failed to save draft:', e);
        }
      }
    }, DEBOUNCE_MS);
  }, [key, enabled]);

  // Auto-save on value change
  useEffect(() => {
    if (value) {
      saveDraft(value);
    }
  }, [value, saveDraft]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Load draft from localStorage
  const loadDraft = useCallback((): string | null => {
    if (!key) return null;
    try {
      return localStorage.getItem(`${DRAFT_PREFIX}${key}`);
    } catch (e) {
      console.warn('Failed to load draft:', e);
      return null;
    }
  }, [key]);

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    if (!key) return;
    try {
      localStorage.removeItem(`${DRAFT_PREFIX}${key}`);
      lastSavedRef.current = '';
    } catch (e) {
      console.warn('Failed to clear draft:', e);
    }
  }, [key]);

  return { loadDraft, clearDraft, saveDraft };
}
