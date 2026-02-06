import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Zap,
  Clock,
  Brain,
  Code2,
  Database,
  Bug,
  BarChart3,
  Lightbulb,
  ArrowRight,
  Target,
  Calendar,
  Rocket,
  BookOpen,
  Cpu,
  Globe,
  Terminal,
  ChevronRight,
} from "lucide-react";
import { usePublishedPracticeSkills } from "@/hooks/usePracticeSkills";
import { useSkillsProgress } from "@/hooks/useSkillsProgress";
import { useActiveLabsProgress } from "@/hooks/useActiveLabsProgress";
import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";

interface PracticeLabProps {
  enrolledCourses: any[];
  userId?: string;
}

// Icon mapping for dynamic icons
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Brain,
  Database,
  BarChart3,
  Lightbulb,
  Code2,
  Bug,
  Target,
  Cpu,
  Globe,
  Terminal,
};

export function PracticeLab({ enrolledCourses, userId }: PracticeLabProps) {
  const navigate = useNavigate();
  const { data: skills, isLoading: skillsLoading } = usePublishedPracticeSkills();
  
  const skillIds = useMemo(() => (skills || []).map(s => s.id), [skills]);
  const { data: progressMap } = useSkillsProgress(userId, skillIds);

  // Extract course IDs from enrollments for progress lookup
  const enrolledCourseIds = useMemo(
    () => enrolledCourses.map((e) => e.courses?.id).filter(Boolean) as string[],
    [enrolledCourses]
  );
  const { data: labProgressMap, isLoading: labProgressLoading } =
    useActiveLabsProgress(userId, enrolledCourseIds);

  // Filter: only show labs where 0% < progress < 100%
  const activeLabs = useMemo(() => {
    if (!labProgressMap) return [];
    return enrolledCourses.filter((enrollment) => {
      const courseId = enrollment.courses?.id;
      if (!courseId) return false;
      const progress = labProgressMap.get(courseId);
      if (!progress) return false;
      return progress.percentage > 0 && progress.percentage < 100;
    });
  }, [enrolledCourses, labProgressMap]);

  const handleSkillClick = (skillSlug: string) => {
    navigate(`/practice/${skillSlug}`);
  };

  // Empty state for new users
  if (!userId) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-10 py-12">
      {/* Hero Section */}
      <section className="text-center py-8 px-4 rounded-2xl bg-gradient-to-br from-primary/5 via-background to-accent/5 border border-border/50">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Practice what matters — based on your learning
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            Personalized exercises, coding challenges, and projects to strengthen memory
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" className="px-8 gap-2 text-base">
              <Zap className="h-5 w-5" />
              Start Practicing
            </Button>
            <Button variant="ghost" size="lg" className="gap-2 text-muted-foreground">
              Browse all labs
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Your Active Labs */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Your Active Labs</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 ml-7">
              Labs you're actively practicing and improving
            </p>
          </div>
          {activeLabs.length > 3 && (
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              View all <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
        
        {labProgressLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="overflow-hidden border-0 shadow-lg h-[160px]">
                <div className="flex h-full">
                  <div className="w-1/3 bg-muted animate-pulse" />
                  <div className="w-2/3 bg-card p-4">
                    <div className="h-3 w-20 bg-muted animate-pulse rounded mb-2" />
                    <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : activeLabs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeLabs.slice(0, 6).map((enrollment) => {
              const course = enrollment.courses;
              if (!course) return null;
              const labProgress = labProgressMap?.get(course.id);
              const progress = labProgress?.percentage ?? 0;
              const lastPracticedAt = labProgress?.lastPracticedAt;
              const lastPracticed = lastPracticedAt
                ? formatDistanceToNow(new Date(lastPracticedAt), { addSuffix: true })
                : "Not yet";
              
              return (
                <ActiveLabCard
                  key={enrollment.id}
                  name={course.name}
                  level={course.level}
                  lessonCount={labProgress?.total || 0}
                  completedLessons={labProgress?.completed || 0}
                  progress={progress}
                  lastPracticed={lastPracticed}
                  onClick={() => navigate(`/course/${course.slug}`)}
                />
              );
            })}
          </div>
        ) : (
          <Card className="bg-muted/30">
            <CardContent className="text-center py-8">
              <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                {enrolledCourses.length === 0
                  ? "Enroll in courses to unlock practice labs"
                  : "Start a lesson to see your active labs here"}
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Practice by Skill */}
      <section>
        <h2 className="text-xl font-bold mb-6">Practice Skills</h2>
        {skillsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="overflow-hidden border-0 shadow-lg h-[160px]">
                <div className="flex h-full">
                  <div className="w-1/3 bg-muted animate-pulse" />
                  <div className="w-2/3 bg-card p-4">
                    <div className="h-3 w-20 bg-muted animate-pulse rounded mb-2" />
                    <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : skills && skills.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {skills.map((skill) => {
              const Icon = iconMap[skill.icon] || Code2;
              const skillProgress = progressMap?.get(skill.id);
              return (
                <SkillCard
                  key={skill.id}
                  name={skill.name}
                  slug={skill.slug}
                  icon={Icon}
                  description={skill.description}
                  progress={skillProgress?.percentage ?? 0}
                  totalProblems={skillProgress?.totalProblems ?? 0}
                  solvedProblems={skillProgress?.solvedProblems ?? 0}
                  onClick={() => handleSkillClick(skill.slug)}
                />
              );
            })}
          </div>
        ) : (
          <Card className="bg-muted/30">
            <CardContent className="text-center py-8">
              <Code2 className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                No practice skills available yet.
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

// Card matching Library CourseCard design for Active Labs
function ActiveLabCard({
  name,
  level,
  lessonCount,
  completedLessons,
  progress,
  lastPracticed,
  onClick,
}: {
  name: string;
  level?: string | null;
  lessonCount: number;
  completedLessons: number;
  progress: number;
  lastPracticed: string;
  onClick: () => void;
}) {
  return (
    <Card
      className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group border-0 shadow-lg h-[160px]"
      onClick={onClick}
    >
      <div className="flex h-full">
        {/* Left Section - Dark */}
        <div className="w-1/3 p-4 flex flex-col justify-between" style={{ background: '#14532d' }}>
          <div>
            <span className="text-[10px] font-medium tracking-wider text-slate-400 uppercase">
              Practice Lab
            </span>
            <h3 className="text-sm font-semibold text-white mt-1 leading-tight line-clamp-3">
              {name}
            </h3>
          </div>
          <div className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors text-xs mt-2">
            <span>View all</span>
            <ChevronRight className="h-3 w-3" />
          </div>
        </div>

        {/* Right Section - Light */}
        <div className="w-2/3 bg-card p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                {level || "Beginner"} • {completedLessons}/{lessonCount} Lessons
              </span>
              <span className="text-[10px] text-muted-foreground">{progress}%</span>
            </div>
            <div className="w-full h-1 bg-muted rounded-full overflow-hidden mb-2">
              <div 
                className="h-full rounded-full transition-all"
                style={{ width: `${progress}%`, background: '#14532d' }}
              />
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Calendar className="h-3 w-3" />
              Last practiced: {lastPracticed}
            </p>
          </div>
          
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span className="text-xs">
                {Math.max(1, Math.round((lessonCount * 15) / 60))}h
              </span>
            </div>
            <Button 
              variant="default" 
              size="sm"
              className="text-white rounded-full px-4 h-7 text-xs hover:opacity-90"
              style={{ background: '#14532d' }}
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
            >
              Continue
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// Card matching Library CourseCard design for Practice Skills
function SkillCard({
  name,
  slug,
  icon: Icon,
  description,
  progress,
  totalProblems,
  solvedProblems,
  onClick,
}: {
  name: string;
  slug: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string | null;
  progress: number;
  totalProblems: number;
  solvedProblems: number;
  onClick: () => void;
}) {
  return (
    <Card
      className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group border-0 shadow-lg"
      onClick={onClick}
    >
      <div className="flex flex-col h-full">
        {/* Top Section - Dark */}
        <div className="p-4 flex items-center gap-3" style={{ background: '#14532d' }}>
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-medium tracking-wider text-slate-400 uppercase">
              Skill
            </span>
            <h3 className="text-sm font-semibold text-white leading-tight truncate">
              {name}
            </h3>
          </div>
        </div>

        {/* Bottom Section - Light */}
        <div className="bg-card p-4 flex flex-col justify-between flex-1">
          <div>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
              {description || `Sharpen your ${name} skills with hands-on challenges`}
            </p>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                Progress
              </span>
              <span className="text-[10px] text-muted-foreground">{progress}%</span>
            </div>
            <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all"
                style={{ width: `${progress}%`, background: '#14532d' }}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Code2 className="h-3 w-3" />
              <span className="text-xs">{solvedProblems}/{totalProblems} Solved</span>
            </div>
            <Button 
              variant="default" 
              size="sm"
              className="text-white rounded-full px-4 h-7 text-xs hover:opacity-90"
              style={{ background: '#14532d' }}
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
            >
              {progress > 0 ? "Continue" : "Start"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// Empty state component for new users
function EmptyState() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mx-auto mb-6">
          <Zap className="h-10 w-10 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold mb-3">Welcome to Practice Lab</h1>
        <p className="text-muted-foreground mb-6">
          This is where you strengthen your learning through hands-on exercises, 
          coding challenges, and real-world projects. Start with a quick 5-minute 
          practice to get a feel for it.
        </p>
        <div className="space-y-3">
          <Button size="lg" className="w-full gap-2">
            <Rocket className="h-5 w-5" />
            Start your first 5-minute practice
          </Button>
          <Button variant="outline" size="lg" className="w-full gap-2">
            <BookOpen className="h-5 w-5" />
            Explore courses first
          </Button>
        </div>
        
        <div className="mt-8 pt-8 border-t">
          <p className="text-sm text-muted-foreground mb-4">What you'll find here:</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">Quick Exercises</p>
            </div>
            <div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Code2 className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">Coding Challenges</p>
            </div>
            <div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Rocket className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">Mini Projects</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PracticeLab;
