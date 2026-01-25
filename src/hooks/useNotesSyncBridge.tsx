/**
 * useNotesSyncBridge - Cross-tab synchronization for Notes
 * 
 * Uses BroadcastChannel API to sync note content between Quick Notes (inline)
 * and Deep Notes (new tab) in real-time. Both surfaces share ONE source of truth.
 * 
 * Features:
 * - Real-time content sync across tabs
 * - Timestamp-based conflict resolution (newer always wins)
 * - Prevents stale content display
 * - Silent sync (no UI interruption)
 * 
 * SAFETY: This hook implements timestamp validation to prevent older content
 * from overwriting newer content during race conditions.
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
  const lastBroadcastTimeRef = useRef<string>('');
  const localTimestampRef = useRef<string>('');
  const tabId = getTabId();

  // Keep refs in sync with latest values to avoid stale closures
  const noteIdRef = useRef(noteId);
  const lessonIdRef = useRef(lessonId);
  const courseIdRef = useRef(courseId);
  const userIdRef = useRef(userId);
  const onRemoteUpdateRef = useRef(onRemoteUpdate);
  const onNoteCreatedRef = useRef(onNoteCreated);
  const onNoteDeletedRef = useRef(onNoteDeleted);

  // Update refs when values change
  useEffect(() => {
    noteIdRef.current = noteId;
    lessonIdRef.current = lessonId;
    courseIdRef.current = courseId;
    userIdRef.current = userId;
    onRemoteUpdateRef.current = onRemoteUpdate;
    onNoteCreatedRef.current = onNoteCreated;
    onNoteDeletedRef.current = onNoteDeleted;
  }, [noteId, lessonId, courseId, userId, onRemoteUpdate, onNoteCreated, onNoteDeleted]);

  /**
   * CRITICAL: Track when we last saved locally to prevent applying
   * older remote updates that arrive after our save.
   */
  const updateLocalTimestamp = useCallback((timestamp: string) => {
    localTimestampRef.current = timestamp;
  }, []);

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
      
      // Ignore messages for different user/course
      if (message.userId !== userIdRef.current || message.courseId !== courseIdRef.current) return;

      switch (message.type) {
        case 'NOTE_UPDATED':
          // Only update if it's for the same note we're viewing
          // Use ref to get current noteId (avoids stale closure)
          if (message.noteId === noteIdRef.current && message.lessonId === lessonIdRef.current) {
            // Prevent echo: don't apply if we just broadcast this content
            if (message.content === lastBroadcastRef.current && message.updatedAt === lastBroadcastTimeRef.current) {
              return;
            }

            // CRITICAL SAFETY CHECK: Timestamp-based conflict resolution
            // Only apply remote update if it's NEWER than our last local save
            const remoteTime = new Date(message.updatedAt).getTime();
            const localTime = localTimestampRef.current ? new Date(localTimestampRef.current).getTime() : 0;
            
            if (remoteTime > localTime) {
              // Remote is newer, apply it
              onRemoteUpdateRef.current?.(message.content || '', message.updatedAt);
              // Update our local timestamp to reflect we now have this content
              localTimestampRef.current = message.updatedAt;
            } else {
              // Our local content is newer or same, ignore remote update
              console.debug('[NotesSyncBridge] Ignored older remote update', {
                remoteTime: message.updatedAt,
                localTime: localTimestampRef.current,
              });
            }
          }
          break;

        case 'NOTE_CREATED':
          if (message.lessonId === lessonIdRef.current) {
            onNoteCreatedRef.current?.(message.noteId, message.lessonId);
          }
          break;

        case 'NOTE_DELETED':
          if (message.noteId === noteIdRef.current || message.lessonId === lessonIdRef.current) {
            onNoteDeletedRef.current?.(message.noteId);
          }
          break;

        case 'REQUEST_SYNC':
          // Another tab is requesting current state - could implement if needed
          break;
      }
    };

    channelRef.current.addEventListener('message', handleMessage);

    return () => {
      channelRef.current?.removeEventListener('message', handleMessage);
      channelRef.current?.close();
      channelRef.current = null;
    };
  }, [tabId]); // Only depend on tabId which never changes

  /**
   * Broadcast a note update to other tabs
   * IMPORTANT: Call this AFTER saving to database with the actual saved timestamp
   */
  const broadcastUpdate = useCallback((content: string, updatedAt?: string) => {
    const currentNoteId = noteIdRef.current;
    const currentLessonId = lessonIdRef.current;
    const currentCourseId = courseIdRef.current;
    const currentUserId = userIdRef.current;
    
    if (!channelRef.current || !currentNoteId || !currentLessonId || !currentCourseId || !currentUserId) return;

    const timestamp = updatedAt || new Date().toISOString();

    const message: NoteSyncMessage = {
      type: 'NOTE_UPDATED',
      noteId: currentNoteId,
      lessonId: currentLessonId,
      courseId: currentCourseId,
      userId: currentUserId,
      content,
      updatedAt: timestamp,
      source,
      tabId,
    };

    // Track last broadcast to prevent echo AND track timestamp for conflict resolution
    lastBroadcastRef.current = content;
    lastBroadcastTimeRef.current = timestamp;
    localTimestampRef.current = timestamp;
    
    channelRef.current.postMessage(message);
  }, [source, tabId]);

  /**
   * Broadcast that a new note was created
   */
  const broadcastCreated = useCallback((newNoteId: string, newLessonId: string) => {
    const currentCourseId = courseIdRef.current;
    const currentUserId = userIdRef.current;
    
    if (!channelRef.current || !currentCourseId || !currentUserId) return;

    const message: NoteSyncMessage = {
      type: 'NOTE_CREATED',
      noteId: newNoteId,
      lessonId: newLessonId,
      courseId: currentCourseId,
      userId: currentUserId,
      updatedAt: new Date().toISOString(),
      source,
      tabId,
    };

    channelRef.current.postMessage(message);
  }, [source, tabId]);

  /**
   * Broadcast that a note was deleted
   */
  const broadcastDeleted = useCallback((deletedNoteId: string, deletedLessonId: string) => {
    const currentCourseId = courseIdRef.current;
    const currentUserId = userIdRef.current;
    
    if (!channelRef.current || !currentCourseId || !currentUserId) return;

    const message: NoteSyncMessage = {
      type: 'NOTE_DELETED',
      noteId: deletedNoteId,
      lessonId: deletedLessonId,
      courseId: currentCourseId,
      userId: currentUserId,
      updatedAt: new Date().toISOString(),
      source,
      tabId,
    };

    channelRef.current.postMessage(message);
  }, [source, tabId]);

  return {
    broadcastUpdate,
    broadcastCreated,
    broadcastDeleted,
    updateLocalTimestamp,
    isSupported: typeof BroadcastChannel !== 'undefined',
  };
}

export default useNotesSyncBridge;
