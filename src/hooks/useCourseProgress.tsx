import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CourseProgress {
  totalLessons: number;
  viewedLessons: number;
  completedLessons: number;
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
    viewedLessons: 0,
    completedLessons: 0,
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
      
      // Get total lessons in course
      const { count: totalLessons } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', courseId)
        .eq('status', 'published');

      if (!user) {
        setProgress({
          totalLessons: totalLessons || 0,
          viewedLessons: 0,
          completedLessons: 0,
          percentage: 0,
        });
        setLessonStatuses(new Map());
        setLoading(false);
        return;
      }

      // Get user's progress for this course
      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('lesson_id, completed')
        .eq('user_id', user.id)
        .eq('course_id', courseId);

      const viewedLessons = progressData?.length || 0;
      const completedLessons = progressData?.filter(p => p.completed).length || 0;
      const total = totalLessons || 0;
      const percentage = total > 0 ? Math.round((viewedLessons / total) * 100) : 0;

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
        viewedLessons,
        completedLessons,
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
