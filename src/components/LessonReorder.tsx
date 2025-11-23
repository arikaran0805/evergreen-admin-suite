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

interface Post {
  id: string;
  title: string;
  lesson_order: number;
  category_id: string | null;
}

interface Category {
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
      className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-md mb-2"
    >
      <button
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="flex-1">
        <p className="font-medium text-sm">{title}</p>
      </div>
      <span className="text-xs text-gray-500">Order: {order}</span>
    </div>
  );
}

export default function LessonReorder() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategoryId) {
      fetchPosts();
    }
  }, [selectedCategoryId]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (error) throw error;
      setCategories(data || []);
      
      if (data && data.length > 0) {
        setSelectedCategoryId(data[0].id);
      }
    } catch (error: any) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchPosts = async () => {
    if (!selectedCategoryId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("id, title, lesson_order, category_id")
        .eq("category_id", selectedCategoryId)
        .order("lesson_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;
      setPosts(data || []);
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
      setPosts((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Update lesson_order for all affected items
        updateLessonOrders(newItems);
        
        return newItems;
      });
    }
  };

  const updateLessonOrders = async (orderedPosts: Post[]) => {
    try {
      const updates = orderedPosts.map((post, index) => ({
        id: post.id,
        lesson_order: index + 1,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("posts")
          .update({ lesson_order: update.lesson_order })
          .eq("id", update.id);

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
      fetchPosts();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reorder Lessons</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground py-8">Loading lessons...</p>
        ) : posts.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No lessons found in this category
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-3">
              Drag and drop lessons to reorder them
            </p>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={posts.map((p) => p.id)}
                strategy={verticalListSortingStrategy}
              >
                {posts.map((post, index) => (
                  <SortableItem
                    key={post.id}
                    id={post.id}
                    title={post.title}
                    order={index + 1}
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
