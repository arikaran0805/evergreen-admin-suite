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
  const debouncedContent = useDebounce(content, 1000);
  const initialLoadRef = useRef(true);
  const noteIdRef = useRef<string | null>(null);
  const isRemoteUpdateRef = useRef(false);

  // Handle remote updates from other tabs (Deep Notes)
  const handleRemoteUpdate = useCallback((remoteContent: string, updatedAt: string) => {
    // Mark that this is a remote update to prevent broadcast echo
    isRemoteUpdateRef.current = true;
    setContent(remoteContent);
    setLastSaved(new Date(updatedAt));
    setIsSyncing(false);
    
    // Reset flag after state update
    setTimeout(() => {
      isRemoteUpdateRef.current = false;
    }, 100);
  }, []);

  // Handle note created in other tab
  const handleNoteCreated = useCallback((newNoteId: string, newLessonId: string) => {
    if (newLessonId === lessonId) {
      noteIdRef.current = newNoteId;
      setIsSyncing(false);
    }
  }, [lessonId]);

  // Handle note deleted in other tab
  const handleNoteDeleted = useCallback((deletedNoteId: string) => {
    if (noteIdRef.current === deletedNoteId) {
      noteIdRef.current = null;
      setContent("");
      setLastSaved(null);
    }
  }, []);

  // Set up cross-tab sync bridge
  const { broadcastUpdate, broadcastCreated } = useNotesSyncBridge({
    noteId: noteIdRef.current,
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
    noteIdRef.current = null;
    setContent("");
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
          noteIdRef.current = data.id;
          setContent(data.content || "");
          setLastSaved(new Date(data.updated_at));
        } else {
          // Explicitly keep empty state for non-existent notes
          noteIdRef.current = null;
          setContent("");
          setLastSaved(null);
        }
      } catch (error) {
        console.error("Error loading lesson note:", error);
        // On error, ensure clean state
        noteIdRef.current = null;
        setContent("");
      } finally {
        setIsLoading(false);
        initialLoadRef.current = false;
      }
    };

    loadNote();
  }, [lessonId, userId]);

  // Auto-save on debounced content change
  useEffect(() => {
    if (initialLoadRef.current || !lessonId || !courseId || !userId) return;
    if (debouncedContent === "" && !noteIdRef.current) return; // Don't save empty new notes
    
    // Skip save if this was a remote update (already saved by the other tab)
    if (isRemoteUpdateRef.current) return;

    const saveNote = async () => {
      setIsSaving(true);
      const now = new Date().toISOString();
      
      try {
        if (noteIdRef.current) {
          // Update existing note
          const { error } = await supabase
            .from("lesson_notes")
            .update({ content: debouncedContent, updated_at: now })
            .eq("id", noteIdRef.current);

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
          noteIdRef.current = data.id;
          
          // Broadcast note creation to other tabs
          broadcastCreated(data.id, lessonId);
        }
        
        setLastSaved(new Date());
        
        // Broadcast update to other tabs (Deep Notes)
        broadcastUpdate(debouncedContent, now);
      } catch (error) {
        console.error("Error saving lesson note:", error);
      } finally {
        setIsSaving(false);
      }
    };

    saveNote();
  }, [debouncedContent, lessonId, courseId, userId, broadcastUpdate, broadcastCreated]);

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
    noteId: noteIdRef.current,
  };
}

export default useLessonNotes;
