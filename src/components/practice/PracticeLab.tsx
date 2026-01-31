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
  Trophy,
  Play,
  ArrowRight,
  Sparkles,
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

// Mock data for today's practice - in real app, this would come from AI/algorithm
const getTodaysPractice = (enrolledCourses: any[]) => {
  if (enrolledCourses.length === 0) return null;
  
  const course = enrolledCourses[0]?.courses;
  if (!course) return null;
  
  return {
    topic: `${course.name} – Core Concepts`,
    reason: "You viewed this recently but haven't practiced yet",
    estimatedTime: "10–15 mins",
    practiceType: "Mixed" as const,
    difficulty: "Medium",
  };
};

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

// Mini projects data
const miniProjects = [
  {
    id: "todo-app",
    title: "Build a Todo App",
    skills: ["JavaScript", "DOM", "Local Storage"],
    time: "2–3 hours",
    difficulty: "Beginner",
  },
  {
    id: "quiz-game",
    title: "Interactive Quiz Game",
    skills: ["Python", "Logic", "Data Structures"],
    time: "3–4 hours",
    difficulty: "Intermediate",
  },
  {
    id: "data-dashboard",
    title: "Data Analysis Dashboard",
    skills: ["SQL", "Charts", "Data Viz"],
    time: "4–5 hours",
    difficulty: "Intermediate",
  },
];

export function PracticeLab({ enrolledCourses, userId }: PracticeLabProps) {
  const navigate = useNavigate();
  const { data: skills, isLoading: skillsLoading } = usePublishedPracticeSkills();
  
  const todaysPractice = getTodaysPractice(enrolledCourses);
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
              Start Today's Practice
            </Button>
            <Button variant="ghost" size="lg" className="gap-2 text-muted-foreground">
              Browse all labs
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Today's Practice - Top Priority */}
      {todaysPractice ? (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Today's Practice</h2>
            <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
              Recommended for you
            </Badge>
          </div>
          <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">{todaysPractice.topic}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    <Lightbulb className="h-4 w-4 inline mr-1" />
                    {todaysPractice.reason}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {todaysPractice.estimatedTime}
                    </span>
                    <Badge variant="outline" className="font-normal">
                      {todaysPractice.practiceType}
                    </Badge>
                    <Badge variant="outline" className="font-normal bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                      {todaysPractice.difficulty}
                    </Badge>
                  </div>
                </div>
                <Button size="lg" className="shrink-0 gap-2">
                  <Play className="h-5 w-5" />
                  Start Practice
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      ) : (
        <DefaultChallengeCard />
      )}

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

      {/* Build Something Real - Mini Projects */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Rocket className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Build Something Real</h2>
          <Badge variant="outline" className="text-xs">Mini Projects</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {miniProjects.map((project) => (
            <Card key={project.id} className="group hover:shadow-md transition-all hover:border-primary/30">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      project.difficulty === "Beginner" 
                        ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
                        : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                    }`}
                  >
                    {project.difficulty}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {project.time}
                  </span>
                </div>
                
                <h3 className="font-semibold mb-2">{project.title}</h3>
                
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {project.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs font-normal bg-muted/50">
                      {skill}
                    </Badge>
                  ))}
                </div>
                
                <Button size="sm" variant="outline" className="w-full gap-1.5 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all">
                  <Trophy className="h-4 w-4" />
                  Start Project
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

// Default challenge card for when there's no personalized data
function DefaultChallengeCard() {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Today's Challenge</h2>
      </div>
      <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Beginner's Logic Challenge</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                A perfect starting point to warm up your brain and build confidence
              </p>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  5–10 mins
                </span>
                <Badge variant="outline" className="font-normal">
                  MCQs
                </Badge>
                <Badge variant="outline" className="font-normal bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                  Easy
                </Badge>
              </div>
            </div>
            <Button size="lg" className="shrink-0 gap-2">
              <Play className="h-5 w-5" />
              Start Challenge
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
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
                <Trophy className="h-5 w-5 text-primary" />
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
