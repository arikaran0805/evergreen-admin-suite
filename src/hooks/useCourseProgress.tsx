import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CourseProgress {
  totalLessons: number;
  publishedLessons: number;
  viewedLessons: number;
  completedLessons: number;
  totalProblems: number;
  solvedProblems: number;
  percentage: number;
}

interface LessonStatus {
  lessonId: string;
  viewed: boolean;
  completed: boolean;
}

export const useCourseProgress = (courseId: string | undefined) => {
  const [progress, setProgress] = useState<CourseProgress>({
    totalLessons: 0,
    publishedLessons: 0,
    viewedLessons: 0,
    completedLessons: 0,
    totalProblems: 0,
    solvedProblems: 0,
    percentage: 0,
  });
  const [lessonStatuses, setLessonStatuses] = useState<Map<string, LessonStatus>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    if (!courseId) {
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get total lessons in course from course_lessons table
      const { count: totalLessons } = await supabase
        .from("course_lessons" as any)
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId)
        .is('deleted_at', null);

      // Get published lessons count
      const { count: publishedLessons } = await supabase
        .from("course_lessons" as any)
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId)
        .eq('is_published', true)
        .is('deleted_at', null);

      // Get practice skill for this course
      const { data: skill } = await supabase
        .from("practice_skills")
        .select("id")
        .eq("course_id", courseId)
        .eq("status", "published")
        .maybeSingle();

      // Get total problems count for this course's skill
      let totalProblems = 0;
      let allProblemIds: string[] = [];
      
      if (skill) {
        const { data: subTopics } = await supabase
          .from("sub_topics")
          .select("problem_mappings(problem_id)")
          .eq("skill_id", skill.id);

        if (subTopics) {
          subTopics.forEach((st: any) => {
            const problemIds = (st.problem_mappings || []).map((pm: any) => pm.problem_id);
            allProblemIds = [...allProblemIds, ...problemIds];
          });
          // Remove duplicates
          allProblemIds = [...new Set(allProblemIds)];
          totalProblems = allProblemIds.length;
        }
      }

      if (!user) {
        const total = totalLessons || 0;
        const published = publishedLessons || 0;
        const percentage = total > 0 ? Math.min(100, Math.round((published / total) * 100)) : 0;
        
        setProgress({
          totalLessons: total,
          publishedLessons: published,
          viewedLessons: 0,
          completedLessons: 0,
          totalProblems,
          solvedProblems: 0,
          percentage,
        });
        setLessonStatuses(new Map());
        setLoading(false);
        return;
      }

      // Get user's lesson progress for this course
      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('lesson_id, completed')
        .eq('user_id', user.id)
        .eq('course_id', courseId);

      // Get user's solved problems
      let solvedProblems = 0;
      if (allProblemIds.length > 0) {
        const { count } = await supabase
          .from("learner_problem_progress")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "solved")
          .in("problem_id", allProblemIds);
        
        solvedProblems = count || 0;
      }

      const viewedLessons = progressData?.length || 0;
      const completedLessons = progressData?.filter(p => p.completed).length || 0;
      const total = totalLessons || 0;
      
      // Calculate progress based on lessons only
      const percentage = total > 0 ? Math.min(100, Math.round((completedLessons / total) * 100)) : 0;

      // Build lesson status map
      const statusMap = new Map<string, LessonStatus>();
      progressData?.forEach(p => {
        statusMap.set(p.lesson_id, {
          lessonId: p.lesson_id,
          viewed: true,
          completed: p.completed,
        });
      });
      setLessonStatuses(statusMap);

      setProgress({
        totalLessons: total,
        publishedLessons: publishedLessons || 0,
        viewedLessons,
        completedLessons,
        totalProblems,
        solvedProblems,
        percentage,
      });
    } catch (error) {
      console.error('Error fetching course progress:', error);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  const markLessonViewed = useCallback(async (lessonId: string) => {
    if (!courseId) return false;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('lesson_progress')
        .upsert({
          user_id: user.id,
          lesson_id: lessonId,
          course_id: courseId,
          viewed_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,lesson_id',
        });

      if (error) throw error;
      
      await fetchProgress();
      return true;
    } catch (error) {
      console.error('Error marking lesson as viewed:', error);
      return false;
    }
  }, [courseId, fetchProgress]);

  const markLessonCompleted = useCallback(async (lessonId: string, completed: boolean = true) => {
    if (!courseId) return false;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('lesson_progress')
        .upsert({
          user_id: user.id,
          lesson_id: lessonId,
          course_id: courseId,
          completed,
          viewed_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,lesson_id',
        });

      if (error) throw error;
      
      await fetchProgress();
      return true;
    } catch (error) {
      console.error('Error marking lesson as completed:', error);
      return false;
    }
  }, [courseId, fetchProgress]);

  const isLessonCompleted = useCallback((lessonId: string): boolean => {
    return lessonStatuses.get(lessonId)?.completed || false;
  }, [lessonStatuses]);

  const isLessonViewed = useCallback((lessonId: string): boolean => {
    return lessonStatuses.has(lessonId);
  }, [lessonStatuses]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return {
    progress,
    loading,
    lessonStatuses,
    markLessonViewed,
    markLessonCompleted,
    isLessonCompleted,
    isLessonViewed,
    refetch: fetchProgress,
  };
};
