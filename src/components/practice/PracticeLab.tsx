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
                <Card key={enrollment.id} className="group hover:shadow-md transition-all hover:border-primary/30">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm truncate">{course.name}</h4>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          Last practiced: {lastPracticed}
                        </p>
                      </div>
                      {progress === 0 && (
                        <Badge variant="secondary" className="text-xs bg-primary/10 text-primary shrink-0">
                          Recommended
                        </Badge>
                      )}
                    </div>
                    
                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                    
                    {hasWeakAreas && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Weak areas: Loops, Conditionals
                      </p>
                    )}
                    
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 gap-1">
                        <Play className="h-3.5 w-3.5" />
                        {progress > 0 ? "Continue" : "Start"}
                      </Button>
                      {hasWeakAreas && (
                        <Button size="sm" variant="outline" className="text-xs px-2">
                          Revise
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="bg-muted/50 border border-border/50">
                <CardContent className="p-5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : skills && skills.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {skills.map((skill) => {
              const Icon = iconMap[skill.icon] || Code2;
              return (
                <Card 
                  key={skill.id} 
                  className="bg-muted/50 border border-border/50 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group"
                  onClick={() => handleSkillClick(skill.slug)}
                >
                  <CardContent className="p-5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                      {skill.name}
                    </span>
                  </CardContent>
                </Card>
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
