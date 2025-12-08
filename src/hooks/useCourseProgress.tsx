import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CourseProgress {
  totalLessons: number;
  viewedLessons: number;
  completedLessons: number;
  percentage: number;
}

export const useCourseProgress = (courseId: string | undefined) => {
  const [progress, setProgress] = useState<CourseProgress>({
    totalLessons: 0,
    viewedLessons: 0,
    completedLessons: 0,
    percentage: 0,
  });
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

  const isLessonViewed = useCallback(async (lessonId: string): Promise<boolean> => {
    if (!courseId) return false;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data } = await supabase
        .from('lesson_progress')
        .select('id')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .maybeSingle();

      return !!data;
    } catch (error) {
      return false;
    }
  }, [courseId]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return {
    progress,
    loading,
    markLessonViewed,
    markLessonCompleted,
    isLessonViewed,
    refetch: fetchProgress,
  };
};
