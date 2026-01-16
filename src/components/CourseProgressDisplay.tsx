import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';

interface CourseProgressDisplayProps {
  courseId: string;
  userId: string;
  className?: string;
}

export const CourseProgressDisplay = ({ courseId, userId, className = '' }: CourseProgressDisplayProps) => {
  const [progress, setProgress] = useState<{ viewed: number; total: number; percentage: number }>({
    viewed: 0,
    total: 0,
    percentage: 0,
  });

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        // Get total lessons in course from course_lessons table
        const { count: totalLessons } = await supabase
          .from('course_lessons' as any)
          .select('*', { count: 'exact', head: true })
          .eq('course_id', courseId)
          .is('deleted_at', null);

        // Get user's progress for this course
        const { count: viewedLessons } = await supabase
          .from('lesson_progress')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('course_id', courseId);

        const total = totalLessons || 0;
        const viewed = viewedLessons || 0;
        const percentage = total > 0 ? Math.round((viewed / total) * 100) : 0;

        setProgress({ viewed, total, percentage });
      } catch (error) {
        console.error('Error fetching progress:', error);
      }
    };

    if (courseId && userId) {
      fetchProgress();
    }
  }, [courseId, userId]);

  return (
    <div className={className}>
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
        <span>{progress.viewed}/{progress.total} lessons</span>
        <span>{progress.percentage}%</span>
      </div>
      <Progress value={progress.percentage} className="h-1.5" />
    </div>
  );
};
