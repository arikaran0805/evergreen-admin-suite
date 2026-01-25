/**
 * useNotesTabManager - Manages single Notes tab per course
 * 
 * Prevents multiple Notes tabs from opening for the same course.
 * Uses window.name for tab identification and cross-tab communication.
 */

import { useCallback, useEffect, useRef } from 'react';

// Prefix for notes tab window names
const NOTES_TAB_PREFIX = 'lovable-notes-';

// Storage key for tracking open notes tabs
const NOTES_TAB_REGISTRY_KEY = 'lovable-notes-tabs';

interface NotesTabInfo {
  courseId: string;
  openedAt: number;
}

/**
 * Get the registry of open notes tabs from sessionStorage
 */
function getTabRegistry(): Record<string, NotesTabInfo> {
  try {
    const data = sessionStorage.getItem(NOTES_TAB_REGISTRY_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

/**
 * Update the registry of open notes tabs
 */
function updateTabRegistry(registry: Record<string, NotesTabInfo>) {
  try {
    sessionStorage.setItem(NOTES_TAB_REGISTRY_KEY, JSON.stringify(registry));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Hook for opening Notes in a managed tab (used by CourseDetail)
 */
export function useNotesTabOpener(courseId: string | undefined) {
  const notesWindowRef = useRef<Window | null>(null);

  // Clean up stale registry entries on mount
  useEffect(() => {
    // Cleanup stale entries (older than 1 hour)
    const registry = getTabRegistry();
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    let hasChanges = false;
    
    Object.entries(registry).forEach(([tabId, info]) => {
      if (info.openedAt < oneHourAgo) {
        delete registry[tabId];
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      updateTabRegistry(registry);
    }
  }, []);

  /**
   * Open or focus the Notes tab for this course
   * Returns true if opened/focused successfully
   */
  const openNotesTab = useCallback(() => {
    if (!courseId) return false;

    const tabId = `${NOTES_TAB_PREFIX}${courseId}`;
    const notesUrl = `/courses/${courseId}/notes`;

    // Try to focus existing window if we have a reference
    if (notesWindowRef.current && !notesWindowRef.current.closed) {
      try {
        notesWindowRef.current.focus();
        return true;
      } catch {
        // Window reference is invalid, continue to open new
        notesWindowRef.current = null;
      }
    }

    // Try to open with a named window (browser will focus if same name exists)
    const newWindow = window.open(notesUrl, tabId, 'noopener');
    
    if (newWindow) {
      notesWindowRef.current = newWindow;
      
      // Register this tab
      const registry = getTabRegistry();
      registry[tabId] = {
        courseId,
        openedAt: Date.now(),
      };
      updateTabRegistry(registry);
    }

    return true;
  }, [courseId]);

  return { openNotesTab, notesWindowRef };
}

/**
 * Hook for registering a Notes tab (used by CourseNotes page)
 * Sets window.name and listens for focus messages
 */
export function useNotesTabRegistration(courseId: string | undefined) {
  useEffect(() => {
    if (!courseId) return;

    // Set window name for tab identification
    const tabId = `${NOTES_TAB_PREFIX}${courseId}`;
    window.name = tabId;

    // Register in storage
    const registry = getTabRegistry();
    registry[tabId] = {
      courseId,
      openedAt: Date.now(),
    };
    updateTabRegistry(registry);

    // Cleanup on unmount
    return () => {
      const registry = getTabRegistry();
      delete registry[tabId];
      updateTabRegistry(registry);
    };
  }, [courseId]);

  /**
   * Focus the opener (course) tab if available
   */
  const focusOpenerTab = useCallback(() => {
    if (window.opener && !window.opener.closed) {
      try {
        window.opener.focus();
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }, []);

  /**
   * Close this tab and focus opener
   */
  const closeAndFocusOpener = useCallback(() => {
    if (window.opener && !window.opener.closed) {
      try {
        window.opener.focus();
        window.close();
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }, []);

  return { focusOpenerTab, closeAndFocusOpener };
}
