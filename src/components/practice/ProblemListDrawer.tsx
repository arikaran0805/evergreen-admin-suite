 import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import { CheckCircle, Circle } from "lucide-react";
 import { cn } from "@/lib/utils";
 import { ProblemWithMapping } from "@/hooks/usePracticeProblems";
 import { useLearnerProgress } from "@/hooks/useLearnerProblemProgress";
 import { useAuth } from "@/contexts/AuthContext";
 
 interface ProblemListDrawerProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   skillName: string;
   problems: ProblemWithMapping[];
   currentProblemSlug: string | undefined;
   onSelectProblem: (problemSlug: string, problemType?: "problem-solving" | "predict-output" | "fix-error" | "eliminate-wrong") => void;
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
   const { user } = useAuth();
   const { data: progressData } = useLearnerProgress(user?.id);
 
   // Create a lookup map for solved problems
   const solvedProblems = new Set(
     (progressData || [])
       .filter((p) => p.status === "solved")
       .map((p) => p.problem_id)
   );
 
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
       <SheetContent side="left" className="w-[50vw] min-w-[500px] max-w-[800px] p-0">
         <SheetHeader className="px-6 py-4 border-b border-border/50">
           <SheetTitle className="text-left">{skillName}</SheetTitle>
           <p className="text-sm text-muted-foreground text-left">
             {problems.length} problem{problems.length !== 1 ? "s" : ""}
           </p>
         </SheetHeader>
         
         <ScrollArea className="h-[calc(100vh-100px)]">
           <div className="py-6 space-y-4 px-6">
             {Object.entries(groupedByLesson).map(([lessonTitle, subTopics]) => (
               <div key={lessonTitle}>
                 {/* Lesson Card Container */}
                 <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
                   {/* Lesson Header */}
                   <div className="px-5 py-4 bg-muted/40">
                     <span className="font-semibold text-foreground">{lessonTitle}</span>
                   </div>
                   
                   {/* Sub-topics and Problems */}
                   {Object.entries(subTopics).map(([subTopicTitle, subTopicProblems]) => (
                     <div key={subTopicTitle}>
                       {/* Sub-topic Header - simple text divider with primary color */}
                       <div className="px-5 py-2.5 bg-background">
                         <span className="text-sm text-sidebar-primary">{subTopicTitle}</span>
                       </div>
                       
                       {/* Problem Rows */}
                       {subTopicProblems.map((problem) => {
                         const isActive = problem.slug === currentProblemSlug;
                         const isSolved = solvedProblems.has(problem.id);
                         
                         return (
                           <button
                             key={problem.id}
                            onClick={() => {
                              onSelectProblem(problem.slug, problem.problemType);
                              onOpenChange(false);
                            }}
                             className={cn(
                               "w-full px-5 py-3.5 flex items-center gap-4 text-left transition-colors bg-background",
                               "hover:bg-muted/30",
                               isActive && "bg-primary/5"
                             )}
                           >
                             {/* Status Circle */}
                             <div className="shrink-0">
                               {isSolved ? (
                                 <CheckCircle className="h-5 w-5 text-sidebar-primary" />
                               ) : (
                                 <Circle className="h-5 w-5 text-muted-foreground/40" />
                               )}
                             </div>
                             
                             {/* Problem Title */}
                             <span className={cn(
                               "flex-1 text-sm",
                               isActive && "font-medium",
                               isSolved ? "text-sidebar-primary" : "text-foreground"
                             )}>
                               {problem.title}
                             </span>
                             
                             {/* Difficulty Badge */}
                             <span className={cn(
                               "text-sm font-medium shrink-0",
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
               <div className="py-8 text-center text-muted-foreground">
                 <p>No problems available</p>
               </div>
             )}
           </div>
         </ScrollArea>
       </SheetContent>
     </Sheet>
   );
 }
