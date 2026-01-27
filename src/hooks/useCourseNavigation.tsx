import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";

// Session storage key for career flow (must match useUserState)
const ENTRY_FLOW_KEY = "lovable_entry_flow";

/**
 * Role- & Progress-Aware Course Navigation Hook
 * 
 * This hook provides deterministic, predictable course entry routing based on:
 * - User role (Admin, Super Moderator, Senior Moderator, Moderator → Course Info)
 * - Course progress (0% → Course Details, >0% → Lessons tab)
 * 
 * ENTRY FLOW SYSTEM:
 * - navigateToCourse: Standard navigation - DOES NOT set career flow
 * - navigateToCourseWithCareerFlow: Sets career flow for CareerScopedHeader
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
   * Set career flow in session storage
   * This makes CareerScopedHeader visible on the destination page
   */
  const setCareerFlow = useCallback(() => {
    sessionStorage.setItem(ENTRY_FLOW_KEY, "career_flow");
  }, []);

  /**
   * Navigate to course with role- and progress-aware routing
   * 
   * Rules:
   * 1. Management roles (Admin, Super/Senior/Moderator) → Always /course/:slug?tab=info
   * 2. Learner with 0% progress → /course/:slug (Course Details/Overview)
   * 3. Learner with >0% progress → /course/:slug?tab=lessons
   * 
   * NOTE: This does NOT set career flow. Use navigateToCourseWithCareerFlow for that.
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
   * Navigate to course WITH career flow enabled
   * 
   * ONLY call this from:
   * - Career Board CTA in Career Readiness
   * - "Improve Career Readiness" CTA
   * - Skill row clicks inside Career Readiness
   * - Course clicks FROM INSIDE Career Board
   * 
   * This sets the career flow flag which shows CareerScopedHeader on the course page.
   */
  const navigateToCourseWithCareerFlow = useCallback(async (courseSlug: string, courseId?: string) => {
    // Set career flow BEFORE navigation
    setCareerFlow();
    
    // Then navigate normally
    await navigateToCourse(courseSlug, courseId);
  }, [setCareerFlow, navigateToCourse]);

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
   * Navigate directly to course WITH career flow (synchronous version)
   */
  const navigateToCourseSyncWithCareerFlow = useCallback((courseSlug: string) => {
    setCareerFlow();
    navigateToCourseSync(courseSlug);
  }, [setCareerFlow, navigateToCourseSync]);

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
   * Resume with career flow enabled
   */
  const handleResumeWithCareerFlow = useCallback(async (courseSlug: string, courseId: string) => {
    setCareerFlow();
    await handleResume(courseSlug, courseId);
  }, [setCareerFlow, handleResume]);

  return {
    navigateToCourse,
    navigateToCourseWithCareerFlow,
    navigateToCourseSync,
    navigateToCourseSyncWithCareerFlow,
    handleResume,
    handleResumeWithCareerFlow,
    getCourseProgress,
    isManagementRole,
    roleLoading,
  };
};
