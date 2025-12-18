import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlayCircle, Clock, ChevronRight } from 'lucide-react';

interface RecentLesson {
  lessonId: string;
  lessonTitle: string;
  courseSlug: string;
  lessonSlug: string;
  courseName: string;
  lastViewed: string;
}

export const ContinueLearningCard = () => {
  const [recentLesson, setRecentLesson] = useState<RecentLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRecentLesson = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Get most recent lesson progress
        const { data: progress } = await supabase
          .from('lesson_progress')
          .select(`
            lesson_id,
            viewed_at,
            courses:course_id (name, slug)
          `)
          .eq('user_id', session.user.id)
          .order('viewed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (progress) {
          // Get lesson details
          const { data: lesson } = await supabase
            .from('posts')
            .select('id, title, slug')
            .eq('id', progress.lesson_id)
            .maybeSingle();

          if (lesson && progress.courses) {
            setRecentLesson({
              lessonId: lesson.id,
              lessonTitle: lesson.title,
              courseSlug: (progress.courses as any).slug,
              lessonSlug: lesson.slug,
              courseName: (progress.courses as any).name,
              lastViewed: progress.viewed_at,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching recent lesson:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentLesson();
  }, []);

  const handleContinue = () => {
    if (recentLesson) {
      navigate(`/course/${recentLesson.courseSlug}?lesson=${recentLesson.lessonSlug}`);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="h-10 animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!recentLesson) {
    return null;
  }

  return (
    <Card className="border bg-gradient-to-r from-primary/5 to-transparent hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2 rounded-lg bg-primary/10">
              <PlayCircle className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {getTimeAgo(recentLesson.lastViewed)} • {recentLesson.courseName}
              </p>
              <p className="font-medium text-sm truncate">{recentLesson.lessonTitle}</p>
            </div>
          </div>
          <Button 
            size="sm" 
            onClick={handleContinue}
            className="shrink-0"
          >
            Continue
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
