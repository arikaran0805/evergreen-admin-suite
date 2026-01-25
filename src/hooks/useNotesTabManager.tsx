/**
 * useNotesTabManager - Manages single Notes tab per course
 * 
 * Prevents multiple Notes tabs from opening for the same course.
 * Uses BroadcastChannel for cross-tab communication and context switching.
 * 
 * CRITICAL: When Deep Notes is already open and user opens from a different
 * context (lesson, post, etc), the existing tab MUST switch to show that note.
 */

import { useCallback, useEffect, useRef } from 'react';

// Prefix for notes tab window names
const NOTES_TAB_PREFIX = 'lovable-notes-';

// Storage key for tracking open notes tabs
const NOTES_TAB_REGISTRY_KEY = 'lovable-notes-tabs';

// Broadcast channel for context switching
const NOTES_CONTEXT_CHANNEL = 'lovable-notes-context';

export interface NotesContextMessage {
  type: 'SWITCH_NOTE' | 'FOCUS_NOTE';
  courseId: string;
  noteId?: string;
  lessonId?: string;
  entityType?: 'lesson' | 'user' | 'post' | 'comment';
  timestamp: number;
}

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
 * Supports context switching - if tab exists, sends message to switch note
 */
export function useNotesTabOpener(courseId: string | undefined) {
  const notesWindowRef = useRef<Window | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Initialize broadcast channel
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    
    channelRef.current = new BroadcastChannel(NOTES_CONTEXT_CHANNEL);
    
    return () => {
      channelRef.current?.close();
      channelRef.current = null;
    };
  }, []);

  // Clean up stale registry entries on mount
  useEffect(() => {
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
   * Open or focus the Notes tab for this course.
   * If noteId/lessonId provided, will switch to that note in existing tab.
   */
  const openNotesTab = useCallback((options?: {
    noteId?: string;
    lessonId?: string;
    entityType?: 'lesson' | 'user' | 'post' | 'comment';
  }) => {
    if (!courseId) return false;

    const tabId = `${NOTES_TAB_PREFIX}${courseId}`;
    const notesUrl = `/courses/${courseId}/notes`;

    // Try to focus existing window if we have a reference
    if (notesWindowRef.current && !notesWindowRef.current.closed) {
      try {
        notesWindowRef.current.focus();
        
        // Send context switch message if we have a specific note to show
        if (options?.noteId || options?.lessonId) {
          channelRef.current?.postMessage({
            type: 'SWITCH_NOTE',
            courseId,
            noteId: options.noteId,
            lessonId: options.lessonId,
            entityType: options.entityType,
            timestamp: Date.now(),
          } as NotesContextMessage);
        }
        
        return true;
      } catch {
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
      
      // If opening with specific context, send message after small delay
      // to give the new tab time to set up its listener
      if (options?.noteId || options?.lessonId) {
        setTimeout(() => {
          channelRef.current?.postMessage({
            type: 'SWITCH_NOTE',
            courseId,
            noteId: options.noteId,
            lessonId: options.lessonId,
            entityType: options.entityType,
            timestamp: Date.now(),
          } as NotesContextMessage);
        }, 500);
      }
    }

    return true;
  }, [courseId]);

  return { openNotesTab, notesWindowRef };
}

/**
 * Hook for registering a Notes tab (used by CourseNotes page)
 * Listens for context switch messages to change active note
 */
export function useNotesTabRegistration(
  courseId: string | undefined,
  onSwitchNote?: (options: { noteId?: string; lessonId?: string; entityType?: string }) => void
) {
  const channelRef = useRef<BroadcastChannel | null>(null);

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

    // Set up broadcast channel listener for context switching
    if (typeof BroadcastChannel !== 'undefined') {
      channelRef.current = new BroadcastChannel(NOTES_CONTEXT_CHANNEL);
      
      const handleMessage = (event: MessageEvent<NotesContextMessage>) => {
        const message = event.data;
        
        // Only handle messages for this course
        if (message.courseId !== courseId) return;
        
        if (message.type === 'SWITCH_NOTE' && onSwitchNote) {
          onSwitchNote({
            noteId: message.noteId,
            lessonId: message.lessonId,
            entityType: message.entityType,
          });
        }
      };
      
      channelRef.current.addEventListener('message', handleMessage);
    }

    // Cleanup on unmount
    return () => {
      const registry = getTabRegistry();
      delete registry[tabId];
      updateTabRegistry(registry);
      
      channelRef.current?.close();
      channelRef.current = null;
    };
  }, [courseId, onSwitchNote]);

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
