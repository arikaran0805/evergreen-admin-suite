import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProblemWithMapping } from "@/hooks/usePracticeProblems";

interface ProblemListDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skillName: string;
  problems: ProblemWithMapping[];
  currentProblemSlug: string | undefined;
  onSelectProblem: (problemSlug: string) => void;
}

const difficultyColors = {
  Easy: "text-emerald-500",
  Medium: "text-amber-500",
  Hard: "text-red-500",
};

export function ProblemListDrawer({
  open,
  onOpenChange,
  skillName,
  problems,
  currentProblemSlug,
  onSelectProblem,
}: ProblemListDrawerProps) {
  // Group problems by lesson
  const groupedProblems = problems.reduce((acc, problem) => {
    const lessonTitle = problem.lesson_title || "General";
    if (!acc[lessonTitle]) {
      acc[lessonTitle] = [];
    }
    acc[lessonTitle].push(problem);
    return acc;
  }, {} as Record<string, ProblemWithMapping[]>);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[350px] sm:w-[400px] p-0">
        <SheetHeader className="px-4 py-4 border-b border-border/50">
          <SheetTitle className="text-left">{skillName}</SheetTitle>
          <p className="text-sm text-muted-foreground text-left">
            {problems.length} problem{problems.length !== 1 ? "s" : ""}
          </p>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-100px)]">
          <div className="py-2">
            {Object.entries(groupedProblems).map(([lessonTitle, lessonProblems]) => (
              <div key={lessonTitle}>
                {/* Lesson Header */}
                <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/30">
                  {lessonTitle}
                </div>
                
                {/* Problem List */}
                {lessonProblems.map((problem, index) => {
                  const isActive = problem.slug === currentProblemSlug;
                  const isSolved = false; // TODO: integrate with user progress
                  
                  return (
                    <button
                      key={problem.id}
                      onClick={() => {
                        onSelectProblem(problem.slug);
                        onOpenChange(false);
                      }}
                      className={cn(
                        "w-full px-4 py-3 flex items-center gap-3 text-left transition-colors",
                        "hover:bg-muted/50",
                        isActive && "bg-primary/5 border-l-2 border-primary"
                      )}
                    >
                      {/* Status Icon */}
                      <div className="shrink-0">
                        {isSolved ? (
                          <Check className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground/30" />
                        )}
                      </div>
                      
                      {/* Problem Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {index + 1}.
                          </span>
                          <span className={cn(
                            "text-sm truncate",
                            isActive ? "font-medium" : "font-normal"
                          )}>
                            {problem.title}
                          </span>
                        </div>
                        {problem.sub_topic_title && problem.sub_topic_title !== lessonTitle && (
                          <span className="text-xs text-muted-foreground truncate block mt-0.5">
                            {problem.sub_topic_title}
                          </span>
                        )}
                      </div>
                      
                      {/* Difficulty Badge */}
                      <span className={cn(
                        "text-xs font-medium shrink-0",
                        difficultyColors[problem.difficulty]
                      )}>
                        {problem.difficulty}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
            
            {problems.length === 0 && (
              <div className="px-4 py-8 text-center text-muted-foreground">
                <p>No problems available</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
