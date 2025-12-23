import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Clock, icons } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Helper to get a dynamic icon
const getIcon = (iconName: string, fallback: LucideIcon): LucideIcon => {
  const icon = icons[iconName as keyof typeof icons];
  if (icon && typeof icon !== 'function' && 'displayName' in icon) {
    return icon as LucideIcon;
  }
  return fallback;
};

interface CourseProgress {
  courseId: string;
  courseName: string;
  courseSlug: string;
  featuredImage: string | null;
  icon: string | null;
  learningHours: number;
  completedLessons: number;
  totalLessons: number;
}

export const ContinueLearningCard = () => {
  const [courses, setCourses] = useState<CourseProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCourseProgress = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Get enrolled courses with icon and learning_hours
        const { data: enrollments } = await supabase
          .from('course_enrollments')
          .select('course_id, courses:course_id (id, name, slug, featured_image, icon, learning_hours)')
          .eq('user_id', session.user.id)
          .limit(4);

        if (!enrollments) return;

        const courseProgressData: CourseProgress[] = [];

        for (const enrollment of enrollments) {
          const course = enrollment.courses as any;
          if (!course) continue;

          // Get total lessons for this course
          const { count: totalLessons } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', course.id)
            .eq('status', 'published');

          // Get completed lessons for this course
          const { count: completedLessons } = await supabase
            .from('lesson_progress')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', session.user.id)
            .eq('course_id', course.id)
            .eq('completed', true);

          courseProgressData.push({
            courseId: course.id,
            courseName: course.name,
            courseSlug: course.slug,
            featuredImage: course.featured_image,
            icon: course.icon || null,
            learningHours: course.learning_hours || 0,
            completedLessons: completedLessons || 0,
            totalLessons: totalLessons || 0,
          });
        }

        setCourses(courseProgressData);
      } catch (error) {
        console.error('Error fetching course progress:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseProgress();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <Card key={i} className="bg-muted/30">
            <CardContent className="p-4">
              <div className="h-16 animate-pulse bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (courses.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {courses.map((course) => {
        const progressPercent = course.totalLessons > 0 
          ? (course.completedLessons / course.totalLessons) * 100 
          : 0;

        const IconComponent = getIcon(course.icon || 'BookOpen', BookOpen);

        return (
          <Card 
            key={course.courseId}
            className="bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={() => navigate(`/course/${course.courseSlug}`)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden shrink-0">
                  {course.featuredImage ? (
                    <img 
                      src={course.featuredImage} 
                      alt={course.courseName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <IconComponent className="h-8 w-8 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground truncate">{course.courseName}</h4>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      {course.learningHours > 0 
                        ? `${course.learningHours}h` 
                        : `${Math.max(1, Math.round((course.totalLessons * 15) / 60))}h`}
                    </span>
                  </div>
                  <Progress value={progressPercent} className="h-2 mt-2" />
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">Total Progress</span>
                    <span className="text-sm font-medium">
                      <span className="text-foreground">{course.completedLessons}</span>
                      <span className="text-muted-foreground"> / {course.totalLessons}</span>
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
