import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { useNotesSyncBridge } from "@/hooks/useNotesSyncBridge";

interface UseLessonNotesOptions {
  lessonId: string | undefined;
  courseId: string | undefined;
  userId: string | undefined;
}

export function useLessonNotes({ lessonId, courseId, userId }: UseLessonNotesOptions) {
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [noteId, setNoteId] = useState<string | null>(null);
  const debouncedContent = useDebounce(content, 1000);
  const initialLoadRef = useRef(true);
  const isRemoteUpdateRef = useRef(false);
  const lastSavedContentRef = useRef<string>("");
  const contentRef = useRef<string>("");
  const pendingRemoteUpdateRef = useRef<{ content: string; updatedAt: string } | null>(null);

  // Keep a ref of the latest content for conflict checks inside callbacks
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  // Handle remote updates from other tabs (Deep Notes)
  const handleRemoteUpdate = useCallback((remoteContent: string, updatedAt: string) => {
    // CRITICAL: Ignore if we're still loading to prevent race conditions
    if (initialLoadRef.current) return;

    // SAFETY: Never overwrite unsaved local edits (prevents "content disappears" while typing)
    // If the user is actively editing, queue the remote update and apply it only after
    // local content is saved (or returns to a non-dirty state).
    const isDirty = contentRef.current !== lastSavedContentRef.current;
    if (isDirty) {
      const existing = pendingRemoteUpdateRef.current;
      const existingTime = existing ? new Date(existing.updatedAt).getTime() : 0;
      const incomingTime = new Date(updatedAt).getTime();

      if (!existing || incomingTime > existingTime) {
        pendingRemoteUpdateRef.current = { content: remoteContent, updatedAt };
      }
      setIsSyncing(true);
      return;
    }
    
    // Mark that this is a remote update to prevent broadcast echo
    isRemoteUpdateRef.current = true;
    setContent(remoteContent);
    lastSavedContentRef.current = remoteContent;
    setLastSaved(new Date(updatedAt));
    setIsSyncing(false);
    
    // Reset flag after state update
    setTimeout(() => {
      isRemoteUpdateRef.current = false;
    }, 100);
  }, []);

  // Apply any queued remote update once we are no longer dirty
  useEffect(() => {
    if (initialLoadRef.current) return;
    if (isRemoteUpdateRef.current) return;

    const pending = pendingRemoteUpdateRef.current;
    if (!pending) return;

    const isDirty = contentRef.current !== lastSavedContentRef.current;
    if (isDirty) return;

    pendingRemoteUpdateRef.current = null;
    isRemoteUpdateRef.current = true;
    setContent(pending.content);
    lastSavedContentRef.current = pending.content;
    setLastSaved(new Date(pending.updatedAt));
    setIsSyncing(false);

    setTimeout(() => {
      isRemoteUpdateRef.current = false;
    }, 100);
  }, [content]);

  // Handle note created in other tab
  const handleNoteCreated = useCallback((newNoteId: string, newLessonId: string) => {
    // Ignore if loading to prevent race conditions
    if (initialLoadRef.current) return;
    
    if (newLessonId === lessonId) {
      setNoteId(newNoteId);
      setIsSyncing(false);
    }
  }, [lessonId]);

  // Handle note deleted in other tab
  const handleNoteDeleted = useCallback((deletedNoteId: string) => {
    if (noteId === deletedNoteId) {
      setNoteId(null);
      setContent("");
      lastSavedContentRef.current = "";
      setLastSaved(null);
    }
  }, [noteId]);

  // Set up cross-tab sync bridge - use state-based noteId for reactivity
  const { broadcastUpdate, broadcastCreated, updateLocalTimestamp } = useNotesSyncBridge({
    noteId,
    lessonId,
    courseId,
    userId,
    source: 'quick-notes',
    onRemoteUpdate: handleRemoteUpdate,
    onNoteCreated: handleNoteCreated,
    onNoteDeleted: handleNoteDeleted,
  });

  // Reset state immediately when lessonId changes to prevent stale data
  useEffect(() => {
    // Reset everything before loading new note
    initialLoadRef.current = true;
    setNoteId(null);
    setContent("");
    lastSavedContentRef.current = "";
    setLastSaved(null);
    
    if (!lessonId || !userId) {
      setIsLoading(false);
      return;
    }

    const loadNote = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("lesson_notes")
          .select("id, content, updated_at")
          .eq("lesson_id", lessonId)
          .eq("user_id", userId)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setNoteId(data.id);
          setContent(data.content || "");
          lastSavedContentRef.current = data.content || "";
          setLastSaved(new Date(data.updated_at));
          // Initialize the sync bridge with the loaded timestamp
          updateLocalTimestamp(data.updated_at);
        } else {
          // Explicitly keep empty state for non-existent notes
          setNoteId(null);
          setContent("");
          lastSavedContentRef.current = "";
          setLastSaved(null);
        }
      } catch (error) {
        console.error("Error loading lesson note:", error);
        // On error, ensure clean state
        setNoteId(null);
        setContent("");
        lastSavedContentRef.current = "";
      } finally {
        setIsLoading(false);
        initialLoadRef.current = false;
      }
    };

    loadNote();
  }, [lessonId, userId, updateLocalTimestamp]);

  // Auto-save on debounced content change
  useEffect(() => {
    if (initialLoadRef.current || !lessonId || !courseId || !userId) return;
    if (debouncedContent === "" && !noteId) return; // Don't save empty new notes
    
    // Skip save if this was a remote update (already saved by the other tab)
    if (isRemoteUpdateRef.current) return;
    
    // Skip if content hasn't actually changed from last save
    if (debouncedContent === lastSavedContentRef.current) return;

    const saveNote = async () => {
      setIsSaving(true);
      const now = new Date().toISOString();
      
      try {
        if (noteId) {
          // Update existing note
          const { error } = await supabase
            .from("lesson_notes")
            .update({ content: debouncedContent, updated_at: now })
            .eq("id", noteId);

          if (error) throw error;
        } else if (debouncedContent.trim()) {
          // Create new lesson-contextual note
          const { data, error } = await supabase
            .from("lesson_notes")
            .insert({
              user_id: userId,
              lesson_id: lessonId,
              course_id: courseId,
              content: debouncedContent,
              entity_type: "lesson", // Required: lesson-contextual note
            })
            .select("id")
            .single();

          if (error) throw error;
          setNoteId(data.id);
          
          // Broadcast note creation to other tabs
          broadcastCreated(data.id, lessonId);
        }
        
        lastSavedContentRef.current = debouncedContent;
        setLastSaved(new Date());
        
        // Broadcast update to other tabs (Deep Notes) with timestamp
        broadcastUpdate(debouncedContent, now);
      } catch (error) {
        console.error("Error saving lesson note:", error);
      } finally {
        setIsSaving(false);
      }
    };

    saveNote();
  }, [debouncedContent, lessonId, courseId, userId, noteId, broadcastUpdate, broadcastCreated]);

  const updateContent = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

  return {
    content,
    updateContent,
    isSaving,
    isSyncing,
    lastSaved,
    isLoading,
    noteId,
  };
}

export default useLessonNotes;
