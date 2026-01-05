import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FlaskConical, Code2, Database, Terminal, Rocket, Sparkles, ListChecks, Briefcase } from "lucide-react";

const labCategories = [
  {
    id: "python",
    name: "Python Labs",
    description: "Practice Python programming with hands-on exercises and challenges",
    icon: Code2,
    tasks: 350,
    projects: 3,
    progress: 72,
    modules: { completed: 12, total: 16 },
    status: "in-progress",
    bgColor: "bg-pink-100 dark:bg-pink-950/40",
    badgeType: "Student",
  },
  {
    id: "sql",
    name: "SQL Labs",
    description: "Master database queries with interactive SQL challenges",
    icon: Database,
    tasks: 622,
    projects: 4,
    progress: 0,
    startDate: "20 July",
    status: "coming-soon",
    bgColor: "bg-cyan-100 dark:bg-cyan-950/40",
    badgeType: "Recommended",
  },
  {
    id: "cli",
    name: "Command Line Labs",
    description: "Learn terminal commands and shell scripting techniques",
    icon: Terminal,
    tasks: 350,
    projects: 5,
    progress: 0,
    startDate: "20 July",
    status: "coming-soon",
    bgColor: "bg-amber-100 dark:bg-amber-950/40",
    badgeType: "Popular",
  },
  {
    id: "projects",
    name: "Mini Projects",
    description: "Build real-world projects to solidify your skills",
    icon: Rocket,
    tasks: 350,
    projects: 3,
    progress: 0,
    startDate: "20 July",
    status: "coming-soon",
    bgColor: "bg-green-100 dark:bg-green-950/40",
    badgeType: "Student",
  },
];

const PracticeCard = ({ category }: { category: typeof labCategories[0] }) => {
  const Icon = category.icon;
  const isInProgress = category.status === "in-progress";

  return (
    <div className={`rounded-2xl p-6 ${category.bgColor} relative overflow-hidden`}>
      {/* Badge */}
      <Badge 
        variant="secondary" 
        className="bg-background/80 backdrop-blur-sm text-foreground border-0 mb-4"
      >
        {category.badgeType}
      </Badge>

      {/* Icon positioned top-right */}
      <div className="absolute top-4 right-4 w-20 h-20 rounded-2xl bg-gradient-to-br from-background/20 to-background/10 flex items-center justify-center">
        <Icon className="h-10 w-10 text-foreground/70" />
      </div>

      {/* Content */}
      <div className="pr-20">
        <h3 className="text-xl font-bold text-foreground mb-2">{category.name}</h3>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {category.description}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1.5">
            <ListChecks className="h-4 w-4" />
            <span>{category.tasks} tasks</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <Briefcase className="h-4 w-4" />
            <span>{category.projects} projects</span>
          </div>
        </div>
      </div>

      {/* Progress Section */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium text-foreground">{category.progress}%</span>
        </div>
        <Progress 
          value={category.progress} 
          className="h-2 bg-foreground/10" 
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-foreground/10">
        {isInProgress && category.modules ? (
          <span className="text-sm text-foreground">
            Modules: <strong>{category.modules.completed}/{category.modules.total}</strong>
          </span>
        ) : (
          <span className="text-sm text-foreground">
            Start date: <strong>{category.startDate}</strong>
          </span>
        )}
        <Button 
          className="rounded-full px-6"
          variant={isInProgress ? "default" : "secondary"}
        >
          {isInProgress ? "Continue" : "Apply"}
        </Button>
      </div>
    </div>
  );
};

const PracticeLab = () => {
  return (
    <Layout>
      <SEOHead
        title="Practice Lab | Hands-on Coding Practice"
        description="Practice your coding skills with interactive labs, challenges, and mini projects."
      />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 mb-4">
            <FlaskConical className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Practice Lab</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Reinforce your learning with hands-on coding exercises, SQL challenges, and real-world projects.
          </p>
        </div>

        {/* Lab Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {labCategories.map((category) => (
            <PracticeCard key={category.id} category={category} />
          ))}
        </div>

        {/* Features Preview */}
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-6 text-center">What to Expect</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { title: "Browser-based IDE", desc: "Code directly in your browser", icon: Code2 },
              { title: "Auto-grading", desc: "Instant feedback on your solutions", icon: Sparkles },
              { title: "Progress Tracking", desc: "Track your practice streak", icon: ListChecks },
            ].map((feature, i) => (
              <div key={i} className="text-center p-6 rounded-2xl bg-muted/30">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h4 className="font-semibold mb-1">{feature.title}</h4>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PracticeLab;
