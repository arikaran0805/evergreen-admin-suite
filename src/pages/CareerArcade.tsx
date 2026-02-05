/**
 * Career Arcade Page
 * 
 * Shell-compatible version of Arcade for use inside CareerBoardLayout.
 * This is the DEFAULT view when returning users access the Career Board.
 * 
 * ARCHITECTURE:
 * - Renders WITHOUT Layout wrapper (shell provides header/layout)
 * - Inherits career context from CareerBoardProvider
 * - Shows career progress and roadmap
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCareers } from "@/hooks/useCareers";
import { useCareerBoard } from "@/contexts/CareerBoardContext";
import { useAuth } from "@/hooks/useAuth";
import { CareerSelectionDialog } from "@/components/CareerSelectionDialog";
import { CareerProgressChart } from "@/components/CareerProgressChart";
import { Target, Trophy, ChevronRight, Sparkles, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const CareerArcade = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { career, careerCourses } = useCareerBoard();
  const { getCareerCourseSlugs, getCareerSkills, getSkillContributionsForCourse, allCourses } = useCareers();
  
  const [careerDialogOpen, setCareerDialogOpen] = useState(false);
  const [courseProgressMap, setCourseProgressMap] = useState<Record<string, { completed: number; total: number }>>({});
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    const fetchProgressData = async () => {
      if (!user?.id) {
        setDataLoading(false);
        return;
      }

      try {
        // Fetch enrollments
        const { data: enrollments } = await supabase
          .from("course_enrollments")
          .select("course_id")
          .eq("user_id", user.id);

        if (enrollments) {
          setEnrolledCourseIds(enrollments.map(e => e.course_id));
        }

        // Fetch all lesson progress
        const { data: lessonProgress } = await supabase
          .from("lesson_progress")
          .select("course_id, completed")
          .eq("user_id", user.id)
          .eq("completed", true);

        // Fetch all lessons from course_lessons table
        const { data: lessons } = await supabase
          .from("course_lessons" as any)
          .select("id, course_id")
          .eq("is_published", true)
          .is("deleted_at", null) as { data: { id: string; course_id: string }[] | null };

        if (lessonProgress && lessons) {
          const lessonCountByCourse: Record<string, number> = {};
          const completedByCourse: Record<string, number> = {};

          lessons.forEach(lesson => {
            if (lesson.course_id) {
              lessonCountByCourse[lesson.course_id] = (lessonCountByCourse[lesson.course_id] || 0) + 1;
            }
          });

          lessonProgress.forEach(progress => {
            completedByCourse[progress.course_id] = (completedByCourse[progress.course_id] || 0) + 1;
          });

          // Build progress map by course slug
          const progressMap: Record<string, { completed: number; total: number }> = {};
          allCourses.forEach(course => {
            progressMap[course.slug] = {
              completed: completedByCourse[course.id] || 0,
              total: lessonCountByCourse[course.id] || 0,
            };
          });
          setCourseProgressMap(progressMap);
        }
      } catch (error) {
        console.error("Error fetching progress data:", error);
      } finally {
        setDataLoading(false);
      }
    };

    fetchProgressData();
  }, [user?.id, allCourses]);

  const careerCourseSlugs = career ? getCareerCourseSlugs(career.id) : [];
  const skills = career ? getCareerSkills(career.id) : [];

  // Build journey steps from career courses
  const journeySteps = careerCourseSlugs.map((slug, index) => {
    const course = allCourses.find(c => c.slug === slug);
    if (!course) return null;

    const progress = courseProgressMap[slug] || { completed: 0, total: 0 };
    const isCompleted = progress.total > 0 && progress.completed >= progress.total;
    const isStarted = progress.completed > 0;
    const isEnrolled = enrolledCourseIds.includes(course.id);
    const progressPercent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

    // Get skills this course contributes to
    const contributions = getSkillContributionsForCourse(career!.id, slug);

    return {
      id: course.id,
      slug: course.slug,
      name: course.name,
      description: course.description,
      image: course.featured_image,
      isCompleted,
      isStarted,
      isEnrolled,
      progress: progressPercent,
      lessonCount: progress.total,
      completedLessons: progress.completed,
      skills: contributions.map(c => c.skill_name),
      order: index + 1,
    };
  }).filter(Boolean);

  const handleCareerSelect = async (careerSlug: string) => {
    if (user?.id) {
      await supabase
        .from("profiles")
        .update({ selected_career: careerSlug } as any)
        .eq("id", user.id);
    }
    // Navigate to new career board
    navigate(`/career-board/${careerSlug}`);
  };

  // Calculate overall career readiness
  const calculateReadiness = () => {
    if (!skills.length || !career) return 0;
    
    let weightedSum = 0;
    let totalWeight = 0;
    
    skills.forEach(skill => {
      let skillValue = 0;
      
      careerCourseSlugs.forEach(courseSlug => {
        const contributions = getSkillContributionsForCourse(career.id, courseSlug);
        const contribution = contributions.find(c => c.skill_name === skill.skill_name);
        
        if (contribution) {
          const progress = courseProgressMap[courseSlug];
          if (progress && progress.total > 0) {
            const completionRatio = progress.completed / progress.total;
            skillValue += contribution.contribution * completionRatio;
          }
        }
      });
      
      const value = Math.min(Math.round(skillValue), 100);
      const weight = skill.weight || 25;
      weightedSum += value * weight;
      totalWeight += weight;
    });
    
    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  };

  const readinessPercent = calculateReadiness();

  // Loading state
  if (dataLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-36" />
          </div>
          <Skeleton className="h-[400px] w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Trophy className="h-8 w-8 text-primary" />
            Arcade
          </h1>
          <p className="text-muted-foreground">
            Your journey to becoming a {career?.name || "professional"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Continue Learning - Primary CTA */}
          {careerCourseSlugs.length > 0 && (
            <Button 
              onClick={() => navigate(`/career-board/${career?.slug}/course/${careerCourseSlugs[0]}`)}
              className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white shadow-md"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Continue Learning
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          <Button variant="outline" onClick={() => setCareerDialogOpen(true)}>
            <Target className="h-4 w-4 mr-2" />
            Change Career Path
          </Button>
        </div>
      </div>

      {/* Career Progress Chart */}
      {journeySteps.length > 0 ? (
        <CareerProgressChart
          journeySteps={journeySteps.filter(Boolean) as any}
          readinessPercent={readinessPercent}
          careerName={career?.name || "Career"}
          careerSlug={career?.slug || ""}
          totalLearningHours={120}
        />
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Target className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No courses in this career path</h3>
            <p className="text-muted-foreground mb-4">
              Select a different career path or wait for courses to be added.
            </p>
            <Button onClick={() => setCareerDialogOpen(true)}>
              Choose Career Path
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Career Selection Dialog */}
      <CareerSelectionDialog
        open={careerDialogOpen}
        onOpenChange={setCareerDialogOpen}
        selectedCareerSlug={career?.slug || ""}
        onCareerSelect={handleCareerSelect}
      />
    </div>
  );
};

export default CareerArcade;
