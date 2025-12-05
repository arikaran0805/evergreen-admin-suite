import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import RichTextEditor from "@/components/RichTextEditor";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/AdminLayout";
import { ArrowLeft, Save, X } from "lucide-react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";

const postSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  slug: z.string().min(1, "Slug is required").max(200),
  excerpt: z.string().max(500, "Excerpt too long").optional(),
  content: z.string().min(1, "Content is required"),
  featured_image: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  category_id: z.string().uuid().optional().or(z.literal("")),
  status: z.enum(["draft", "published"]),
  lesson_order: z.number().int().min(0).optional(),
  parent_id: z.string().uuid().optional().or(z.literal("")).or(z.literal("none")),
});

interface Category {
  id: string;
  name: string;
}

interface Post {
  id: string;
  title: string;
  category_id: string | null;
}

interface Tag {
  id: string;
  name: string;
  slug: string;
}

const AdminPostEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [mainLessons, setMainLessons] = useState<Post[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    featured_image: "",
    category_id: "",
    status: "draft" as "draft" | "published",
    lesson_order: 0,
    parent_id: "none",
  });

  useEffect(() => {
    checkAdminAccess();
    fetchCategories();
    fetchMainLessons();
    fetchTags();
    if (id) {
      fetchPost(id);
      fetchPostTags(id);
    }
  }, [id]);

  const checkAdminAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleData) {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges",
          variant: "destructive",
        });
        navigate("/");
      }
    } catch (error: any) {
      console.error("Error checking access:", error);
      navigate("/");
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error("Error fetching courses:", error);
    }
  };

  const fetchMainLessons = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("id, title, category_id")
        .is("parent_id", null)
        .order("title");

      if (error) throw error;
      setMainLessons(data || []);
    } catch (error: any) {
      console.error("Error fetching main lessons:", error);
    }
  };

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("name");

      if (error) throw error;
      setAllTags(data || []);
    } catch (error: any) {
      console.error("Error fetching tags:", error);
    }
  };

  const fetchPostTags = async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from("post_tags")
        .select("tag_id, tags(id, name, slug)")
        .eq("post_id", postId);

      if (error) throw error;
      
      const tags = data?.map(item => (item.tags as any)) || [];
      setSelectedTags(tags);
    } catch (error: any) {
      console.error("Error fetching post tags:", error);
    }
  };

  const fetchPost = async (postId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", postId)
        .single();

      if (error) throw error;
      
      if (data) {
        setFormData({
          title: data.title || "",
          slug: data.slug || "",
          excerpt: data.excerpt || "",
          content: data.content || "",
          featured_image: data.featured_image || "",
          category_id: data.category_id || "",
          status: (data.status as "draft" | "published") || "draft",
          lesson_order: data.lesson_order || 0,
          parent_id: data.parent_id || "none",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load post",
        variant: "destructive",
      });
      navigate("/admin/posts");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const validated = postSchema.parse(formData);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const postData = {
        title: validated.title,
        slug: validated.slug,
        excerpt: validated.excerpt || null,
        content: validated.content,
        featured_image: validated.featured_image || null,
        category_id: validated.category_id || null,
        status: validated.status,
        author_id: session.user.id,
        published_at: validated.status === "published" ? new Date().toISOString() : null,
        lesson_order: validated.lesson_order || 0,
        parent_id: validated.parent_id && validated.parent_id !== "" && validated.parent_id !== "none" ? validated.parent_id : null,
      };

      let postId = id;

      if (id) {
        const { error } = await supabase
          .from("posts")
          .update(postData)
          .eq("id", id);

        if (error) throw error;
      } else {
        const { data: newPost, error } = await supabase
          .from("posts")
          .insert([postData])
          .select()
          .single();

        if (error) throw error;
        postId = newPost.id;
      }

      // Save tags
      if (postId) {
        await savePostTags(postId);
      }

      toast({
        title: "Success",
        description: id ? "Post updated successfully" : "Post created successfully",
      });

      navigate("/admin/posts");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const savePostTags = async (postId: string) => {
    try {
      // Delete existing tags
      await supabase
        .from("post_tags")
        .delete()
        .eq("post_id", postId);

      // Insert new tags
      if (selectedTags.length > 0) {
        const postTagsData = selectedTags.map(tag => ({
          post_id: postId,
          tag_id: tag.id,
        }));

        const { error } = await supabase
          .from("post_tags")
          .insert(postTagsData);

        if (error) throw error;
      }
    } catch (error: any) {
      console.error("Error saving post tags:", error);
      throw error;
    }
  };

  const handleAddTag = async () => {
    if (!tagInput.trim()) return;

    const tagName = tagInput.trim();
    const tagSlug = generateSlug(tagName);

    // Check if tag already exists
    let tag = allTags.find(t => t.slug === tagSlug);

    if (!tag) {
      // Create new tag
      try {
        const { data, error } = await supabase
          .from("tags")
          .insert([{ name: tagName, slug: tagSlug }])
          .select()
          .single();

        if (error) throw error;
        tag = data;
        setAllTags([...allTags, data]);
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to create tag",
          variant: "destructive",
        });
        return;
      }
    }

    // Add tag to selected tags if not already added
    if (tag && !selectedTags.find(t => t.id === tag.id)) {
      setSelectedTags([...selectedTags, tag]);
    }

    setTagInput("");
  };

  const handleRemoveTag = (tagId: string) => {
    setSelectedTags(selectedTags.filter(t => t.id !== tagId));
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  if (loading && id) {
    return (
      <AdminLayout>
        <div className="text-center">Loading...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex gap-6 h-full">
        {/* Main Content Area */}
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/admin/posts")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Posts
            </Button>
            <h1 className="text-3xl font-bold">
              {id ? "Edit Post" : "Create New Post"}
            </h1>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="title" className="text-base">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => {
                  setFormData({ ...formData, title: e.target.value });
                  if (!id) {
                    setFormData(prev => ({ ...prev, slug: generateSlug(e.target.value) }));
                  }
                }}
                placeholder="Enter post title..."
                className="text-lg h-12"
              />
            </div>

            <div>
              <Label htmlFor="slug" className="text-base">Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="post-url-slug"
              />
            </div>

            <div>
              <Label htmlFor="excerpt" className="text-base">Excerpt</Label>
              <Textarea
                id="excerpt"
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                placeholder="Brief description of the post..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="content" className="text-base">Content</Label>
              <RichTextEditor
                value={formData.content}
                onChange={(value) => setFormData({ ...formData, content: value })}
                placeholder="Write your post content here..."
              />
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 space-y-4">
          <Card className="p-4 space-y-4 sticky top-6">
            <div className="flex gap-2">
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1"
              >
                <Save className="mr-2 h-4 w-4" />
                {id ? "Update" : "Publish"}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/admin/posts")}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value: "draft" | "published") => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category">Course</Label>
              <Select 
                value={formData.category_id} 
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
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

            <div>
              <Label htmlFor="parent">Parent Lesson</Label>
              <Select 
                value={formData.parent_id || ""} 
                onValueChange={(value) => {
                  if (value !== "none" && value) {
                    const parentLesson = mainLessons.find(l => l.id === value);
                    if (parentLesson && parentLesson.category_id) {
                      setFormData({ 
                        ...formData, 
                        parent_id: value,
                        category_id: parentLesson.category_id 
                      });
                      return;
                    }
                  }
                  setFormData({ ...formData, parent_id: value });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None - Main Lesson</SelectItem>
                  {mainLessons
                    .filter(lesson => {
                      if (id && lesson.id === id) return false;
                      if (formData.category_id && lesson.category_id !== formData.category_id) return false;
                      return true;
                    })
                    .map((lesson) => (
                      <SelectItem key={lesson.id} value={lesson.id}>
                        {lesson.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Make this a sub-lesson
              </p>
            </div>

            <div>
              <Label htmlFor="lesson_order">Lesson Order</Label>
              <Input
                id="lesson_order"
                type="number"
                min="0"
                value={formData.lesson_order}
                onChange={(e) => setFormData({ ...formData, lesson_order: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Lower numbers appear first
              </p>
            </div>

            <div>
              <Label htmlFor="featured_image">Featured Image URL</Label>
              <Input
                id="featured_image"
                type="url"
                value={formData.featured_image}
                onChange={(e) => setFormData({ ...formData, featured_image: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div>
              <Label htmlFor="tags">Tags</Label>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                  placeholder="Add a tag..."
                />
                <Button
                  type="button"
                  onClick={handleAddTag}
                  variant="secondary"
                  size="sm"
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedTags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    className="gap-1 pr-1"
                  >
                    {tag.name}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag.id)}
                      className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminPostEditor;
