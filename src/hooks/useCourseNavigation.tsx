import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";

// Session storage key for career flow tracking (same as useUserState)
const ENTRY_FLOW_KEY = "lovable_entry_flow";

/**
 * Role- & Progress-Aware Course Navigation Hook
 * 
 * This hook provides deterministic, predictable course entry routing based on:
 * - User role (Admin, Super Moderator, Senior Moderator, Moderator → Course Info)
 * - Course progress (0% → Course Details, >0% → Lessons tab)
 * - Entry flow (career_flow vs global for header rendering)
 * 
 * Resume behavior is EXPLICIT ONLY - triggered by separate handleResume function.
 */
export const useCourseNavigation = () => {
  const navigate = useNavigate();
  const { userId, isAdmin, isSuperModerator, isSeniorModerator, isModerator, isLoading: roleLoading } = useUserRole();

  /**
   * Check if user has any management role
   */
  const isManagementRole = isAdmin || isSuperModerator || isSeniorModerator || isModerator;

  /**
   * Mark navigation as career flow (immersive mode - no global header)
   */
  const markAsCareerFlow = useCallback(() => {
    sessionStorage.setItem(ENTRY_FLOW_KEY, "career_flow");
  }, []);

  /**
   * Clear career flow (return to global mode with global header)
   */
  const clearCareerFlow = useCallback(() => {
    sessionStorage.removeItem(ENTRY_FLOW_KEY);
  }, []);

  /**
   * Get course progress for a specific course
   */
  const getCourseProgress = useCallback(async (courseId: string): Promise<number> => {
    if (!userId) return 0;

    try {
      // Get total lessons count
      const { count: totalLessons } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("category_id", courseId)
        .eq("status", "published")
        .is("deleted_at", null);

      if (!totalLessons || totalLessons === 0) return 0;

      // Get completed lessons count
      const { count: completedLessons } = await supabase
        .from("lesson_progress")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("course_id", courseId)
        .eq("completed", true);

      const percentage = Math.round(((completedLessons || 0) / totalLessons) * 100);
      return percentage;
    } catch (error) {
      console.error("Error fetching course progress:", error);
      return 0;
    }
  }, [userId]);

  /**
   * Navigate to course with role- and progress-aware routing
   * 
   * Rules:
   * 1. Management roles (Admin, Super/Senior/Moderator) → Always /course/:slug?tab=info
   * 2. Learner with 0% progress → /course/:slug (Course Details/Overview)
   * 3. Learner with >0% progress → /course/:slug?tab=lessons
   * 
   * This does NOT auto-resume to a specific lesson. Use handleResume for that.
   * 
   * @param options.careerFlow - If true, marks this as career flow navigation (immersive mode)
   */
  const navigateToCourse = useCallback(async (
    courseSlug: string, 
    courseId?: string,
    options?: { careerFlow?: boolean }
  ) => {
    // Handle career flow marking
    if (options?.careerFlow) {
      markAsCareerFlow();
    }

    // If roles are still loading, navigate without tab param and let CourseDetail handle it
    if (roleLoading) {
      navigate(`/course/${courseSlug}`);
      return;
    }

    // Rule 1: Management roles → Course Info tab
    if (isManagementRole) {
      navigate(`/course/${courseSlug}?tab=info`);
      return;
    }

    // If no courseId provided, we can't check progress - let CourseDetail handle it
    if (!courseId || !userId) {
      navigate(`/course/${courseSlug}`);
      return;
    }

    // Rule 2 & 3: Check progress for learners
    const progress = await getCourseProgress(courseId);

    if (progress > 0) {
      // Has started → Lessons tab
      navigate(`/course/${courseSlug}?tab=lessons`);
    } else {
      // Not started → Course Details/Overview (no tab param = defaults to details)
      navigate(`/course/${courseSlug}`);
    }
  }, [navigate, roleLoading, isManagementRole, userId, getCourseProgress, markAsCareerFlow]);

  /**
   * Navigate directly to course without any async progress checks
   * Used when you don't have courseId or want synchronous navigation
   * CourseDetail will handle the tab resolution based on role/progress
   * 
   * @param options.careerFlow - If true, marks this as career flow navigation (immersive mode)
   */
  const navigateToCourseSync = useCallback((
    courseSlug: string,
    options?: { careerFlow?: boolean }
  ) => {
    // Handle career flow marking
    if (options?.careerFlow) {
      markAsCareerFlow();
    }

    if (roleLoading) {
      navigate(`/course/${courseSlug}`);
      return;
    }

    // Management roles → Course Info tab
    if (isManagementRole) {
      navigate(`/course/${courseSlug}?tab=info`);
      return;
    }

    // For learners, let CourseDetail handle tab resolution
    navigate(`/course/${courseSlug}`);
  }, [navigate, roleLoading, isManagementRole, markAsCareerFlow]);

  /**
   * Explicit resume action - navigates to last viewed lesson
   * Only call this when user explicitly clicks "Continue" or "Resume"
   * 
   * @param options.careerFlow - If true, marks this as career flow navigation (immersive mode)
   */
  const handleResume = useCallback(async (
    courseSlug: string, 
    courseId: string,
    options?: { careerFlow?: boolean }
  ) => {
    // Handle career flow marking
    if (options?.careerFlow) {
      markAsCareerFlow();
    }

    if (!userId) {
      navigate(`/course/${courseSlug}?tab=lessons`);
      return;
    }

    try {
      // Get last viewed lesson
      const { data: lastProgress } = await supabase
        .from("lesson_progress")
        .select("lesson_id, posts:lesson_id (slug)")
        .eq("user_id", userId)
        .eq("course_id", courseId)
        .order("viewed_at", { ascending: false })
        .limit(1);

      const lastLessonSlug = lastProgress?.[0]?.posts 
        ? (lastProgress[0].posts as any).slug 
        : null;

      if (lastLessonSlug) {
        // Navigate directly to the last lesson
        navigate(`/course/${courseSlug}?lesson=${lastLessonSlug}&tab=lessons`);
      } else {
        // No specific lesson found, just go to lessons tab
        navigate(`/course/${courseSlug}?tab=lessons`);
      }
    } catch (error) {
      console.error("Error fetching resume position:", error);
      navigate(`/course/${courseSlug}?tab=lessons`);
    }
  }, [navigate, userId, markAsCareerFlow]);

  return {
    navigateToCourse,
    navigateToCourseSync,
    handleResume,
    getCourseProgress,
    isManagementRole,
    roleLoading,
    markAsCareerFlow,
    clearCareerFlow,
  };
};
