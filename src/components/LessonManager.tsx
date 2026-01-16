import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import {
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  ChevronDown,
  FileText,
  BookOpen,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  lesson_order: number;
  is_published: boolean;
  created_at: string;
}

interface Post {
  id: string;
  title: string;
  slug: string;
  status: string;
  post_type: string | null;
}

interface SortableItemProps {
  lesson: Lesson;
  posts: Post[];
  index: number;
  onEdit: (lesson: Lesson) => void;
  onDelete: (lesson: Lesson) => void;
  onTogglePublish: (lesson: Lesson) => void;
  onCreatePost: (lessonId: string) => void;
  onEditPost: (postId: string) => void;
  basePath: string;
}

const SortableItem = ({
  lesson,
  posts,
  index,
  onEdit,
  onDelete,
  onTogglePublish,
  onCreatePost,
  onEditPost,
  basePath,
}: SortableItemProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const mainPost = posts.find((p) => p.post_type === "main" || !p.post_type);
  const subPosts = posts.filter((p) => p.post_type === "sub");

  return (
    <div ref={setNodeRef} style={style}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div
          className={`flex items-center gap-2 p-3 bg-muted/30 rounded-lg border ${
            isDragging ? "border-primary" : "border-border"
          }`}
        >
          <button
            className="cursor-grab active:cursor-grabbing touch-none p-1 hover:bg-muted rounded"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>

          <CollapsibleTrigger asChild>
            <button className="flex-1 flex items-center gap-2 text-left hover:bg-muted/50 rounded p-1 -m-1">
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">
                    {lesson.title}
                  </span>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    #{index + 1}
                  </Badge>
                  {!lesson.is_published && (
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      Draft
                    </Badge>
                  )}
                </div>
                {lesson.description && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {lesson.description}
                  </p>
                )}
              </div>
              <Badge variant="outline" className="text-xs shrink-0">
                {posts.length} post{posts.length !== 1 ? "s" : ""}
              </Badge>
            </button>
          </CollapsibleTrigger>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onTogglePublish(lesson)}
              title={lesson.is_published ? "Unpublish" : "Publish"}
            >
              {lesson.is_published ? (
                <Eye className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onEdit(lesson)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(lesson)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <CollapsibleContent>
          <div className="ml-8 mt-2 space-y-2 pb-2">
            {posts.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                No posts in this lesson yet
              </div>
            ) : (
              <div className="space-y-1.5">
                {mainPost && (
                  <div
                    className="flex items-center gap-2 p-2 bg-background rounded border cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onEditPost(mainPost.id)}
                  >
                    <BookOpen className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm font-medium flex-1 truncate">
                      {mainPost.title}
                    </span>
                    <Badge
                      variant={mainPost.status === "published" ? "default" : "secondary"}
                      className="text-[10px]"
                    >
                      {mainPost.status}
                    </Badge>
                  </div>
                )}
                {subPosts.map((post) => (
                  <div
                    key={post.id}
                    className="flex items-center gap-2 p-2 bg-background rounded border cursor-pointer hover:bg-muted/50 transition-colors ml-4"
                    onClick={() => onEditPost(post.id)}
                  >
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm flex-1 truncate">{post.title}</span>
                    <Badge
                      variant={post.status === "published" ? "default" : "secondary"}
                      className="text-[10px]"
                    >
                      {post.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={() => onCreatePost(lesson.id)}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Post to Lesson
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

interface LessonManagerProps {
  courseId: string;
  basePath?: string;
}

const LessonManager = ({ courseId, basePath = "/admin" }: LessonManagerProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonPosts, setLessonPosts] = useState<Record<string, Post[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [formData, setFormData] = useState({ title: "", description: "" });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (courseId) {
      fetchLessons();
    }
  }, [courseId]);

  const fetchLessons = async () => {
    try {
      setLoading(true);

      // Fetch lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from("course_lessons")
        .select("*")
        .eq("course_id", courseId)
        .is("deleted_at", null)
        .order("lesson_order");

      if (lessonsError) throw lessonsError;

      const typedLessons = (lessonsData || []) as Lesson[];
      setLessons(typedLessons);

      // Fetch posts for all lessons
      if (typedLessons.length > 0) {
        const lessonIds = typedLessons.map((l) => l.id);
        const { data: postsData, error: postsError } = await supabase
          .from("posts")
          .select("id, title, slug, status, post_type, lesson_id")
          .in("lesson_id", lessonIds)
          .is("deleted_at", null);

        if (postsError) throw postsError;

        // Group posts by lesson_id
        const grouped: Record<string, Post[]> = {};
        (postsData || []).forEach((post: any) => {
          if (!grouped[post.lesson_id]) {
            grouped[post.lesson_id] = [];
          }
          grouped[post.lesson_id].push(post);
        });
        setLessonPosts(grouped);
      } else {
        setLessonPosts({});
      }
    } catch (error: any) {
      toast({
        title: "Error fetching lessons",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = lessons.findIndex((l) => l.id === active.id);
      const newIndex = lessons.findIndex((l) => l.id === over.id);

      const newLessons = arrayMove(lessons, oldIndex, newIndex);
      setLessons(newLessons);

      // Update order in database
      try {
        await Promise.all(
          newLessons.map((lesson, index) =>
            supabase
              .from("course_lessons")
              .update({ lesson_order: index })
              .eq("id", lesson.id)
          )
        );
        toast({ title: "Lesson order updated" });
      } catch (error: any) {
        toast({
          title: "Error updating order",
          description: error.message,
          variant: "destructive",
        });
        fetchLessons(); // Revert on error
      }
    }
  };

  const handleAddLesson = async () => {
    if (!formData.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Get the max lesson_order from ALL lessons (including soft-deleted) to avoid unique constraint violation
      const { data: maxOrderData } = await supabase
        .from("course_lessons")
        .select("lesson_order")
        .eq("course_id", courseId)
        .order("lesson_order", { ascending: false })
        .limit(1)
        .single();

      const newOrder = maxOrderData ? maxOrderData.lesson_order + 1 : 0;

      const { error } = await supabase.from("course_lessons").insert({
        course_id: courseId,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        lesson_order: newOrder,
        is_published: false,
        created_by: session.user.id,
      });

      if (error) throw error;

      toast({ title: "Lesson created" });
      setShowAddDialog(false);
      setFormData({ title: "", description: "" });
      fetchLessons();
    } catch (error: any) {
      toast({
        title: "Error creating lesson",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEditLesson = async () => {
    if (!editingLesson || !formData.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("course_lessons")
        .update({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingLesson.id);

      if (error) throw error;

      toast({ title: "Lesson updated" });
      setShowEditDialog(false);
      setEditingLesson(null);
      setFormData({ title: "", description: "" });
      fetchLessons();
    } catch (error: any) {
      toast({
        title: "Error updating lesson",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLesson = async () => {
    if (!editingLesson) return;

    setSaving(true);
    try {
      // Soft delete the lesson
      const { error } = await supabase
        .from("course_lessons")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", editingLesson.id);

      if (error) throw error;

      toast({ title: "Lesson deleted" });
      setShowDeleteDialog(false);
      setEditingLesson(null);
      fetchLessons();
    } catch (error: any) {
      toast({
        title: "Error deleting lesson",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (lesson: Lesson) => {
    try {
      const { error } = await supabase
        .from("course_lessons")
        .update({ is_published: !lesson.is_published })
        .eq("id", lesson.id);

      if (error) throw error;

      toast({
        title: lesson.is_published ? "Lesson unpublished" : "Lesson published",
      });
      fetchLessons();
    } catch (error: any) {
      toast({
        title: "Error updating lesson",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setFormData({ title: lesson.title, description: lesson.description || "" });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setShowDeleteDialog(true);
  };

  const handleCreatePost = (lessonId: string) => {
    navigate(`${basePath}/posts/new?lessonId=${lessonId}&courseId=${courseId}`);
  };

  const handleEditPost = (postId: string) => {
    navigate(`${basePath}/posts/${postId}`);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Lessons
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Lessons
              <Badge variant="secondary" className="text-xs">
                {lessons.length}
              </Badge>
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => {
                setFormData({ title: "", description: "" });
                setShowAddDialog(true);
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Lesson
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {lessons.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <p>No lessons yet</p>
              <p className="text-xs mt-1">Create your first lesson to get started</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={lessons.map((l) => l.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {lessons.map((lesson, index) => (
                      <SortableItem
                        key={lesson.id}
                        lesson={lesson}
                        posts={lessonPosts[lesson.id] || []}
                        index={index}
                        onEdit={openEditDialog}
                        onDelete={openDeleteDialog}
                        onTogglePublish={handleTogglePublish}
                        onCreatePost={handleCreatePost}
                        onEditPost={handleEditPost}
                        basePath={basePath}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Add Lesson Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Lesson</DialogTitle>
            <DialogDescription>
              Create a new lesson for this course. You can add posts to it after
              creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="lesson-title">Title *</Label>
              <Input
                id="lesson-title"
                placeholder="e.g., Keywords"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lesson-description">Description</Label>
              <Input
                id="lesson-description"
                placeholder="Optional description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddLesson} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Lesson
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Lesson Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Lesson</DialogTitle>
            <DialogDescription>Update the lesson details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-lesson-title">Title *</Label>
              <Input
                id="edit-lesson-title"
                placeholder="e.g., Keywords"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lesson-description">Description</Label>
              <Input
                id="edit-lesson-description"
                placeholder="Optional description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditLesson} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lesson</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{editingLesson?.title}"? This
              action cannot be undone. Posts linked to this lesson will be
              unlinked but not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLesson}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default LessonManager;
