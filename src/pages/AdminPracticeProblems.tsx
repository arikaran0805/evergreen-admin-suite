import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, ArrowLeft, BookOpen, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePracticeSkill } from "@/hooks/usePracticeSkills";
import { usePracticeProblems } from "@/hooks/usePracticeProblems";
import { useSubTopicsBySkill, SubTopic } from "@/hooks/useSubTopics";
import { useCreateProblemMapping, useAllGlobalProblems, useDeleteProblemMapping } from "@/hooks/useProblemMappings";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LessonProblemsSection } from "@/components/admin/practice/LessonProblemsSection";
import { AddProblemDialog } from "@/components/admin/practice/AddProblemDialog";

interface CourseLesson {
  id: string;
  title: string;
  course_id: string;
  lesson_order: number;
}

export default function AdminPracticeProblems() {
  const { skillId } = useParams<{ skillId: string }>();
  const navigate = useNavigate();
  const { data: skill, isLoading: skillLoading } = usePracticeSkill(skillId);
  const { data: skillProblems, isLoading: problemsLoading } = usePracticeProblems(skillId);
  const { data: allGlobalProblems, isLoading: globalProblemsLoading } = useAllGlobalProblems();
  const { data: subTopics, isLoading: subTopicsLoading } = useSubTopicsBySkill(skillId);
  
  const [addProblemSubTopicId, setAddProblemSubTopicId] = useState<string | null>(null);
  
  const createMapping = useCreateProblemMapping();
  const deleteMapping = useDeleteProblemMapping();

  // Fetch lessons for the linked course
  const { data: lessons, isLoading: lessonsLoading } = useQuery({
    queryKey: ["course-lessons", skill?.course_id],
    queryFn: async () => {
      if (!skill?.course_id) return [];
      const { data, error } = await supabase
        .from("course_lessons")
        .select("id, title, course_id, lesson_order")
        .eq("course_id", skill.course_id)
        .is("deleted_at", null)
        .order("lesson_rank", { ascending: true });
      
      if (error) throw error;
      return data as CourseLesson[];
    },
    enabled: !!skill?.course_id,
  });

  // Fetch all problem mappings for this skill's sub-topics
  const { data: mappings } = useQuery({
    queryKey: ["problem-mappings-by-skill", skillId],
    queryFn: async () => {
      if (!skillId || !subTopics) return [];
      const subTopicIds = subTopics.map(st => st.id);
      if (subTopicIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("problem_mappings")
        .select("*, practice_problems(*)")
        .in("sub_topic_id", subTopicIds);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!skillId && !!subTopics && subTopics.length > 0,
  });

  // Group sub-topics by lesson
  const subTopicsByLesson = useMemo(() => {
    if (!subTopics) return {};
    return subTopics.reduce((acc, st) => {
      if (!acc[st.lesson_id]) acc[st.lesson_id] = [];
      acc[st.lesson_id].push(st);
      return acc;
    }, {} as Record<string, SubTopic[]>);
  }, [subTopics]);

  // Group problems by sub-topic (from mappings)
  const problemsBySubTopic = useMemo(() => {
    if (!mappings) return {};
    return mappings.reduce((acc, m) => {
      if (!acc[m.sub_topic_id]) acc[m.sub_topic_id] = [];
      if (m.practice_problems) {
        acc[m.sub_topic_id].push(m.practice_problems);
      }
      return acc;
    }, {} as Record<string, any[]>);
  }, [mappings]);

  // Group mappings by sub-topic for unlink functionality
  const mappingsBySubTopic = useMemo(() => {
    if (!mappings) return {};
    return mappings.reduce((acc, m) => {
      if (!acc[m.sub_topic_id]) acc[m.sub_topic_id] = [];
      acc[m.sub_topic_id].push({ id: m.id, problem_id: m.problem_id });
      return acc;
    }, {} as Record<string, { id: string; problem_id: string }[]>);
  }, [mappings]);

  // Get mapped problem IDs for the add dialog
  const mappedProblemIds = useMemo(() => {
    if (!mappings || !addProblemSubTopicId) return new Set<string>();
    return new Set(
      mappings
        .filter(m => m.sub_topic_id === addProblemSubTopicId)
        .map(m => m.problem_id)
    );
  }, [mappings, addProblemSubTopicId]);

  const handleProblemClick = (problemId: string) => {
    navigate(`/admin/practice/skills/${skillId}/problems/${problemId}`);
  };

  const handleAddProblems = async (problemIds: string[]) => {
    if (!addProblemSubTopicId) return;
    
    for (const problemId of problemIds) {
      await createMapping.mutateAsync({
        problem_id: problemId,
        sub_topic_id: addProblemSubTopicId,
      });
    }
    setAddProblemSubTopicId(null);
  };

  const handleCreateNewProblem = () => {
    navigate(`/admin/practice/skills/${skillId}/problems/new`);
  };

  const handleUnlinkProblem = async (mappingId: string, subTopicId: string, problemId: string) => {
    await deleteMapping.mutateAsync({ id: mappingId, subTopicId, problemId });
  };

  const isLoading = skillLoading || problemsLoading || lessonsLoading || subTopicsLoading;

  const hasLinkedCourse = !!skill?.course_id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/practice/skills")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {skill?.name || "Loading..."} Problems
          </h1>
          <p className="text-muted-foreground">
            Manage problems organized by lessons and sub-topics
          </p>
        </div>
        <Button onClick={() => navigate(`/admin/practice/skills/${skillId}/problems/new`)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Problem
        </Button>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : !hasLinkedCourse ? (
        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This skill is not linked to a course. Problems can still be created but won't be organized by lessons.
              <Button
                variant="link"
                className="ml-2 p-0 h-auto"
                onClick={() => navigate(`/admin/practice/skills/${skillId}/problems/new`)}
              >
                Create a standalone problem
              </Button>
            </AlertDescription>
          </Alert>
          
          {/* Show standalone problems */}
          {skillProblems && skillProblems.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Standalone Problems</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {skillProblems.map((problem) => (
                    <div
                      key={problem.id}
                      onClick={() => handleProblemClick(problem.id)}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                          problem.difficulty === "Easy" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                          problem.difficulty === "Medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                          "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}>
                          {problem.difficulty}
                        </span>
                        <span className="font-medium">{problem.title}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        problem.status === "published" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}>
                        {problem.status}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Problems Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first problem for this custom collection.
                </p>
                <Button onClick={() => navigate(`/admin/practice/skills/${skillId}/problems/new`)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Problem
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      ) : lessons && lessons.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Lessons Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create lessons in the course editor to organize problems.
            </p>
            <Button variant="outline" onClick={() => navigate(`/admin/courses`)}>
              Go to Courses
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {lessons?.map((lesson) => (
            <LessonProblemsSection
              key={lesson.id}
              lesson={lesson}
              skillId={skillId!}
              subTopics={subTopicsByLesson[lesson.id] || []}
              problemsBySubTopic={problemsBySubTopic}
              mappingsBySubTopic={mappingsBySubTopic}
              onProblemClick={handleProblemClick}
              onAddProblem={(subTopicId) => setAddProblemSubTopicId(subTopicId)}
              onUnlinkProblem={handleUnlinkProblem}
            />
          ))}
        </div>
      )}

      {/* Add Problem Dialog */}
      <AddProblemDialog
        open={!!addProblemSubTopicId}
        onOpenChange={(open) => !open && setAddProblemSubTopicId(null)}
        allProblems={allGlobalProblems || []}
        mappedProblemIds={mappedProblemIds}
        onAddProblems={handleAddProblems}
        onCreateNew={handleCreateNewProblem}
      />
    </div>
  );
}
