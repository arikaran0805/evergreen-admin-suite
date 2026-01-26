/**
 * CourseNotes - Dedicated Notes Workspace Page
 * 
 * Opens in a new tab from the Course Detail page.
 * Renders NotesFocusMode in full isolation without course chrome.
 * 
 * CRITICAL: Listens for context-switch messages to display the correct note
 * when opened from different lessons/contexts.
 */

import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { NotesFocusMode } from "@/components/notes";
import { useNotesTabRegistration } from "@/hooks/useNotesTabManager";

interface CourseInfo {
  id: string;
  name: string;
  slug: string;
}

const CourseNotes = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Context switch state - when we receive a message to switch to a specific note
  const [switchContext, setSwitchContext] = useState<{
    noteId?: string;
    lessonId?: string;
    entityType?: string;
  } | null>(null);

  // Handle context switch messages from other tabs
  const handleSwitchNote = useCallback((options: { noteId?: string; lessonId?: string; entityType?: string }) => {
    setSwitchContext(options);
  }, []);

  // Register this tab for single-tab-per-course management
  // Pass the switch handler to receive context-switch messages
  const { closeAndFocusOpener } = useNotesTabRegistration(courseId, handleSwitchNote);

  // Fetch course info
  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) return;
      
      const { data, error } = await supabase
        .from("courses")
        .select("id, name, slug")
        .eq("id", courseId)
        .single();
      
      if (error || !data) {
        console.error("Failed to fetch course:", error);
        navigate("/courses");
        return;
      }
      
      setCourse(data);
      setLoading(false);
    };

    fetchCourse();
  }, [courseId, navigate]);

  // Update document title
  useEffect(() => {
    if (course) {
      document.title = `Notes — ${course.name}`;
    }
    return () => {
      document.title = "Lovable"; // Reset on unmount
    };
  }, [course]);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { state: { from: `/courses/${courseId}/notes` } });
    }
  }, [authLoading, user, courseId, navigate]);

  // Handle back to course - try to focus existing tab or navigate
  const handleBackToCourse = () => {
    if (course?.slug) {
      // Try to close this tab and go back to opener
      if (closeAndFocusOpener()) {
        return; // Successfully closed and focused opener
      }
      // Fallback: navigate in current tab
      navigate(`/course/${course.slug}`);
    }
  };

  // Handle navigate to lesson - open in course tab
  const handleNavigateToLesson = async (lessonId: string) => {
    if (!course?.slug) return;
    
    // Fetch the lesson slug for proper navigation
    const { data: lesson } = await supabase
      .from("posts")
      .select("slug")
      .eq("id", lessonId)
      .single();
    
    const lessonSlug = lesson?.slug;
    
    // Try to use opener window
    if (window.opener && !window.opener.closed) {
      // Post message to opener to navigate to lesson
      window.opener.postMessage(
        { type: "NAVIGATE_TO_LESSON", lessonId, lessonSlug, courseSlug: course.slug },
        window.location.origin
      );
      window.opener.focus();
    } else if (lessonSlug) {
      // Fallback: open course with lesson slug in current tab
      navigate(`/course/${course.slug}?lesson=${lessonSlug}&tab=lessons`);
    } else {
      // Ultimate fallback: just go to lessons tab
      navigate(`/course/${course.slug}?tab=lessons`);
    }
  };

  if (loading || authLoading || !course || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading notes...</div>
      </div>
    );
  }

  return (
    <NotesFocusMode
      courseId={course.id}
      userId={user.id}
      courseName={course.name}
      onExit={handleBackToCourse}
      onNavigateToLesson={handleNavigateToLesson}
      isStandalonePage
      switchToContext={switchContext}
      onContextSwitched={() => setSwitchContext(null)}
    />
  );
};

export default CourseNotes;
