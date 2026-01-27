import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useCareers } from "@/hooks/useCareers";
import { useCareerWelcome } from "@/hooks/useCareerWelcome";
import { CareerSelectionDialog } from "@/components/CareerSelectionDialog";
import { CareerRoadmapChart } from "@/components/CareerRoadmapChart";
import { CareerProgressChart } from "@/components/CareerProgressChart";
import { CareerWelcomePage } from "@/components/career";
import * as Icons from "lucide-react";
import { Target, Trophy, ChevronRight, Lock, CheckCircle2, Circle, Sparkles, Eye } from "lucide-react";

const Arcade = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedCareer, setSelectedCareer] = useState<string>("data-science");
  const [careerDialogOpen, setCareerDialogOpen] = useState(false);
  const [courseProgressMap, setCourseProgressMap] = useState<Record<string, { completed: number; total: number }>>({});
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [showCareerOverview, setShowCareerOverview] = useState(false);
  const navigate = useNavigate();
  
  const { getCareerBySlug, getCareerCourseSlugs, getCareerSkills, getSkillContributionsForCourse, careers, allCourses, loading: careersLoading } = useCareers();
  
  // Get career object first to get ID for welcome check
  const career = getCareerBySlug(selectedCareer);
  
  // Check if user has seen welcome page for this career
  const { hasSeenWelcome, loading: welcomeLoading, markWelcomeSeen } = useCareerWelcome(career?.id);

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

  // Show loading state while checking welcome status
  if (careersLoading || welcomeLoading) {
    return (
      <Layout>
        <SEOHead
          title="Career Board | Your Learning Journey"
          description="Track your career readiness journey and see your progress toward becoming job-ready."
        />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-pulse text-muted-foreground">Loading your career journey...</div>
          </div>
        </div>
      </Layout>
    );
  }

  // Show Career Welcome Page for first-time visitors OR when manually viewing overview
  if ((hasSeenWelcome === false || showCareerOverview) && career) {
    return (
      <CareerWelcomePage
        career={career}
        skills={skills}
        onStart={() => {
          if (!showCareerOverview) {
            markWelcomeSeen();
          }
          setShowCareerOverview(false);
        }}
      />
    );
  }

  return (
    <Layout>
      <SEOHead
        title="Career Board | Your Learning Journey"
        description="Track your career readiness journey and see your progress toward becoming job-ready."
      />

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
          <div className="flex gap-2">
            {/* View Career Overview - Low priority revisit option */}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowCareerOverview(true)}
              className="text-muted-foreground"
            >
              <Eye className="h-4 w-4 mr-2" />
              Career Overview
            </Button>
            <Button variant="outline" onClick={() => setCareerDialogOpen(true)}>
              <Target className="h-4 w-4 mr-2" />
              Change Career Path
            </Button>
          </div>
        </div>

        {/* Career Progress Chart - New sequential learning visualization */}
        {journeySteps.length > 0 ? (
          <CareerProgressChart
            journeySteps={journeySteps.filter(Boolean) as any}
            readinessPercent={readinessPercent}
            careerName={career?.name || "Career"}
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
          selectedCareerSlug={selectedCareer}
          onCareerSelect={handleCareerSelect}
        />
      </div>
    </Layout>
  );
};

export default Arcade;
