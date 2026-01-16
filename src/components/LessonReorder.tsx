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
import { GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Lesson {
  id: string;
  title: string;
  lesson_order: number;
  course_id: string;
}

interface Course {
  id: string;
  name: string;
}

interface SortableItemProps {
  id: string;
  title: string;
  order: number;
}

function SortableItem({ id, title, order }: SortableItemProps) {
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
      className="flex items-center gap-3 p-3 bg-white dark:bg-background border border-border rounded-md mb-2"
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
      <span className="text-xs text-muted-foreground">Order: {order}</span>
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
      const { data, error } = await (supabase
        .from("course_lessons" as any)
        .select("id, title, lesson_order, course_id")
        .eq("course_id", selectedCourseId)
        .is("deleted_at", null)
        .order("lesson_order", { ascending: true }) as unknown as Promise<{ data: Lesson[] | null; error: any }>);

      if (error) throw error;
      setLessons(data || []);
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setLessons((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Update lesson_order for all affected items
        updateLessonOrders(newItems);
        
        return newItems;
      });
    }
  };

  const updateLessonOrders = async (orderedLessons: Lesson[]) => {
    try {
      const updates = orderedLessons.map((lesson, index) => ({
        id: lesson.id,
        lesson_order: index,
      }));

      for (const update of updates) {
        const { error } = await (supabase
          .from("course_lessons" as any)
          .update({ lesson_order: update.lesson_order })
          .eq("id", update.id) as unknown as Promise<{ error: any }>);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Lesson order updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update lesson order",
        variant: "destructive",
      });
      
      // Refresh to get correct order
      fetchLessons();
    }
  };

  const handleAutoSequence = async () => {
    if (!selectedCourseId) return;
    
    try {
      setLoading(true);
      
      // Update all lessons in the course to sequential order
      const updates = lessons.map((lesson, index) => ({
        id: lesson.id,
        lesson_order: index,
      }));

      for (const update of updates) {
        const { error } = await (supabase
          .from("course_lessons" as any)
          .update({ lesson_order: update.lesson_order })
          .eq("id", update.id) as unknown as Promise<{ error: any }>);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Lesson orders reset to sequential numbering",
      });
      
      await fetchLessons();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to reset lesson orders",
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
              onClick={handleAutoSequence}
              disabled={loading || lessons.length === 0}
              variant="outline"
            >
              Auto-Sequence
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
              Drag and drop to reorder lessons
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
                    order={index}
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