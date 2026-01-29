/**
 * CareerCourseCompleted - Course Completion Page within Career Board Shell
 * 
 * Route: /career-board/:careerId/course/:courseSlug/completed
 * 
 * Same celebration experience as CourseCompleted but rendered
 * inside the Career Board shell with CareerScopedHeader.
 */

import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link, useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCareerBoard } from "@/contexts/CareerBoardContext";
import { format } from "date-fns";
import { PartyPopper, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
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

interface OutletContextType {
  setCurrentCourseSlug: (slug: string | null) => void;
  isHeaderVisible: boolean;
  showAnnouncement: boolean;
}

const CareerCourseCompleted = () => {
  const { courseSlug } = useParams<{ courseSlug: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { career, careerCourses, setCurrentCourseSlug } = useCareerBoard();
  const outletContext = useOutletContext<OutletContextType>();

  const [course, setCourse] = useState<CourseData | null>(null);
  const [completionData, setCompletionData] = useState<CompletionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [learnerName, setLearnerName] = useState("");
  
  // Review state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [averageRating, setAverageRating] = useState(0);
  
  // Recommended next course
  const [nextCourse, setNextCourse] = useState<CourseData | null>(null);

  // Update CareerBoardLayout's current course slug
  useEffect(() => {
    if (courseSlug) {
      setCurrentCourseSlug(courseSlug);
      outletContext?.setCurrentCourseSlug?.(courseSlug);
    }
    return () => {
      setCurrentCourseSlug(null);
      outletContext?.setCurrentCourseSlug?.(null);
    };
  }, [courseSlug, setCurrentCourseSlug, outletContext]);

  // Fetch course and completion data
  useEffect(() => {
    const fetchData = async () => {
      if (!courseSlug || !user) return;

      try {
        // Fetch course info by slug
        const { data: courseData, error: courseError } = await supabase
          .from("courses")
          .select("id, name, slug, description, learning_hours")
          .eq("slug", courseSlug)
          .maybeSingle();

        if (courseError || !courseData) {
          console.error("Course not found:", courseError);
          navigate("/arcade");
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

        // Check if course is actually completed
        const { count: totalLessons } = await supabase
          .from("posts")
          .select("*", { count: "exact", head: true })
          .eq("category_id", courseData.id)
          .eq("status", "published")
          .is("deleted_at", null);

        const { count: completedLessons } = await supabase
          .from("lesson_progress")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("course_id", courseData.id)
          .eq("completed", true);

        const total = totalLessons || 0;
        const completed = completedLessons || 0;

        if (total === 0 || completed < total) {
          // Not completed - redirect to course page within career board
          toast({
            title: "Course not completed",
            description: "Complete all lessons to view this page.",
            variant: "destructive",
          });
          if (career) {
            navigate(`/career-board/${career.slug}/course/${courseSlug}`);
          } else {
            navigate(`/course/${courseSlug}`);
          }
          return;
        }

        setIsComplete(true);

        // Get total time spent on this course
        const { data: timeData } = await supabase
          .from("lesson_time_tracking")
          .select("duration_seconds")
          .eq("user_id", user.id)
          .eq("course_id", courseData.id);

        const totalSeconds = timeData?.reduce((sum, t) => sum + t.duration_seconds, 0) || 0;
        const totalHours = totalSeconds / 3600;

        // Get completion date (most recent lesson completion)
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

        // Fetch skills from career_courses skill_contributions
        const { data: careerCoursesData } = await supabase
          .from("career_courses")
          .select("career_id, skill_contributions")
          .eq("course_id", courseData.id)
          .is("deleted_at", null);

        let skills: string[] = [];
        if (careerCoursesData && careerCoursesData.length > 0) {
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
            id,
            rating,
            review,
            created_at,
            user_id,
            profiles:user_id (
              full_name,
              avatar_url
            )
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

        // Fetch recommended next course (from same career path)
        if (career && careerCourses.length > 1) {
          const currentIndex = careerCourses.findIndex(c => c.slug === courseSlug);
          const nextCourseInCareer = careerCourses[currentIndex + 1];
          
          if (nextCourseInCareer) {
            const { data: nextCourseData } = await supabase
              .from("courses")
              .select("id, name, slug, description, learning_hours")
              .eq("id", nextCourseInCareer.id)
              .maybeSingle();
            
            if (nextCourseData) {
              setNextCourse(nextCourseData);
            }
          }
        }

      } catch (error) {
        console.error("Error fetching completion data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      if (!user) {
        navigate("/login", { state: { from: `/career-board/${career?.slug}/course/${courseSlug}/completed` } });
      } else {
        fetchData();
      }
    }
  }, [courseSlug, user, authLoading, navigate, toast, career, careerCourses]);

  // Handle review submission
  const handleSubmitReview = async (rating: number, review: string) => {
    if (!user || !course) return false;

    try {
      if (userReview) {
        const { error } = await supabase
          .from("course_reviews")
          .update({ rating, review, updated_at: new Date().toISOString() })
          .eq("id", userReview.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("course_reviews")
          .insert({
            course_id: course.id,
            user_id: user.id,
            rating,
            review,
          });

        if (error) throw error;
      }

      toast({
        title: "Review submitted",
        description: "Thank you for your feedback!",
      });

      // Refresh reviews
      const { data: reviewsData } = await supabase
        .from("course_reviews")
        .select(`
          id,
          rating,
          review,
          created_at,
          user_id,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .eq("course_id", course.id)
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

      return true;
    } catch (error) {
      console.error("Error submitting review:", error);
      toast({
        title: "Error",
        description: "Failed to submit review",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleDeleteReview = async () => {
    if (!userReview) return false;

    try {
      const { error } = await supabase
        .from("course_reviews")
        .delete()
        .eq("id", userReview.id);

      if (error) throw error;

      setUserReview(null);
      setReviews(reviews.filter(r => r.id !== userReview.id));

      toast({
        title: "Review deleted",
        description: "Your review has been removed",
      });

      return true;
    } catch (error) {
      console.error("Error deleting review:", error);
      return false;
    }
  };

  const handleViewNotes = () => {
    if (course) {
      window.open(`/courses/${course.id}/notes`, '_blank');
    }
  };

  // Build back link within career board
  const backLink = career && courseSlug 
    ? `/career-board/${career.slug}/course/${courseSlug}`
    : course 
      ? `/course/${course.slug}`
      : "/arcade";

  // Build next course link within career board
  const nextCourseLink = useMemo(() => {
    if (!nextCourse || !career) return null;
    return `/career-board/${career.slug}/course/${nextCourse.slug}`;
  }, [nextCourse, career]);

  if (loading || authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!course || !completionData || !isComplete) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Back link */}
        <Link
          to={backLink}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Course
        </Link>

        {/* 1. COURSE COMPLETION HEADER */}
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

        {/* 2. CERTIFICATE SECTION */}
        <section className="mb-8">
          <CertificateCard
            learnerName={learnerName}
            courseName={course.name}
            completionDate={completionData.completionDate}
            courseId={course.id}
          />
        </section>

        {/* 3. COURSE SUMMARY */}
        <section className="mb-8">
          <CourseSummaryCard
            lessonsCompleted={completionData.lessonsCompleted}
            totalHours={completionData.totalHours}
            skills={completionData.skills}
          />
        </section>

        {/* 4. ENGAGEMENT & REFLECTION */}
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

        {/* 5. NEXT STEPS */}
        <section className="mb-8">
          <NextStepsCard
            recommendedCourse={nextCourse ? {
              ...nextCourse,
              linkOverride: nextCourseLink || undefined,
            } : undefined}
          />
        </section>
      </div>
    </div>
  );
};

export default CareerCourseCompleted;
