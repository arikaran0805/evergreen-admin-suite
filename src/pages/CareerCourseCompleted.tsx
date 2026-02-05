/**
 * CareerCourseCompleted - Course Completion Page within Career Board Shell
 * 
 * Route: /career-board/:careerId/course/:courseSlug/completed
 * 
 * A celebration page shown when a learner completes a course.
 * Renders within the career shell layout.
 */

import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate, useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCareerBoard } from "@/contexts/CareerBoardContext";
import { format } from "date-fns";
import { 
  PartyPopper, 
  ArrowLeft, 
  CheckCircle2, 
  Award, 
  BookOpen, 
  Clock, 
  Target,
  Star,
  Linkedin,
  Copy,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import CourseReviewDialog from "@/components/CourseReviewDialog";
import { useCourseStats } from "@/hooks/useCourseStats";

interface CourseData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  learning_hours: number | null;
}

interface CompletionData {
  lessonsCompleted: number;
  totalHours: number;
  completionDate: Date;
  skills: string[];
}

interface OutletContext {
  setCurrentCourseSlug: (slug: string | null) => void;
}

const CareerCourseCompleted = () => {
  const params = useParams<{ careerId: string; courseSlug: string }>();
  const careerIdParam = decodeURIComponent((params.careerId ?? "").split("?")[0]).trim();
  const courseSlug = decodeURIComponent((params.courseSlug ?? "").split("?")[0]).trim();
  const navigate = useNavigate();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  // Career Board context
  const { career, careerCourses, isLoading: careerLoading } = useCareerBoard();
  
  // Outlet context for layout communication
  const outletContext = useOutletContext<OutletContext>();
  const setCurrentCourseSlug = outletContext?.setCurrentCourseSlug;

  // Use route param for stable URLs
  const careerSlugForPath = careerIdParam || career?.slug;

  const [course, setCourse] = useState<CourseData | null>(null);
  const [completionData, setCompletionData] = useState<CompletionData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [learnerName, setLearnerName] = useState("");
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  
  // Course stats for reviews
  const {
    stats: courseStats,
    reviews: courseReviews,
    submitReview,
    deleteReview,
  } = useCourseStats(course?.id, user);
  
  // Next course in career path
  const [nextCourse, setNextCourse] = useState<CourseData | null>(null);

  // Safety timeout to prevent infinite skeleton
  useEffect(() => {
    if (hasLoadedOnce) return;
    const timeout = setTimeout(() => {
      if (!hasLoadedOnce) {
        console.warn("CareerCourseCompleted: Safety timeout reached");
        setDataLoading(false);
        setHasLoadedOnce(true);
      }
    }, 8000);
    return () => clearTimeout(timeout);
  }, [hasLoadedOnce]);

  // Register current course slug with parent layout
  useEffect(() => {
    if (setCurrentCourseSlug) {
      setCurrentCourseSlug(courseSlug);
      return () => setCurrentCourseSlug(null);
    }
  }, [courseSlug, setCurrentCourseSlug]);

  // Fetch all data
  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated) {
      navigate("/auth", { 
        state: { from: `/career-board/${careerIdParam}/course/${courseSlug}/completed` },
        replace: true 
      });
      return;
    }

    if (!user || !courseSlug) return;

    const fetchData = async () => {
      try {
        // Fetch course by slug
        const { data: courseData, error: courseError } = await supabase
          .from("courses")
          .select("id, name, slug, description, learning_hours")
          .eq("slug", courseSlug)
          .maybeSingle();

        if (courseError || !courseData) {
          navigate(`/career-board/${careerSlugForPath}/course/${courseSlug}`, { replace: true });
          return;
        }

        setCourse(courseData);

        // Fetch learner profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();

        setLearnerName(profile?.full_name || user.email?.split('@')[0] || "Learner");

        // Check completion
        const { count: totalLessons } = await supabase
          .from("course_lessons")
          .select("*", { count: "exact", head: true })
          .eq("course_id", courseData.id)
          .eq("is_published", true)
          .is("deleted_at", null);

        const { count: completedLessons } = await supabase
          .from("lesson_progress")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("course_id", courseData.id)
          .eq("completed", true);

        const total = totalLessons || 0;
        const completed = completedLessons || 0;

        // Redirect if not completed
        if (total > 0 && completed < total) {
          toast({
            title: "Course not completed",
            description: "Complete all lessons to view this page.",
            variant: "destructive",
          });
          navigate(`/career-board/${careerSlugForPath}/course/${courseSlug}`, { replace: true });
          return;
        }

        // Get time spent
        const { data: timeData } = await supabase
          .from("lesson_time_tracking")
          .select("duration_seconds")
          .eq("user_id", user.id)
          .eq("course_id", courseData.id);

        const totalSeconds = timeData?.reduce((sum, t) => sum + t.duration_seconds, 0) || 0;
        const totalHours = totalSeconds / 3600;

        // Get completion date
        const { data: progressData } = await supabase
          .from("lesson_progress")
          .select("viewed_at")
          .eq("user_id", user.id)
          .eq("course_id", courseData.id)
          .eq("completed", true)
          .order("viewed_at", { ascending: false })
          .limit(1);

        const completionDate = progressData?.[0]?.viewed_at 
          ? new Date(progressData[0].viewed_at) 
          : new Date();

        // Fetch skills from career_courses
        const { data: careerCoursesData } = await supabase
          .from("career_courses")
          .select("skill_contributions")
          .eq("course_id", courseData.id)
          .is("deleted_at", null);

        let skills: string[] = [];
        if (careerCoursesData?.length) {
          careerCoursesData.forEach(cc => {
            if (cc.skill_contributions && Array.isArray(cc.skill_contributions)) {
              const contributions = cc.skill_contributions as Array<{ skill_name: string; contribution: number }>;
              contributions.forEach(sc => {
                if (sc.skill_name && sc.contribution > 0) {
                  skills.push(sc.skill_name);
                }
              });
            }
          });
          skills = [...new Set(skills)];
        }

        if (skills.length === 0) {
          skills = ["Problem Solving", "Critical Thinking", "Subject Mastery"];
        }

        setCompletionData({
          lessonsCompleted: completed,
          totalHours: totalHours > 0 ? totalHours : (courseData.learning_hours || 1),
          completionDate,
          skills: skills.slice(0, 6),
        });

        // Find next course in career path
        if (careerCourses.length > 0) {
          const currentIndex = careerCourses.findIndex(c => c.slug === courseSlug);
          const nextInCareer = careerCourses.find((_, index) => index > currentIndex);
          
          if (nextInCareer) {
            const { data: nextCourseData } = await supabase
              .from("courses")
              .select("id, name, slug, description, learning_hours")
              .eq("id", nextInCareer.id)
              .maybeSingle();
            
            if (nextCourseData) {
              setNextCourse(nextCourseData);
            }
          }
        }

      } catch (error) {
        console.error("Error fetching completion data:", error);
      } finally {
        setDataLoading(false);
        setHasLoadedOnce(true);
      }
    };

    fetchData();
  }, [authLoading, isAuthenticated, user, courseSlug, careerSlugForPath, careerCourses, navigate, toast, careerIdParam]);

  const formatHours = (hours: number) => {
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes} min`;
    }
    return `${hours.toFixed(1)} hrs`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link copied!", description: "Share your achievement with others." });
  };

  const handleShareLinkedIn = () => {
    if (!course) return;
    const text = encodeURIComponent(
      `I just completed "${course.name}"! 🎉\n\nExcited to share my new skills and knowledge. #Learning #Achievement`
    );
    const url = encodeURIComponent(window.location.href);
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}&summary=${text}`,
      '_blank',
      'width=600,height=400'
    );
  };

  // Loading state - once loaded, don't show skeleton again (tab refocus stability)
  const isCurrentlyLoading = authLoading || dataLoading;
  const showLoading = hasLoadedOnce ? false : isCurrentlyLoading;

  if (showLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <Skeleton className="h-6 w-32 mb-8" />
        <div className="text-center mb-10">
          <Skeleton className="h-8 w-64 mx-auto mb-4" />
          <Skeleton className="h-10 w-96 mx-auto mb-3" />
          <Skeleton className="h-5 w-72 mx-auto" />
        </div>
        <Skeleton className="h-64 w-full mb-8" />
        <Skeleton className="h-48 w-full mb-8" />
      </div>
    );
  }

  if (!course || !completionData) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      {/* Back link */}
      <Link
        to={`/career-board/${careerSlugForPath}/course/${course.slug}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Course
      </Link>

      {/* Header Celebration */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 text-primary mb-4">
          <PartyPopper className="h-8 w-8" />
          <span className="text-2xl">🎉</span>
        </div>
        
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
          Course Completed!
        </h1>
        
        <p className="text-xl font-semibold text-primary mb-3">
          {course.name}
        </p>
        
        <p className="text-muted-foreground mb-4">
          Congratulations on completing all lessons!
        </p>
        
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Completed on {format(completionData.completionDate, 'MMMM d, yyyy')}
          </span>
        </div>
      </div>

      <Separator className="my-8" />

      {/* Stats Summary */}
      <Card className="p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">Course Summary</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completionData.lessonsCompleted}</p>
              <p className="text-sm text-muted-foreground">Lessons Completed</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatHours(completionData.totalHours)}</p>
              <p className="text-sm text-muted-foreground">Time Invested</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
            <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Target className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completionData.skills.length}</p>
              <p className="text-sm text-muted-foreground">Skills Covered</p>
            </div>
          </div>
        </div>

        {/* Skills */}
        {completionData.skills.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-3">Key Skills Learned</p>
            <div className="flex flex-wrap gap-2">
              {completionData.skills.map((skill, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{skill}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Share & Review */}
      <Card className="p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">Share Your Achievement</h3>
        
        <div className="flex flex-wrap gap-3 mb-6">
          <Button variant="outline" onClick={handleShareLinkedIn}>
            <Linkedin className="h-4 w-4 mr-2" />
            Share on LinkedIn
          </Button>
          
          <Button variant="outline" onClick={handleCopyLink}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Link
          </Button>
        </div>

        {/* Review prompt */}
        {!courseStats.userReview && (
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm text-muted-foreground mb-3">
              💬 Your feedback helps improve this course for others
            </p>
            <CourseReviewDialog
              reviews={courseReviews}
              averageRating={courseStats.averageRating}
              reviewCount={courseStats.reviewCount}
              userReview={courseStats.userReview}
              isEnrolled={courseStats.isEnrolled}
              isAuthenticated={!!user}
              onSubmitReview={submitReview}
              onDeleteReview={deleteReview}
            >
              <Button variant="outline" size="sm">
                <Star className="h-4 w-4 mr-2" />
                Leave a Review
              </Button>
            </CourseReviewDialog>
          </div>
        )}
      </Card>

      {/* Next Steps */}
      {nextCourse && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Continue Your Journey</h3>
          
          <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-muted/50">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground mb-1">Next Course</p>
              <p className="font-medium text-foreground truncate">{nextCourse.name}</p>
              {nextCourse.learning_hours && (
                <p className="text-xs text-muted-foreground mt-1">
                  ~{nextCourse.learning_hours} hours
                </p>
              )}
            </div>
            <Button asChild>
              <Link to={`/career-board/${careerSlugForPath}/course/${nextCourse.slug}`}>
                Start Course
                <ChevronRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default CareerCourseCompleted;
