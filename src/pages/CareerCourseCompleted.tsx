/**
 * CareerCourseCompleted - Course Completion Page within Career Board Shell
 * 
 * Route: /career-board/:careerId/course/:courseSlug/completed
 * 
 * Simple, clean implementation that stays within the career shell.
 * No complex loading gates - just fetch data and display.
 */

import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate, useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCareerBoard } from "@/contexts/CareerBoardContext";
import { format } from "date-fns";
import { PartyPopper, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CertificateCard,
  CourseSummaryCard,
  EngagementCard,
  NextStepsCard,
} from "@/components/course-completed";
import { useToast } from "@/hooks/use-toast";

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

interface Review {
  id: string;
  rating: number;
  review: string | null;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
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
  
  // Review state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [averageRating, setAverageRating] = useState(0);
  
  // Recommended next course
  const [nextCourse, setNextCourse] = useState<CourseData | null>(null);

  // Safety timeout: prevent infinite skeleton
  useEffect(() => {
    if (hasLoadedOnce) return;
    
    const timeout = setTimeout(() => {
      if (!hasLoadedOnce) {
        console.warn("CareerCourseCompleted: Loading timeout reached, forcing completion");
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

  // Debug: Track which conditions are true
  useEffect(() => {
    const conditions = {
      '1. authLoading complete': !authLoading,
      '2. isAuthenticated': isAuthenticated,
      '3. user available': !!user,
      '4. careerLoading complete': !careerLoading,
      '5. courseSlug available': !!courseSlug,
      '6. career available': !!career,
      '7. careerCourses loaded': careerCourses.length > 0,
      '8. dataLoading complete': !dataLoading,
    };
    
    const trueCount = Object.values(conditions).filter(Boolean).length;
    console.log(`🔍 CareerCourseCompleted: ${trueCount}/8 conditions true`, conditions);
  }, [authLoading, isAuthenticated, user, careerLoading, courseSlug, career, careerCourses, dataLoading]);

  // Fetch all data
  useEffect(() => {
    // Wait for auth to complete before making any decisions
    if (authLoading) return;
    
    // Redirect if not authenticated (after auth loading completes)
    if (!isAuthenticated) {
      navigate("/auth", { 
        state: { from: `/career-board/${careerIdParam}/course/${courseSlug}/completed` },
        replace: true 
      });
      return;
    }

    // Wait for user object and course slug
    if (!user || !courseSlug) {
      // If auth says authenticated but no user, something is wrong - set timeout handles this
      return;
    }

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

        // Check completion using course_lessons (published lessons)
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

        // Only redirect if there are lessons and not all completed
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

        // Fetch reviews
        const { data: reviewsData } = await supabase
          .from("course_reviews")
          .select(`
            id, rating, review, created_at, user_id,
            profiles:user_id (full_name, avatar_url)
          `)
          .eq("course_id", courseData.id)
          .order("created_at", { ascending: false });

        if (reviewsData) {
          setReviews(reviewsData as unknown as Review[]);
          const userRev = reviewsData.find(r => r.user_id === user.id);
          setUserReview(userRev as unknown as Review || null);
          
          if (reviewsData.length > 0) {
            const avg = reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length;
            setAverageRating(avg);
          }
        }

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

  // Review handlers
  const handleSubmitReview = useCallback(async (rating: number, review: string) => {
    if (!user || !course?.id) return false;

    try {
      if (userReview) {
        await supabase
          .from("course_reviews")
          .update({ rating, review, updated_at: new Date().toISOString() })
          .eq("id", userReview.id);
      } else {
        await supabase
          .from("course_reviews")
          .insert({ course_id: course.id, user_id: user.id, rating, review });
      }

      toast({ title: "Review submitted", description: "Thank you for your feedback!" });

      // Refresh reviews
      const { data: reviewsData } = await supabase
        .from("course_reviews")
        .select(`id, rating, review, created_at, user_id, profiles:user_id (full_name, avatar_url)`)
        .eq("course_id", course.id)
        .order("created_at", { ascending: false });

      if (reviewsData) {
        setReviews(reviewsData as unknown as Review[]);
        const userRev = reviewsData.find(r => r.user_id === user.id);
        setUserReview(userRev as unknown as Review || null);
        if (reviewsData.length > 0) {
          setAverageRating(reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length);
        }
      }

      return true;
    } catch (error) {
      console.error("Error submitting review:", error);
      toast({ title: "Error", description: "Failed to submit review", variant: "destructive" });
      return false;
    }
  }, [user, course?.id, userReview, toast]);

  const handleDeleteReview = useCallback(async () => {
    if (!userReview) return false;

    try {
      await supabase.from("course_reviews").delete().eq("id", userReview.id);
      setUserReview(null);
      setReviews(prev => prev.filter(r => r.id !== userReview.id));
      toast({ title: "Review deleted", description: "Your review has been removed" });
      return true;
    } catch (error) {
      console.error("Error deleting review:", error);
      return false;
    }
  }, [userReview, toast]);

  const handleViewNotes = useCallback(() => {
    if (course) {
      window.open(`/courses/${course.id}/notes`, '_blank');
    }
  }, [course]);

  // Calculate loading state - once loaded, stay loaded (prevent tab refocus flicker)
  const isCurrentlyLoading = authLoading || careerLoading || dataLoading;
  const showLoading = hasLoadedOnce ? false : isCurrentlyLoading;

  // Loading state
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

  // No data
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

        {/* Header */}
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
            You've successfully completed all lessons in this course
          </p>
          
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Completed on {format(completionData.completionDate, 'MMMM d, yyyy')}
            </span>
            <span>•</span>
            <span>100% progress</span>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Certificate */}
        <section className="mb-8">
          <CertificateCard
            learnerName={learnerName}
            courseName={course.name}
            completionDate={completionData.completionDate}
            courseId={course.id}
          />
        </section>

        {/* Summary */}
        <section className="mb-8">
          <CourseSummaryCard
            lessonsCompleted={completionData.lessonsCompleted}
            totalHours={completionData.totalHours}
            skills={completionData.skills}
          />
        </section>

        {/* Engagement */}
        <section className="mb-8">
          <EngagementCard
            courseId={course.id}
            courseSlug={course.slug}
            hasExistingReview={!!userReview}
            onViewNotes={handleViewNotes}
            reviews={reviews}
            averageRating={averageRating}
            userReview={userReview}
            onSubmitReview={handleSubmitReview}
            onDeleteReview={handleDeleteReview}
          />
        </section>

        {/* Next Steps */}
        <section className="mb-8">
          <NextStepsCard
            recommendedCourse={nextCourse ? {
              ...nextCourse,
              linkOverride: `/career-board/${careerSlugForPath}/course/${nextCourse.slug}`,
            } : undefined}
          />
        </section>
      </div>
  );
};

export default CareerCourseCompleted;
