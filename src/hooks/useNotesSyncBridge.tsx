/**
 * useNotesSyncBridge - Cross-tab synchronization for Notes
 * 
 * Uses BroadcastChannel API to sync note content between Quick Notes (inline)
 * and Deep Notes (new tab) in real-time. Both surfaces share ONE source of truth.
 * 
 * Features:
 * - Real-time content sync across tabs
 * - Last-write-wins conflict resolution
 * - Prevents stale content display
 * - Silent sync (no UI interruption)
 */

import { useEffect, useRef, useCallback } from 'react';

const NOTES_SYNC_CHANNEL = 'lovable-notes-sync';

export interface NoteSyncMessage {
  type: 'NOTE_UPDATED' | 'NOTE_CREATED' | 'NOTE_DELETED' | 'REQUEST_SYNC';
  noteId: string;
  lessonId: string;
  courseId: string;
  userId: string;
  content?: string;
  updatedAt: string;
  source: 'quick-notes' | 'deep-notes';
  tabId: string;
}

interface UseNotesSyncBridgeOptions {
  noteId: string | null;
  lessonId: string | undefined;
  courseId: string | undefined;
  userId: string | undefined;
  source: 'quick-notes' | 'deep-notes';
  onRemoteUpdate?: (content: string, updatedAt: string) => void;
  onNoteCreated?: (noteId: string, lessonId: string) => void;
  onNoteDeleted?: (noteId: string) => void;
}

// Generate unique tab ID
const getTabId = () => {
  if (!window.__notesSyncTabId) {
    window.__notesSyncTabId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
  return window.__notesSyncTabId;
};

// Extend Window interface for tab ID
declare global {
  interface Window {
    __notesSyncTabId?: string;
  }
}

export function useNotesSyncBridge({
  noteId,
  lessonId,
  courseId,
  userId,
  source,
  onRemoteUpdate,
  onNoteCreated,
  onNoteDeleted,
}: UseNotesSyncBridgeOptions) {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const lastBroadcastRef = useRef<string>('');
  const tabId = getTabId();

  // Initialize BroadcastChannel
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') {
      console.warn('[NotesSyncBridge] BroadcastChannel not supported');
      return;
    }

    channelRef.current = new BroadcastChannel(NOTES_SYNC_CHANNEL);

    const handleMessage = (event: MessageEvent<NoteSyncMessage>) => {
      const message = event.data;
      
      // Ignore messages from self
      if (message.tabId === tabId) return;
      
      // Ignore messages for different user/course/lesson
      if (message.userId !== userId || message.courseId !== courseId) return;

      switch (message.type) {
        case 'NOTE_UPDATED':
          // Only update if it's for the same note we're viewing
          if (message.noteId === noteId && message.lessonId === lessonId) {
            // Prevent echo: don't apply if we just broadcast this content
            if (message.content !== lastBroadcastRef.current) {
              onRemoteUpdate?.(message.content || '', message.updatedAt);
            }
          }
          break;

        case 'NOTE_CREATED':
          if (message.lessonId === lessonId) {
            onNoteCreated?.(message.noteId, message.lessonId);
          }
          break;

        case 'NOTE_DELETED':
          if (message.noteId === noteId || message.lessonId === lessonId) {
            onNoteDeleted?.(message.noteId);
          }
          break;

        case 'REQUEST_SYNC':
          // Another tab is requesting current state - ignore for now
          // Could implement if needed for complex sync scenarios
          break;
      }
    };

    channelRef.current.addEventListener('message', handleMessage);

    return () => {
      channelRef.current?.removeEventListener('message', handleMessage);
      channelRef.current?.close();
      channelRef.current = null;
    };
  }, [noteId, lessonId, courseId, userId, tabId, onRemoteUpdate, onNoteCreated, onNoteDeleted]);

  /**
   * Broadcast a note update to other tabs
   */
  const broadcastUpdate = useCallback((content: string, updatedAt?: string) => {
    if (!channelRef.current || !noteId || !lessonId || !courseId || !userId) return;

    const message: NoteSyncMessage = {
      type: 'NOTE_UPDATED',
      noteId,
      lessonId,
      courseId,
      userId,
      content,
      updatedAt: updatedAt || new Date().toISOString(),
      source,
      tabId,
    };

    // Track last broadcast to prevent echo
    lastBroadcastRef.current = content;
    channelRef.current.postMessage(message);
  }, [noteId, lessonId, courseId, userId, source, tabId]);

  /**
   * Broadcast that a new note was created
   */
  const broadcastCreated = useCallback((newNoteId: string, newLessonId: string) => {
    if (!channelRef.current || !courseId || !userId) return;

    const message: NoteSyncMessage = {
      type: 'NOTE_CREATED',
      noteId: newNoteId,
      lessonId: newLessonId,
      courseId,
      userId,
      updatedAt: new Date().toISOString(),
      source,
      tabId,
    };

    channelRef.current.postMessage(message);
  }, [courseId, userId, source, tabId]);

  /**
   * Broadcast that a note was deleted
   */
  const broadcastDeleted = useCallback((deletedNoteId: string, deletedLessonId: string) => {
    if (!channelRef.current || !courseId || !userId) return;

    const message: NoteSyncMessage = {
      type: 'NOTE_DELETED',
      noteId: deletedNoteId,
      lessonId: deletedLessonId,
      courseId,
      userId,
      updatedAt: new Date().toISOString(),
      source,
      tabId,
    };

    channelRef.current.postMessage(message);
  }, [courseId, userId, source, tabId]);

  return {
    broadcastUpdate,
    broadcastCreated,
    broadcastDeleted,
    isSupported: typeof BroadcastChannel !== 'undefined',
  };
}

export default useNotesSyncBridge;
