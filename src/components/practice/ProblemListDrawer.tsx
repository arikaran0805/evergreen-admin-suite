import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, FileText } from "lucide-react";
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
  // Group problems by lesson, then by sub-topic
  const groupedByLesson = problems.reduce((acc, problem) => {
    const lessonTitle = problem.lesson_title || "General";
    if (!acc[lessonTitle]) {
      acc[lessonTitle] = {};
    }
    const subTopic = problem.sub_topic_title || "General";
    if (!acc[lessonTitle][subTopic]) {
      acc[lessonTitle][subTopic] = [];
    }
    acc[lessonTitle][subTopic].push(problem);
    return acc;
  }, {} as Record<string, Record<string, ProblemWithMapping[]>>);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[500px] sm:w-[550px] p-0">
        <SheetHeader className="px-6 py-4 border-b border-border/50">
          <SheetTitle className="text-left">{skillName}</SheetTitle>
          <p className="text-sm text-muted-foreground text-left">
            {problems.length} problem{problems.length !== 1 ? "s" : ""}
          </p>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-100px)]">
          <div className="py-4">
            {Object.entries(groupedByLesson).map(([lessonTitle, subTopics]) => (
              <div key={lessonTitle} className="mb-4">
                {/* Lesson Header - Card style */}
                <div className="mx-4 px-4 py-3 bg-muted/40 rounded-t-lg border border-border/50 border-b-0">
                  <span className="font-semibold text-foreground">{lessonTitle}</span>
                </div>
                
                {/* Sub-topics and Problems */}
                <div className="mx-4 border border-border/50 border-t-0 rounded-b-lg overflow-hidden">
                  {Object.entries(subTopics).map(([subTopicTitle, subTopicProblems]) => (
                    <div key={subTopicTitle}>
                      {/* Sub-topic Header - with left accent border */}
                      <div className="px-4 py-2 border-l-2 border-l-primary/60 bg-background">
                        <span className="text-sm italic text-muted-foreground">{subTopicTitle}</span>
                      </div>
                      
                      {/* Problem Rows */}
                      {subTopicProblems.map((problem) => {
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
                              "w-full px-4 py-3 flex items-center gap-3 text-left transition-colors border-t border-border/30",
                              "hover:bg-muted/30",
                              isActive && "bg-primary/5"
                            )}
                          >
                            {/* Status Circle */}
                            <div className="shrink-0">
                              {isSolved ? (
                                <div className="h-5 w-5 rounded-full border-2 border-emerald-500 flex items-center justify-center">
                                  <Check className="h-3 w-3 text-emerald-500" />
                                </div>
                              ) : (
                                <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                              )}
                            </div>
                            
                            {/* Problem Title */}
                            <span className={cn(
                              "flex-1 text-sm",
                              isActive ? "font-medium" : "font-normal"
                            )}>
                              {problem.title}
                            </span>
                            
                            {/* Solution Link */}
                            <div className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                              <FileText className="h-4 w-4" />
                              <span className="text-xs">Solution</span>
                            </div>
                            
                            {/* Difficulty Badge */}
                            <span className={cn(
                              "text-sm font-medium shrink-0 min-w-[50px] text-right",
                              difficultyColors[problem.difficulty]
                            )}>
                              {problem.difficulty}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
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
