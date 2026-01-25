import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { useNotesSyncBridge } from "@/hooks/useNotesSyncBridge";

export interface CourseNote {
  id: string;
  lesson_id: string | null;
  course_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  entity_type: 'lesson' | 'user';
  title: string | null;
  // Derived display title
  display_title: string;
}

interface UseCourseNotesOptions {
  courseId: string | undefined;
  userId: string | undefined;
}

export function useCourseNotes({ courseId, userId }: UseCourseNotesOptions) {
  const [notes, setNotes] = useState<CourseNote[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const debouncedContent = useDebounce(editContent, 1000);
  const isRemoteUpdateRef = useRef(false);
  const lastSavedContentRef = useRef<string>("");

  // Derive selectedNote from notes array to avoid stale state
  const selectedNote = notes.find(n => n.id === selectedNoteId) || null;

  // Handle remote updates from other tabs (Quick Notes)
  const handleRemoteUpdate = useCallback((remoteContent: string, updatedAt: string) => {
    isRemoteUpdateRef.current = true;
    setEditContent(remoteContent);
    lastSavedContentRef.current = remoteContent;
    
    setNotes(prev => 
      prev.map(n => 
        n.id === selectedNoteId 
          ? { ...n, content: remoteContent, updated_at: updatedAt } 
          : n
      )
    );
    
    setIsSyncing(false);
    
    setTimeout(() => {
      isRemoteUpdateRef.current = false;
    }, 100);
  }, [selectedNoteId]);

  // Handle note created in other tab
  const handleNoteCreated = useCallback(async (newNoteId: string, lessonId: string) => {
    if (!courseId || !userId) return;
    
    const { data, error } = await supabase
      .from("lesson_notes")
      .select("id, lesson_id, course_id, content, created_at, updated_at, entity_type, title")
      .eq("id", newNoteId)
      .single();

    if (error || !data) return;

    let displayTitle = data.title || "Untitled note";
    
    // If it's a lesson note, fetch the lesson title
    if (data.entity_type === 'lesson' && data.lesson_id) {
      const { data: postData } = await supabase
        .from("posts")
        .select("title")
        .eq("id", data.lesson_id)
        .maybeSingle();
      
      if (postData?.title) {
        displayTitle = postData.title;
      }
    }

    const newNote: CourseNote = {
      ...data,
      entity_type: data.entity_type as 'lesson' | 'user',
      display_title: displayTitle,
    };

    setNotes(prev => {
      if (prev.some(n => n.id === newNoteId)) return prev;
      return [newNote, ...prev];
    });
    
    setIsSyncing(false);
  }, [courseId, userId]);

  // Handle note deleted in other tab
  const handleNoteDeleted = useCallback((deletedNoteId: string) => {
    setNotes(prev => prev.filter(n => n.id !== deletedNoteId));
    
    if (selectedNoteId === deletedNoteId) {
      setSelectedNoteId(null);
      setEditContent("");
    }
  }, [selectedNoteId]);

  // Set up cross-tab sync bridge
  const { broadcastUpdate, broadcastCreated, broadcastDeleted } = useNotesSyncBridge({
    noteId: selectedNoteId,
    lessonId: selectedNote?.lesson_id || undefined,
    courseId,
    userId,
    source: 'deep-notes',
    onRemoteUpdate: handleRemoteUpdate,
    onNoteCreated: handleNoteCreated,
    onNoteDeleted: handleNoteDeleted,
  });

  // Load all notes for this course
  const loadNotes = useCallback(async () => {
    if (!courseId || !userId) return;

    setIsLoading(true);
    try {
      const { data: notesData, error: notesError } = await supabase
        .from("lesson_notes")
        .select("id, lesson_id, course_id, content, created_at, updated_at, entity_type, title")
        .eq("course_id", courseId)
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (notesError) throw notesError;

      if (notesData && notesData.length > 0) {
        // Fetch lesson titles for lesson-type notes
        const lessonIds = notesData
          .filter(n => n.entity_type === 'lesson' && n.lesson_id)
          .map(n => n.lesson_id as string);
        
        let lessonTitleMap = new Map<string, string>();
        
        if (lessonIds.length > 0) {
          const { data: postsData } = await supabase
            .from("posts")
            .select("id, title")
            .in("id", lessonIds);
          
          lessonTitleMap = new Map(postsData?.map(p => [p.id, p.title]) || []);
        }

        const enrichedNotes: CourseNote[] = notesData.map(note => {
          let displayTitle = note.title || "Untitled note";
          
          if (note.entity_type === 'lesson' && note.lesson_id) {
            displayTitle = lessonTitleMap.get(note.lesson_id) || "Unknown Lesson";
          }
          
          return {
            ...note,
            entity_type: note.entity_type as 'lesson' | 'user',
            display_title: displayTitle,
          };
        });

        setNotes(enrichedNotes);
        
        if (!selectedNoteId) {
          setSelectedNoteId(enrichedNotes[0].id);
          setEditContent(enrichedNotes[0].content);
          lastSavedContentRef.current = enrichedNotes[0].content;
        }
      } else {
        setNotes([]);
        setSelectedNoteId(null);
        setEditContent("");
        lastSavedContentRef.current = "";
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
  const selectNote = useCallback((note: CourseNote) => {
    setSelectedNoteId(note.id);
    setEditContent(note.content);
    lastSavedContentRef.current = note.content;
  }, []);

  // Auto-save when content changes
  useEffect(() => {
    if (!selectedNoteId || !selectedNote) return;
    if (debouncedContent === lastSavedContentRef.current) return;
    if (isRemoteUpdateRef.current) return;

    const saveNote = async () => {
      setIsSaving(true);
      const now = new Date().toISOString();
      
      try {
        const { error } = await supabase
          .from("lesson_notes")
          .update({ content: debouncedContent, updated_at: now })
          .eq("id", selectedNoteId);

        if (error) throw error;

        lastSavedContentRef.current = debouncedContent;

        setNotes(prev => 
          prev.map(n => 
            n.id === selectedNoteId 
              ? { ...n, content: debouncedContent, updated_at: now } 
              : n
          )
        );
        
        broadcastUpdate(debouncedContent, now);
      } catch (error) {
        console.error("Error saving note:", error);
      } finally {
        setIsSaving(false);
      }
    };

    saveNote();
  }, [debouncedContent, selectedNoteId, selectedNote, broadcastUpdate]);

  /**
   * Create a new user-created note (not linked to any lesson)
   * This is the default behavior for "+ New note"
   */
  const createUserNote = useCallback(async (title?: string) => {
    if (!courseId || !userId) return null;

    try {
      const noteTitle = title || "Untitled note";
      
      const { data, error } = await supabase
        .from("lesson_notes")
        .insert({
          user_id: userId,
          lesson_id: null, // No lesson link
          course_id: courseId,
          content: "",
          entity_type: "user",
          title: noteTitle,
        })
        .select("id, lesson_id, course_id, content, created_at, updated_at, entity_type, title")
        .single();

      if (error) throw error;

      const newNote: CourseNote = {
        ...data,
        entity_type: 'user',
        display_title: noteTitle,
      };

      setNotes(prev => [newNote, ...prev]);
      setSelectedNoteId(newNote.id);
      setEditContent("");
      lastSavedContentRef.current = "";
      
      // Broadcast with empty lessonId for user notes
      broadcastCreated(newNote.id, "");

      return newNote;
    } catch (error) {
      console.error("Error creating user note:", error);
      return null;
    }
  }, [courseId, userId, broadcastCreated]);

  /**
   * Create a contextual note linked to a lesson
   * Used by Quick Notes when user starts typing in a lesson
   */
  const createLessonNote = useCallback(async (lessonId: string, lessonTitle: string) => {
    if (!courseId || !userId) return null;

    try {
      const { data, error } = await supabase
        .from("lesson_notes")
        .insert({
          user_id: userId,
          lesson_id: lessonId,
          course_id: courseId,
          content: "",
          entity_type: "lesson",
          title: null, // Uses lesson title instead
        })
        .select("id, lesson_id, course_id, content, created_at, updated_at, entity_type, title")
        .single();

      if (error) throw error;

      const newNote: CourseNote = {
        ...data,
        entity_type: 'lesson',
        display_title: lessonTitle,
      };

      setNotes(prev => [newNote, ...prev]);
      setSelectedNoteId(newNote.id);
      setEditContent("");
      lastSavedContentRef.current = "";
      
      broadcastCreated(newNote.id, lessonId);

      return newNote;
    } catch (error) {
      console.error("Error creating lesson note:", error);
      return null;
    }
  }, [courseId, userId, broadcastCreated]);

  // Update note title (only for user-created notes)
  const updateNoteTitle = useCallback(async (noteId: string, newTitle: string) => {
    try {
      const { error } = await supabase
        .from("lesson_notes")
        .update({ title: newTitle, updated_at: new Date().toISOString() })
        .eq("id", noteId);

      if (error) throw error;

      setNotes(prev => 
        prev.map(n => 
          n.id === noteId 
            ? { ...n, title: newTitle, display_title: newTitle } 
            : n
        )
      );

      return true;
    } catch (error) {
      console.error("Error updating note title:", error);
      return false;
    }
  }, []);

  // Delete a note
  const deleteNote = useCallback(async (noteId: string) => {
    const noteToDelete = notes.find(n => n.id === noteId);
    
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
          lastSavedContentRef.current = remaining[0].content;
        } else {
          setSelectedNoteId(null);
          setEditContent("");
          lastSavedContentRef.current = "";
        }
      }
      
      if (noteToDelete) {
        broadcastDeleted(noteId, noteToDelete.lesson_id || "");
      }

      return true;
    } catch (error) {
      console.error("Error deleting note:", error);
      return false;
    }
  }, [selectedNoteId, notes, broadcastDeleted]);

  // Get lessons that don't have notes yet (for lesson-linking feature)
  const getAvailableLessons = useCallback(async () => {
    if (!courseId) return [];

    try {
      const { data: courseLessons } = await supabase
        .from("course_lessons")
        .select("id, title")
        .eq("course_id", courseId)
        .is("deleted_at", null)
        .order("lesson_rank", { ascending: true });

      // Filter out lessons that already have notes
      const existingLessonIds = new Set(
        notes.filter(n => n.entity_type === 'lesson').map(n => n.lesson_id)
      );
      
      const available = (courseLessons || []).filter(l => !existingLessonIds.has(l.id));

      return available;
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
    isSyncing,
    selectNote,
    setEditContent,
    createUserNote,
    createLessonNote,
    updateNoteTitle,
    deleteNote,
    getAvailableLessons,
    refreshNotes: loadNotes,
  };
}

export default useCourseNotes;
