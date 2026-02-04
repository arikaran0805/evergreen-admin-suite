import { useState, useMemo } from "react";
import { Link2, Trash2, BookOpen, Plus, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCreateProblemMapping,
  useDeleteProblemMapping,
} from "@/hooks/useProblemMappings";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface LessonMapping {
  id: string;
  sub_topic_id: string;
  context_note: string | null;
  sub_topic: {
    id: string;
    title: string;
    lesson_id: string;
    skill_id: string;
  };
  lesson?: {
    id: string;
    title: string;
    course_id: string;
  };
  course?: {
    id: string;
    name: string;
  };
}

interface SubTopicOption {
  id: string;
  title: string;
  lesson_id: string;
  lesson_title: string;
  course_id: string;
  course_name: string;
}

interface ProblemLessonMappingsProps {
  problemId: string | undefined;
  disabled?: boolean;
}

function useProblemLessonMappings(problemId: string | undefined) {
  return useQuery({
    queryKey: ["problem-lesson-mappings", problemId],
    queryFn: async () => {
      if (!problemId) return [];
      const { data, error } = await supabase
        .from("problem_mappings")
        .select(`
          id,
          sub_topic_id,
          context_note,
          sub_topics!sub_topic_id (
            id, title, lesson_id, skill_id
          )
        `)
        .eq("problem_id", problemId);

      if (error) throw error;

      // Fetch lesson and course info for each mapping
      const mappingsWithLessons = await Promise.all(
        (data || []).map(async (pm: any) => {
          const subTopic = pm.sub_topics;
          if (!subTopic?.lesson_id) return { ...pm, sub_topic: subTopic };

          const { data: lesson } = await supabase
            .from("course_lessons")
            .select("id, title, course_id")
            .eq("id", subTopic.lesson_id)
            .single();

          let course = null;
          if (lesson?.course_id) {
            const { data: courseData } = await supabase
              .from("courses")
              .select("id, name")
              .eq("id", lesson.course_id)
              .single();
            course = courseData;
          }

          return {
            ...pm,
            sub_topic: subTopic,
            lesson,
            course,
          };
        })
      );

      return mappingsWithLessons as LessonMapping[];
    },
    enabled: !!problemId,
  });
}

function useAllSubTopicsWithLessons() {
  return useQuery({
    queryKey: ["all-sub-topics-with-lessons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sub_topics")
        .select(`
          id,
          title,
          lesson_id,
          course_lessons!lesson_id (
            id, title, course_id,
            courses!course_id (id, name)
          )
        `)
        .order("title", { ascending: true });

      if (error) throw error;

      return (data || [])
        .filter((st: any) => st.course_lessons)
        .map((st: any) => ({
          id: st.id,
          title: st.title,
          lesson_id: st.lesson_id,
          lesson_title: st.course_lessons?.title || "",
          course_id: st.course_lessons?.course_id || "",
          course_name: st.course_lessons?.courses?.name || "",
        })) as SubTopicOption[];
    },
  });
}

export function ProblemLessonMappings({ problemId, disabled }: ProblemLessonMappingsProps) {
  const { data: mappings, isLoading } = useProblemLessonMappings(problemId);
  const { data: allSubTopics, isLoading: subTopicsLoading } = useAllSubTopicsWithLessons();
  const createMapping = useCreateProblemMapping();
  const deleteMapping = useDeleteProblemMapping();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubTopicId, setSelectedSubTopicId] = useState<string | null>(null);
  const [contextNote, setContextNote] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<LessonMapping | null>(null);

  const attachedSubTopicIds = useMemo(
    () => new Set((mappings || []).map((m) => m.sub_topic_id)),
    [mappings]
  );

  const availableSubTopics = useMemo(() => {
    if (!allSubTopics) return [];
    return allSubTopics
      .filter((st) => !attachedSubTopicIds.has(st.id))
      .filter((st) =>
        searchQuery
          ? st.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            st.lesson_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            st.course_name.toLowerCase().includes(searchQuery.toLowerCase())
          : true
      );
  }, [allSubTopics, attachedSubTopicIds, searchQuery]);

  const handleAttach = async () => {
    if (!selectedSubTopicId || !problemId) return;
    await createMapping.mutateAsync({
      problem_id: problemId,
      sub_topic_id: selectedSubTopicId,
      context_note: contextNote.trim() || undefined,
    });
    setSelectedSubTopicId(null);
    setContextNote("");
    setIsAddDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget || !problemId) return;
    await deleteMapping.mutateAsync({
      id: deleteTarget.id,
      subTopicId: deleteTarget.sub_topic_id,
      problemId,
    });
    setDeleteTarget(null);
  };

  if (!problemId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Lesson Mappings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Save the problem first to manage lesson mappings.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Lesson Mappings
          </CardTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIsAddDialogOpen(true)}
            disabled={disabled}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add to Lesson
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : mappings && mappings.length > 0 ? (
            <div className="space-y-2">
              {mappings.map((mapping) => (
                <div
                  key={mapping.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {mapping.course?.name || "Unknown Course"}
                      </Badge>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-sm font-medium truncate">
                        {mapping.lesson?.title || "Unknown Lesson"}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-sm text-muted-foreground truncate">
                        {mapping.sub_topic?.title || "Unknown Sub-Topic"}
                      </span>
                    </div>
                    {mapping.context_note && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        Note: {mapping.context_note}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                    onClick={() => setDeleteTarget(mapping)}
                    disabled={disabled}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Not mapped to any lessons yet.</p>
              <p className="text-xs">Add this problem to lessons for learners to discover it.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add to Lesson Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Problem to Lesson</DialogTitle>
            <DialogDescription>
              Select a sub-topic to attach this problem to.
            </DialogDescription>
          </DialogHeader>

          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search courses, lessons, or sub-topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="flex-1 border rounded-lg min-h-[200px] max-h-[300px]">
            {subTopicsLoading ? (
              <div className="p-4 space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : availableSubTopics.length > 0 ? (
              <div className="p-2 space-y-1">
                {availableSubTopics.slice(0, 50).map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setSelectedSubTopicId(st.id)}
                    className={cn(
                      "w-full flex flex-col gap-1 p-3 rounded-md text-left transition-colors",
                      selectedSubTopicId === st.id
                        ? "bg-primary/10 border border-primary"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs shrink-0">
                        {st.course_name}
                      </Badge>
                      <span className="text-xs text-muted-foreground">→</span>
                      <span className="text-sm truncate">{st.lesson_title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground pl-1">
                      Sub-topic: {st.title}
                    </span>
                  </button>
                ))}
                {availableSubTopics.length > 50 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Showing first 50 results. Refine your search.
                  </p>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <p className="text-sm">
                  {searchQuery
                    ? "No matching sub-topics found."
                    : "No available sub-topics. Create sub-topics from the lesson manager first."}
                </p>
              </div>
            )}
          </ScrollArea>

          {selectedSubTopicId && (
            <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
              <p className="text-xs font-medium">Context Note (optional)</p>
              <Textarea
                placeholder="Add course-specific context for this problem..."
                value={contextNote}
                onChange={(e) => setContextNote(e.target.value)}
                rows={2}
                className="text-sm"
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAttach}
              disabled={!selectedSubTopicId || createMapping.isPending}
            >
              {createMapping.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4 mr-1" />
                  Add to Lesson
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Lesson?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the problem from "{deleteTarget?.lesson?.title}" → "
              {deleteTarget?.sub_topic?.title}". The problem itself will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
