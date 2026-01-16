import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { GripVertical, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { generateRankBetween, generateInitialRanks } from "@/lib/lexoRank";

interface Lesson {
  id: string;
  title: string;
  lesson_rank: string;
  course_id: string;
}

interface Course {
  id: string;
  name: string;
}

interface SortableItemProps {
  id: string;
  title: string;
  rank: string;
  index: number;
}

function SortableItem({ id, title, rank, index }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-background border border-border rounded-md mb-2"
    >
      <button
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="flex-1">
        <p className="font-medium text-sm">{title}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">#{index + 1}</span>
        <span className="text-[10px] text-muted-foreground/60 font-mono">{rank}</span>
      </div>
    </div>
  );
}

export default function LessonReorder() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      fetchLessons();
    }
  }, [selectedCourseId]);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("id, name")
        .is("deleted_at", null)
        .order("name");

      if (error) throw error;
      setCourses(data || []);
      
      if (data && data.length > 0) {
        setSelectedCourseId(data[0].id);
      }
    } catch (error: any) {
      console.error("Error fetching courses:", error);
    }
  };

  const fetchLessons = async () => {
    if (!selectedCourseId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("course_lessons")
        .select("id, title, lesson_rank, course_id")
        .eq("course_id", selectedCourseId)
        .is("deleted_at", null)
        .order("lesson_rank", { ascending: true });

      if (error) throw error;
      setLessons((data as Lesson[]) || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch lessons",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = lessons.findIndex((item) => item.id === active.id);
      const newIndex = lessons.findIndex((item) => item.id === over.id);

      const newItems = arrayMove(lessons, oldIndex, newIndex);
      setLessons(newItems);

      // Calculate new rank for the moved item
      const movedLesson = newItems[newIndex];
      const prevRank = newIndex > 0 ? newItems[newIndex - 1].lesson_rank : null;
      const nextRank = newIndex < newItems.length - 1 ? newItems[newIndex + 1].lesson_rank : null;
      const newRank = generateRankBetween(prevRank, nextRank);

      try {
        const { error } = await supabase
          .from("course_lessons")
          .update({ lesson_rank: newRank })
          .eq("id", movedLesson.id);

        if (error) throw error;

        // Update local state with new rank
        setLessons(prev => prev.map(l => 
          l.id === movedLesson.id ? { ...l, lesson_rank: newRank } : l
        ));

        toast({
          title: "Success",
          description: "Lesson order updated",
        });
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to update lesson order",
          variant: "destructive",
        });
        fetchLessons();
      }
    }
  };

  const handleRebalanceRanks = async () => {
    if (!selectedCourseId || lessons.length === 0) return;
    
    try {
      setLoading(true);
      
      // Generate new evenly distributed ranks
      const newRanks = generateInitialRanks(lessons.length);
      
      // Update all lessons with new ranks
      await Promise.all(
        lessons.map((lesson, index) =>
          supabase
            .from("course_lessons")
            .update({ lesson_rank: newRanks[index] })
            .eq("id", lesson.id)
        )
      );

      toast({
        title: "Success",
        description: "Lesson ranks rebalanced for optimal spacing",
      });
      
      await fetchLessons();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to rebalance lesson ranks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reorder Lessons</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 space-y-3">
          <div className="flex gap-3">
            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleRebalanceRanks}
              disabled={loading || lessons.length === 0}
              variant="outline"
              className="shrink-0"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Rebalance
            </Button>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground py-8">Loading lessons...</p>
        ) : lessons.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No lessons found in this course
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-3">
              Drag and drop to reorder lessons. Ranks are automatically calculated.
            </p>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={lessons.map((l) => l.id)}
                strategy={verticalListSortingStrategy}
              >
                {lessons.map((lesson, index) => (
                  <SortableItem
                    key={lesson.id}
                    id={lesson.id}
                    title={lesson.title}
                    rank={lesson.lesson_rank}
                    index={index}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
