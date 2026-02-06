import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Zap,
  Clock,
  Brain,
  Code2,
  Database,
  Bug,
  BarChart3,
  Lightbulb,
  Play,
  ArrowRight,
  Target,
  Calendar,
  TrendingUp,
  Rocket,
  BookOpen,
  Cpu,
  Globe,
  Terminal,
  ChevronRight,
  Users,
  Star,
} from "lucide-react";
import { usePublishedPracticeSkills } from "@/hooks/usePracticeSkills";

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
  
  const hasActivity = enrolledCourses.length > 0;

  const handleSkillClick = (skillSlug: string) => {
    navigate(`/practice/${skillSlug}`);
  };

  // Empty state for new users
  if (!hasActivity && !userId) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-8 py-8">
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
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Your Active Labs</h2>
          </div>
          {enrolledCourses.length > 3 && (
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              View all <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
        
        {enrolledCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrolledCourses.slice(0, 6).map((enrollment, index) => {
              const course = enrollment.courses;
              if (!course) return null;
              
              // Mock progress data
              const progress = Math.floor(Math.random() * 80) + 10;
              const lastPracticed = index === 0 ? "Today" : index === 1 ? "Yesterday" : `${index + 1} days ago`;
              const hasWeakAreas = index < 2;
              
              return (
                <ActiveLabCard
                  key={enrollment.id}
                  name={course.name}
                  level={course.level}
                  lessonCount={course.lessonCount || 0}
                  progress={progress}
                  lastPracticed={lastPracticed}
                  hasWeakAreas={hasWeakAreas}
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
                Enroll in courses to unlock practice labs
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
            {skills.map((skill, index) => {
              const Icon = iconMap[skill.icon] || Code2;
              // Mock progress - in real app this would come from learner_problem_progress
              const mockProgress = [0, 25, 60, 40, 10, 0, 75, 30][index % 8];
              return (
                <SkillCard
                  key={skill.id}
                  name={skill.name}
                  slug={skill.slug}
                  icon={Icon}
                  description={skill.description}
                  progress={mockProgress}
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
  progress,
  lastPracticed,
  hasWeakAreas,
  onClick,
}: {
  name: string;
  level?: string | null;
  lessonCount: number;
  progress: number;
  lastPracticed: string;
  hasWeakAreas: boolean;
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
                {level || "Beginner"} • {lessonCount} Lessons
              </span>
              <span className="text-[10px] text-muted-foreground">{progress}%</span>
            </div>
            <div className="w-full h-1 bg-muted rounded-full overflow-hidden mb-2">
              <div 
                className="h-full rounded-full transition-all"
                style={{ width: `${progress}%`, background: '#14532d' }}
              />
            </div>
            {hasWeakAreas && (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Weak areas: Loops, Conditionals
              </p>
            )}
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
              {progress > 0 ? "Continue" : "Start"}
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
  onClick,
}: {
  name: string;
  slug: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string | null;
  progress: number;
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
              Skill
            </span>
            <h3 className="text-sm font-semibold text-white mt-1 leading-tight line-clamp-3">
              {name}
            </h3>
          </div>
          <div className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors text-xs mt-2">
            <span>Explore</span>
            <ChevronRight className="h-3 w-3" />
          </div>
        </div>

        {/* Right Section - Light */}
        <div className="w-2/3 bg-card p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-3 w-3 text-primary" />
                </div>
                <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                  Practice
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">{progress}%</span>
            </div>
            <div className="w-full h-1 bg-muted rounded-full overflow-hidden mb-2">
              <div 
                className="h-full rounded-full transition-all"
                style={{ width: `${progress}%`, background: '#14532d' }}
              />
            </div>
            <p className="text-xs text-foreground line-clamp-2">
              {description || `Sharpen your ${name} skills with hands-on challenges`}
            </p>
          </div>
          
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Code2 className="h-3 w-3" />
              <span className="text-xs">Problems</span>
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
