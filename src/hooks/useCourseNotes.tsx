import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";

interface LessonNote {
  id: string;
  lesson_id: string;
  course_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  lesson_title?: string;
}

interface UseCourseNotesOptions {
  courseId: string | undefined;
  userId: string | undefined;
}

export function useCourseNotes({ courseId, userId }: UseCourseNotesOptions) {
  const [notes, setNotes] = useState<LessonNote[]>([]);
  const [selectedNote, setSelectedNote] = useState<LessonNote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editContent, setEditContent] = useState("");
  const debouncedContent = useDebounce(editContent, 1000);

  // Load all notes for this course
  const loadNotes = useCallback(async () => {
    if (!courseId || !userId) return;

    setIsLoading(true);
    try {
      // Fetch notes with lesson titles
      const { data: notesData, error: notesError } = await supabase
        .from("lesson_notes")
        .select("id, lesson_id, course_id, content, created_at, updated_at")
        .eq("course_id", courseId)
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (notesError) throw notesError;

      if (notesData && notesData.length > 0) {
        // Fetch lesson titles for these notes
        const lessonIds = [...new Set(notesData.map(n => n.lesson_id))];
        const { data: postsData } = await supabase
          .from("posts")
          .select("id, title")
          .in("id", lessonIds);

        const lessonTitleMap = new Map(postsData?.map(p => [p.id, p.title]) || []);

        const enrichedNotes = notesData.map(note => ({
          ...note,
          lesson_title: lessonTitleMap.get(note.lesson_id) || "Unknown Lesson",
        }));

        setNotes(enrichedNotes);
        
        // Select first note by default
        if (enrichedNotes.length > 0 && !selectedNote) {
          setSelectedNote(enrichedNotes[0]);
          setEditContent(enrichedNotes[0].content);
        }
      } else {
        setNotes([]);
        setSelectedNote(null);
        setEditContent("");
      }
    } catch (error) {
      console.error("Error loading course notes:", error);
    } finally {
      setIsLoading(false);
    }
  }, [courseId, userId]);

  // Initial load
  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Select a note
  const selectNote = useCallback((note: LessonNote) => {
    setSelectedNote(note);
    setEditContent(note.content);
  }, []);

  // Auto-save when content changes
  useEffect(() => {
    if (!selectedNote || debouncedContent === selectedNote.content) return;

    const saveNote = async () => {
      setIsSaving(true);
      try {
        const { error } = await supabase
          .from("lesson_notes")
          .update({ content: debouncedContent, updated_at: new Date().toISOString() })
          .eq("id", selectedNote.id);

        if (error) throw error;

        // Update local state
        setNotes(prev => 
          prev.map(n => 
            n.id === selectedNote.id 
              ? { ...n, content: debouncedContent, updated_at: new Date().toISOString() } 
              : n
          )
        );
        setSelectedNote(prev => prev ? { ...prev, content: debouncedContent } : null);
      } catch (error) {
        console.error("Error saving note:", error);
      } finally {
        setIsSaving(false);
      }
    };

    saveNote();
  }, [debouncedContent, selectedNote]);

  // Delete a note
  const deleteNote = useCallback(async (noteId: string) => {
    try {
      const { error } = await supabase
        .from("lesson_notes")
        .delete()
        .eq("id", noteId);

      if (error) throw error;

      setNotes(prev => prev.filter(n => n.id !== noteId));
      
      if (selectedNote?.id === noteId) {
        const remaining = notes.filter(n => n.id !== noteId);
        if (remaining.length > 0) {
          setSelectedNote(remaining[0]);
          setEditContent(remaining[0].content);
        } else {
          setSelectedNote(null);
          setEditContent("");
        }
      }

      return true;
    } catch (error) {
      console.error("Error deleting note:", error);
      return false;
    }
  }, [selectedNote, notes]);

  return {
    notes,
    selectedNote,
    editContent,
    isLoading,
    isSaving,
    selectNote,
    setEditContent,
    deleteNote,
    refreshNotes: loadNotes,
  };
}

export default useCourseNotes;
