 import { useState, useMemo } from "react";
 import { useParams, useNavigate } from "react-router-dom";
 import { ArrowLeft, Bookmark } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Skeleton } from "@/components/ui/skeleton";
 import { Toggle } from "@/components/ui/toggle";
 import { ProblemFilters } from "@/components/practice/ProblemFilters";
 import { ProblemRow } from "@/components/practice/ProblemRow";
 import { useProblemBookmarks } from "@/hooks/useProblemBookmarks";
 import { useLearnerProgress } from "@/hooks/useLearnerProblemProgress";
 import { useAuth } from "@/contexts/AuthContext";
 import { useQuery } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { toast } from "sonner";
 
 type DifficultyFilter = 'all' | 'Easy' | 'Medium' | 'Hard';
 type StatusFilter = 'all' | 'solved' | 'unsolved';
 
 interface DisplayProblem {
   id: string;
   title: string;
   difficulty: 'Easy' | 'Medium' | 'Hard';
   solved: boolean;
   locked: boolean;
   subTopic: string;
   hasSolution: boolean;
   slug: string;
 }
 
 export default function LessonProblems() {
   const { skillId, lessonId } = useParams<{ skillId: string; lessonId: string }>();
   const navigate = useNavigate();
   
   const [difficulty, setDifficulty] = useState<DifficultyFilter>('all');
   const [status, setStatus] = useState<StatusFilter>('all');
   const [search, setSearch] = useState('');
   const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);
   
   const { isBookmarked, isAuthenticated } = useProblemBookmarks();
   const { user } = useAuth();
   const { data: progressData } = useLearnerProgress(user?.id);
 
   // Create a lookup set for solved problems
   const solvedProblems = useMemo(() => {
     return new Set(
       (progressData || [])
         .filter((p) => p.status === "solved")
         .map((p) => p.problem_id)
     );
   }, [progressData]);
 
   // Fetch lesson info
   const { data: lesson, isLoading: lessonLoading } = useQuery({
     queryKey: ["course-lesson", lessonId],
     queryFn: async () => {
       if (!lessonId) return null;
       const { data, error } = await supabase
         .from("course_lessons")
         .select("id, title, course_id")
         .eq("id", lessonId)
         .single();
       if (error) return null;
       return data;
     },
     enabled: !!lessonId,
   });
 
   // Fetch skill info for navigation
   const { data: skill } = useQuery({
     queryKey: ["skill-by-slug", skillId],
     queryFn: async () => {
       if (!skillId) return null;
       const { data, error } = await supabase
         .from("practice_skills")
         .select("id, slug, name")
         .eq("slug", skillId)
         .single();
       if (error) return null;
       return data;
     },
     enabled: !!skillId,
   });
 
   // Fetch problems for this specific lesson
   const { data: problems, isLoading: problemsLoading } = useQuery({
     queryKey: ["lesson-problems", skillId, lessonId],
     queryFn: async () => {
       if (!skillId || !lessonId) return [];
       
       // First get skill by slug
       const { data: skillData } = await supabase
         .from("practice_skills")
         .select("id")
         .eq("slug", skillId)
         .single();
       
       if (!skillData) return [];
 
       // Get sub-topics for this lesson
       const { data: subTopics } = await supabase
         .from("sub_topics")
         .select("id, title")
         .eq("skill_id", skillData.id)
         .eq("lesson_id", lessonId)
         .order("display_order", { ascending: true });
 
       if (!subTopics || subTopics.length === 0) return [];
 
       const subTopicIds = subTopics.map(st => st.id);
 
       // Get problem mappings for these sub-topics
       const { data: mappings } = await supabase
         .from("problem_mappings")
         .select(`
           problem_id,
           sub_topic_id,
           practice_problems (
             id, title, slug, difficulty, is_premium, solution, status
           )
         `)
         .in("sub_topic_id", subTopicIds)
         .order("display_order", { ascending: true });
 
       if (!mappings) return [];
 
       // Build sub-topic title lookup
       const subTopicMap = new Map(subTopics.map(st => [st.id, st.title]));
 
       // Filter to published problems and map to display format
       return mappings
         .filter((m: any) => m.practice_problems?.status === "published")
         .map((m: any) => ({
           ...m.practice_problems,
           subTopicTitle: subTopicMap.get(m.sub_topic_id) || "General",
         }));
     },
     enabled: !!skillId && !!lessonId,
   });
 
   // Convert to display format
   const displayProblems: DisplayProblem[] = useMemo(() => {
     if (!problems) return [];
     return problems.map((p: any) => ({
       id: p.id,
       title: p.title,
       difficulty: p.difficulty,
       solved: solvedProblems.has(p.id),
       locked: p.is_premium,
       subTopic: p.subTopicTitle || "General",
       hasSolution: !!p.solution,
       slug: p.slug,
     }));
   }, [problems, solvedProblems]);
 
   // Filter problems
   const filteredProblems = useMemo(() => {
     return displayProblems.filter((p) => {
       if (difficulty !== 'all' && p.difficulty !== difficulty) return false;
       if (status === 'solved' && !p.solved) return false;
       if (status === 'unsolved' && p.solved) return false;
       if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
       if (showBookmarkedOnly && !isBookmarked(p.id)) return false;
       return true;
     });
   }, [displayProblems, difficulty, status, search, showBookmarkedOnly, isBookmarked]);
 
   const handleProblemClick = (problem: DisplayProblem) => {
     if (problem.locked) {
       toast.info("This is a premium problem. Upgrade to unlock!", {
         description: "Get access to all problems and solutions.",
       });
       return;
     }
     navigate(`/practice/${skillId}/problem/${problem.slug}`);
   };
 
   const isLoading = lessonLoading || problemsLoading;
 
   return (
     <div className="min-h-screen bg-background">
       <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
         {/* Back Button */}
         <Button
           variant="ghost"
           size="sm"
           onClick={() => navigate(-1)}
           className="mb-6 -ml-2 text-muted-foreground hover:text-foreground"
         >
           <ArrowLeft className="h-4 w-4 mr-2" />
           Back
         </Button>
 
         {/* Header - Shows Lesson Name */}
         <div className="mb-6">
           {isLoading ? (
             <>
               <Skeleton className="h-8 w-48 mb-2" />
               <Skeleton className="h-4 w-64" />
             </>
           ) : (
             <>
               <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                 {lesson?.title || "Practice Problems"}
               </h1>
               <p className="text-muted-foreground">
                 {displayProblems.length} problem{displayProblems.length !== 1 ? 's' : ''} to practice
               </p>
             </>
           )}
         </div>
 
         {/* Filters */}
         <div className="flex items-center gap-3">
           <div className="flex-1">
             <ProblemFilters
               difficulty={difficulty}
               status={status}
               search={search}
               onDifficultyChange={setDifficulty}
               onStatusChange={setStatus}
               onSearchChange={setSearch}
             />
           </div>
           {isAuthenticated && (
             <Toggle
               pressed={showBookmarkedOnly}
               onPressedChange={setShowBookmarkedOnly}
               aria-label="Show bookmarked only"
               className="data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
             >
               <Bookmark className={`h-4 w-4 ${showBookmarkedOnly ? 'fill-current' : ''}`} />
             </Toggle>
           )}
         </div>
 
         {/* Problem List */}
         <div className="mt-6">
           {isLoading ? (
             <div className="space-y-2">
               {[...Array(5)].map((_, i) => (
                 <Skeleton key={i} className="h-14 w-full" />
               ))}
             </div>
           ) : filteredProblems.length > 0 ? (
             <div className="rounded-lg border border-border/50 overflow-hidden bg-card">
               {filteredProblems.map((problem) => (
                 <ProblemRow
                   key={problem.id}
                   problem={problem}
                   onClick={() => handleProblemClick(problem)}
                 />
               ))}
             </div>
           ) : displayProblems.length > 0 ? (
             <div className="text-center py-12 text-muted-foreground">
               <p>No problems match your filters.</p>
               <Button
                 variant="link"
                 onClick={() => {
                   setDifficulty('all');
                   setStatus('all');
                   setSearch('');
                   setShowBookmarkedOnly(false);
                 }}
                 className="mt-2"
               >
                 Clear filters
               </Button>
             </div>
           ) : (
             <div className="text-center py-12 text-muted-foreground">
               <p>No problems available for this lesson yet.</p>
             </div>
           )}
         </div>
       </div>
     </div>
   );
 }