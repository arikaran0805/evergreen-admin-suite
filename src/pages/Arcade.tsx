import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCareers } from "@/hooks/useCareers";
import { CareerSelectionDialog } from "@/components/CareerSelectionDialog";
import { CareerProgressChart } from "@/components/CareerProgressChart";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Target, Trophy, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

// Session storage key for career flow tracking
const ENTRY_FLOW_KEY = "lovable_entry_flow";

/**
 * Mark navigation as career flow (preserves immersive mode)
 */
const markAsCareerFlow = () => {
  sessionStorage.setItem(ENTRY_FLOW_KEY, "career_flow");
};

/**
 * Clear career flow (exits immersive mode)
 */
const clearCareerFlow = () => {
  sessionStorage.removeItem(ENTRY_FLOW_KEY);
};

const Arcade = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedCareer, setSelectedCareer] = useState<string>("data-science");
  const [careerDialogOpen, setCareerDialogOpen] = useState(false);
  const [courseProgressMap, setCourseProgressMap] = useState<Record<string, { completed: number; total: number }>>({});
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const navigate = useNavigate();
  
  const { getCareerBySlug, getCareerCourseSlugs, getCareerSkills, getSkillContributionsForCourse, careers, allCourses } = useCareers();

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      
      setUserId(session.user.id);

      // Fetch user's selected career
      const { data: profile } = await supabase
        .from("profiles")
        .select("selected_career")
        .eq("id", session.user.id)
        .single();

      if (profile?.selected_career) {
        setSelectedCareer(profile.selected_career as string);
      }

      // Fetch enrollments
      const { data: enrollments } = await supabase
        .from("course_enrollments")
        .select("course_id")
        .eq("user_id", session.user.id);

      if (enrollments) {
        setEnrolledCourseIds(enrollments.map(e => e.course_id));
      }

      // Fetch all lesson progress
      const { data: lessonProgress } = await supabase
        .from("lesson_progress")
        .select("course_id, completed")
        .eq("user_id", session.user.id)
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
    };

    fetchUserData();
  }, [navigate, allCourses]);

  const career = getCareerBySlug(selectedCareer);
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
    setSelectedCareer(careerSlug);
    if (userId) {
      await supabase
        .from("profiles")
        .update({ selected_career: careerSlug } as any)
        .eq("id", userId);
    }
  };

  // Handle course click - mark as career flow and navigate
  const handleCourseClick = (courseSlug: string) => {
    markAsCareerFlow();
    navigate(`/course/${courseSlug}`);
  };

  // Handle exit from career flow
  const handleExitCareerFlow = () => {
    clearCareerFlow();
    navigate('/profile');
  };

  // Calculate overall career readiness
  const calculateReadiness = () => {
    if (!skills.length) return 0;
    
    let weightedSum = 0;
    let totalWeight = 0;
    
    skills.forEach(skill => {
      let skillValue = 0;
      
      careerCourseSlugs.forEach(courseSlug => {
        const contributions = getSkillContributionsForCourse(career!.id, courseSlug);
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title="Career Board | Your Learning Journey"
        description="Track your career readiness journey and see your progress toward becoming job-ready."
      />

      {/* Announcement Bar */}
      <div className="fixed top-0 left-0 right-0 z-[60]">
        <AnnouncementBar onVisibilityChange={setShowAnnouncement} />
      </div>

      {/* Career Board Header - replaces global header in immersive mode */}
      <div className={cn(
        "fixed left-0 right-0 z-40 bg-muted/95 backdrop-blur-sm border-b border-border",
        showAnnouncement ? 'top-9' : 'top-0'
      )}>
        <div className="container mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-14 gap-8">
            {/* LEFT SIDE - Back + Title */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-muted-foreground hover:text-foreground"
                onClick={handleExitCareerFlow}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Back to Profile</span>
              </Button>
              <div className="flex items-center gap-3">
                <Trophy className="h-6 w-6 text-amber-500" />
                <div>
                  <h1 className="text-lg font-bold">Career Board</h1>
                  <p className="text-xs text-muted-foreground">
                    Your journey to becoming a {career?.name || "professional"}
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE - Actions */}
            <Button variant="outline" size="sm" onClick={() => setCareerDialogOpen(true)}>
              <Target className="h-4 w-4 mr-2" />
              Change Career Path
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - offset for fixed header */}
      <main className={cn(
        "flex-1 container mx-auto px-4 py-8",
        showAnnouncement ? 'pt-[6.5rem]' : 'pt-20'
      )}>
        {/* Career Progress Chart - New sequential learning visualization */}
        {journeySteps.length > 0 ? (
          <CareerProgressChart
            journeySteps={journeySteps.filter(Boolean) as any}
            readinessPercent={readinessPercent}
            careerName={career?.name || "Career"}
            totalLearningHours={120}
            onCourseClick={handleCourseClick}
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
          selectedCareerSlug={selectedCareer}
          onCareerSelect={handleCareerSelect}
        />
      </main>
    </div>
  );
};

export default Arcade;
