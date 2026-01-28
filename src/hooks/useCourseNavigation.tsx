import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";

/**
 * Role- & Progress-Aware Course Navigation Hook
 * 
 * CAREER BOARD ARCHITECTURE:
 * - navigateToCourseInCareerBoard: Uses /career-board/:careerId/course/:slug routes
 *   This ensures CareerScopedHeader is rendered by LAYOUT, not conditional logic.
 * 
 * - navigateToCourse: Standard navigation to /course/:slug
 *   Uses NormalHeader (secondary course navigation)
 * 
 * NAVIGATION RULES:
 * 1. From Career Board / Career Readiness → Use navigateToCourseInCareerBoard
 * 2. From anywhere else (courses page, search, etc.) → Use navigateToCourse
 * 
 * Management roles (Admin, Super/Senior/Moderator) always go to Course Info tab.
 */
export const useCourseNavigation = () => {
  const navigate = useNavigate();
  const { userId, isAdmin, isSuperModerator, isSeniorModerator, isModerator, isLoading: roleLoading } = useUserRole();

  /**
   * Check if user has any management role
   */
  const isManagementRole = isAdmin || isSuperModerator || isSeniorModerator || isModerator;

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
   * Navigate to course INSIDE the Career Board shell
   * 
   * ARCHITECTURAL GUARANTEE:
   * - Uses /career-board/:careerId/course/:courseSlug route
   * - CareerBoardLayout ALWAYS renders CareerScopedHeader
   * - No conditional header logic in the destination page
   * - No ads, no upgrade nudges inside this shell
   * 
   * ONLY use this from:
   * - Arcade (Career Board) page
   * - Career Readiness card CTAs
   * - Skill row clicks inside Career Readiness
   * - Course clicks FROM INSIDE Career Board
   */
  const navigateToCourseInCareerBoard = useCallback((careerId: string, courseSlug: string) => {
    navigate(`/career-board/${careerId}/course/${courseSlug}`);
  }, [navigate]);

  /**
   * Navigate to course with role- and progress-aware routing
   * 
   * Uses standard /course/:slug route (NormalHeader secondary navigation)
   * 
   * Rules:
   * 1. Management roles (Admin, Super/Senior/Moderator) → Always /course/:slug?tab=info
   * 2. Learner with 0% progress → /course/:slug (Course Details/Overview)
   * 3. Learner with >0% progress → /course/:slug?tab=lessons
   */
  const navigateToCourse = useCallback(async (courseSlug: string, courseId?: string) => {
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
  }, [navigate, roleLoading, isManagementRole, userId, getCourseProgress]);

  /**
   * Navigate directly to course without any async progress checks
   * Used when you don't have courseId or want synchronous navigation
   * CourseDetail will handle the tab resolution based on role/progress
   */
  const navigateToCourseSync = useCallback((courseSlug: string) => {
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
  }, [navigate, roleLoading, isManagementRole]);

  /**
   * Explicit resume action - navigates to last viewed lesson
   * Only call this when user explicitly clicks "Continue" or "Resume"
   */
  const handleResume = useCallback(async (courseSlug: string, courseId: string) => {
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
  }, [navigate, userId]);

  /**
   * Resume within Career Board shell
   */
  const handleResumeInCareerBoard = useCallback(async (careerId: string, courseSlug: string, courseId: string) => {
    if (!userId) {
      navigate(`/career-board/${careerId}/course/${courseSlug}`);
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
        navigate(`/career-board/${careerId}/course/${courseSlug}?lesson=${lastLessonSlug}`);
      } else {
        navigate(`/career-board/${careerId}/course/${courseSlug}`);
      }
    } catch (error) {
      console.error("Error fetching resume position:", error);
      navigate(`/career-board/${careerId}/course/${courseSlug}`);
    }
  }, [navigate, userId]);

  return {
    // Career Board navigation (architectural guarantee - no conditional headers)
    navigateToCourseInCareerBoard,
    handleResumeInCareerBoard,
    // Standard course navigation (uses normal secondary header)
    navigateToCourse,
    navigateToCourseSync,
    handleResume,
    // Utilities
    getCourseProgress,
    isManagementRole,
    roleLoading,
  };
};
