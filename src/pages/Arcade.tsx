import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useCareers } from "@/hooks/useCareers";
import { CareerSelectionDialog } from "@/components/CareerSelectionDialog";
import * as Icons from "lucide-react";
import { Target, Trophy, ChevronRight, Lock, CheckCircle2, Circle, Sparkles } from "lucide-react";

const Arcade = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedCareer, setSelectedCareer] = useState<string>("data-science");
  const [careerDialogOpen, setCareerDialogOpen] = useState(false);
  const [courseProgressMap, setCourseProgressMap] = useState<Record<string, { completed: number; total: number }>>({});
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
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

      // Fetch all lessons
      const { data: lessons } = await supabase
        .from("posts")
        .select("id, category_id")
        .eq("status", "published");

      if (lessonProgress && lessons) {
        const lessonCountByCourse: Record<string, number> = {};
        const completedByCourse: Record<string, number> = {};

        lessons.forEach(lesson => {
          if (lesson.category_id) {
            lessonCountByCourse[lesson.category_id] = (lessonCountByCourse[lesson.category_id] || 0) + 1;
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
    <Layout>
      <SEOHead
        title="Career Arcade | Your Learning Journey"
        description="Track your career readiness journey and see your progress toward becoming job-ready."
      />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Trophy className="h-8 w-8 text-amber-500" />
              Career Arcade
            </h1>
            <p className="text-muted-foreground">
              Your journey to becoming a {career?.name || "professional"}
            </p>
          </div>
          <Button variant="outline" onClick={() => setCareerDialogOpen(true)}>
            <Target className="h-4 w-4 mr-2" />
            Change Career Path
          </Button>
        </div>

        {/* Overall Progress */}
        <Card className="mb-8 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-2">
                  {career?.name || "Career"} Readiness
                </h2>
                <p className="text-muted-foreground text-sm mb-4">
                  Complete courses to improve your career readiness score
                </p>
                <Progress value={readinessPercent} className="h-3" />
                <p className="text-sm text-muted-foreground mt-2">
                  {readinessPercent}% ready • {journeySteps.filter(s => s?.isCompleted).length} of {journeySteps.length} courses completed
                </p>
              </div>
              <div className="text-center">
                <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                  <span className="text-3xl font-bold text-primary">{readinessPercent}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Journey Path */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Your Learning Path
          </h3>

          <div className="relative">
            {/* Connection Line */}
            <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-border hidden md:block" />

            <div className="space-y-4">
              {journeySteps.map((step, index) => {
                if (!step) return null;

                const getStepIcon = () => {
                  if (step.isCompleted) return <CheckCircle2 className="h-5 w-5 text-green-500" />;
                  if (step.isStarted) return <Circle className="h-5 w-5 text-primary fill-primary/20" />;
                  return <Lock className="h-5 w-5 text-muted-foreground" />;
                };

                return (
                  <Card
                    key={step.id}
                    className={`relative transition-all hover:shadow-md cursor-pointer ${
                      step.isCompleted ? 'border-green-500/30 bg-green-500/5' :
                      step.isStarted ? 'border-primary/30' : ''
                    }`}
                    onClick={() => navigate(`/course/${step.slug}`)}
                  >
                    <CardContent className="p-4 md:p-6">
                      <div className="flex items-start gap-4">
                        {/* Step Indicator */}
                        <div className="hidden md:flex w-12 h-12 rounded-full bg-background border-2 items-center justify-center shrink-0 z-10">
                          {getStepIcon()}
                        </div>

                        {/* Course Image */}
                        <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-muted">
                          {step.image ? (
                            <img src={step.image} alt={step.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Icons.BookOpen className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <Badge variant="outline" className="mb-2">
                                Step {step.order}
                              </Badge>
                              <h4 className="font-semibold text-lg">{step.name}</h4>
                              {step.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                  {step.description}
                                </p>
                              )}
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                          </div>

                          {/* Progress */}
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-muted-foreground">
                                {step.completedLessons} / {step.lessonCount} lessons
                              </span>
                              <span className="font-medium">{step.progress}%</span>
                            </div>
                            <Progress value={step.progress} className="h-2" />
                          </div>

                          {/* Skills */}
                          {step.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {step.skills.map((skill) => (
                                <Badge key={skill} variant="secondary" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {journeySteps.length === 0 && (
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
        </div>

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
