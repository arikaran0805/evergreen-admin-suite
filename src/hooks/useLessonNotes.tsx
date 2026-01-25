import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";

interface UseLessonNotesOptions {
  lessonId: string | undefined;
  courseId: string | undefined;
  userId: string | undefined;
}

export function useLessonNotes({ lessonId, courseId, userId }: UseLessonNotesOptions) {
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const debouncedContent = useDebounce(content, 1000);
  const initialLoadRef = useRef(true);
  const noteIdRef = useRef<string | null>(null);

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

    const saveNote = async () => {
      setIsSaving(true);
      try {
        if (noteIdRef.current) {
          // Update existing note
          const { error } = await supabase
            .from("lesson_notes")
            .update({ content: debouncedContent, updated_at: new Date().toISOString() })
            .eq("id", noteIdRef.current);

          if (error) throw error;
        } else if (debouncedContent.trim()) {
          // Create new note
          const { data, error } = await supabase
            .from("lesson_notes")
            .insert({
              user_id: userId,
              lesson_id: lessonId,
              course_id: courseId,
              content: debouncedContent,
            })
            .select("id")
            .single();

          if (error) throw error;
          noteIdRef.current = data.id;
        }
        setLastSaved(new Date());
      } catch (error) {
        console.error("Error saving lesson note:", error);
      } finally {
        setIsSaving(false);
      }
    };

    saveNote();
  }, [debouncedContent, lessonId, courseId, userId]);

  const updateContent = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

  return {
    content,
    updateContent,
    isSaving,
    lastSaved,
    isLoading,
  };
}

export default useLessonNotes;
