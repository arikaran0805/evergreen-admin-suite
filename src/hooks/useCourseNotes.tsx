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
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editContent, setEditContent] = useState("");
  const debouncedContent = useDebounce(editContent, 1000);

  // Derive selectedNote from notes array to avoid stale state
  const selectedNote = notes.find(n => n.id === selectedNoteId) || null;

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
        
        // Select first note by default if none selected
        if (!selectedNoteId) {
          setSelectedNoteId(enrichedNotes[0].id);
          setEditContent(enrichedNotes[0].content);
        }
      } else {
        setNotes([]);
        setSelectedNoteId(null);
        setEditContent("");
      }
    } catch (error) {
      console.error("Error loading course notes:", error);
    } finally {
      setIsLoading(false);
    }
  }, [courseId, userId, selectedNoteId]);

  // Initial load
  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Select a note - update ID and sync content
  const selectNote = useCallback((note: LessonNote) => {
    setSelectedNoteId(note.id);
    setEditContent(note.content);
  }, []);

  // Auto-save when content changes (only for the selected note)
  useEffect(() => {
    if (!selectedNoteId || !selectedNote) return;
    if (debouncedContent === selectedNote.content) return;

    const saveNote = async () => {
      setIsSaving(true);
      try {
        const { error } = await supabase
          .from("lesson_notes")
          .update({ content: debouncedContent, updated_at: new Date().toISOString() })
          .eq("id", selectedNoteId);

        if (error) throw error;

        // Update the note in local state
        setNotes(prev => 
          prev.map(n => 
            n.id === selectedNoteId 
              ? { ...n, content: debouncedContent, updated_at: new Date().toISOString() } 
              : n
          )
        );
      } catch (error) {
        console.error("Error saving note:", error);
      } finally {
        setIsSaving(false);
      }
    };

    saveNote();
  }, [debouncedContent, selectedNoteId, selectedNote]);

  // Create a new note for a lesson
  const createNote = useCallback(async (lessonId: string, lessonTitle: string) => {
    if (!courseId || !userId) return null;

    try {
      const { data, error } = await supabase
        .from("lesson_notes")
        .insert({
          user_id: userId,
          lesson_id: lessonId,
          course_id: courseId,
          content: "",
        })
        .select("id, lesson_id, course_id, content, created_at, updated_at")
        .single();

      if (error) throw error;

      const newNote: LessonNote = {
        ...data,
        lesson_title: lessonTitle,
      };

      // Add to top of list and select it
      setNotes(prev => [newNote, ...prev]);
      setSelectedNoteId(newNote.id);
      setEditContent("");

      return newNote;
    } catch (error) {
      console.error("Error creating note:", error);
      return null;
    }
  }, [courseId, userId]);

  // Delete a note
  const deleteNote = useCallback(async (noteId: string) => {
    try {
      const { error } = await supabase
        .from("lesson_notes")
        .delete()
        .eq("id", noteId);

      if (error) throw error;

      const remaining = notes.filter(n => n.id !== noteId);
      setNotes(remaining);
      
      if (selectedNoteId === noteId) {
        if (remaining.length > 0) {
          setSelectedNoteId(remaining[0].id);
          setEditContent(remaining[0].content);
        } else {
          setSelectedNoteId(null);
          setEditContent("");
        }
      }

      return true;
    } catch (error) {
      console.error("Error deleting note:", error);
      return false;
    }
  }, [selectedNoteId, notes]);

  // Get lessons that don't have notes yet
  const getAvailableLessons = useCallback(async () => {
    if (!courseId) return [];

    try {
      // Get all lessons for this course
      const { data: lessons } = await supabase
        .from("posts")
        .select("id, title, lesson_id")
        .not("lesson_id", "is", null)
        .order("created_at", { ascending: true });

      // Get course lessons
      const { data: courseLessons } = await supabase
        .from("course_lessons")
        .select("id, title")
        .eq("course_id", courseId)
        .is("deleted_at", null)
        .order("lesson_rank", { ascending: true });

      // Filter out lessons that already have notes
      const existingLessonIds = new Set(notes.map(n => n.lesson_id));
      
      // Use posts that are lessons for this course
      const lessonPosts = lessons?.filter(l => l.lesson_id && courseLessons?.some(cl => cl.id === l.lesson_id)) || [];
      
      // Also include course_lessons entries
      const allLessons = [
        ...(courseLessons || []).map(cl => ({ id: cl.id, title: cl.title })),
      ].filter(l => !existingLessonIds.has(l.id));

      return allLessons;
    } catch (error) {
      console.error("Error fetching available lessons:", error);
      return [];
    }
  }, [courseId, notes]);

  return {
    notes,
    selectedNote,
    editContent,
    isLoading,
    isSaving,
    selectNote,
    setEditContent,
    createNote,
    deleteNote,
    getAvailableLessons,
    refreshNotes: loadNotes,
  };
}

export default useCourseNotes;
