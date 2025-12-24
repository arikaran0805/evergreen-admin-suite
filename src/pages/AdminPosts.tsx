import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import LessonReorder from "@/components/LessonReorder";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/AdminLayout";
import { Plus, Edit, Trash2, Eye, Info } from "lucide-react";
import { format } from "date-fns";


interface Post {
  id: string;
  title: string;
  slug: string;
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  parent_id: string | null;
  category_id: string | null;
  courses: {
    slug: string;
  } | null;
}

interface PostStats {
  [postId: string]: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
}

const AdminPosts = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [postStats, setPostStats] = useState<PostStats>({});
  const [loading, setLoading] = useState(true);
  const [moderatorOnly, setModeratorOnly] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAccessAndLoad();
  }, []);

  const checkAccessAndLoad = async () => {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        navigate("/auth");
        return;
      }

      const { data: rolesData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .in("role", ["admin", "moderator"]);

      if (roleError) throw roleError;

      if (!rolesData || rolesData.length === 0) {
        toast({
          title: "Access Denied",
          description: "You don't have admin or moderator privileges",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      const roles = (rolesData || []).map((r) => r.role);
      const isModeratorOnly = roles.includes("moderator") && !roles.includes("admin");
      setModeratorOnly(isModeratorOnly);
      setCurrentUserId(session.user.id);

      await fetchPosts(session.user.id, isModeratorOnly);
    } catch (error: any) {
      console.error("Error checking access:", error);
      navigate("/");
    }
  };

  const fetchPosts = async (viewerUserId: string, isModeratorOnly: boolean) => {
    try {
      let query = supabase
        .from("posts")
        .select(
          "id, title, slug, status, published_at, created_at, updated_at, parent_id, category_id, courses:category_id(slug)"
        );

      if (isModeratorOnly) {
        query = query.eq("author_id", viewerUserId);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      setPosts(data || []);

      // Fetch stats for each post
      if (data && data.length > 0) {
        await fetchPostStats(data.map((p) => p.id));
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPostStats = async (postIds: string[]) => {
    try {
      const statsMap: PostStats = {};
      
      postIds.forEach(id => {
        statsMap[id] = { views: 0, likes: 0, comments: 0, shares: 0 };
      });

      const { data: viewsData } = await supabase
        .from("post_views")
        .select("post_id")
        .in("post_id", postIds);
      
      if (viewsData) {
        viewsData.forEach(view => {
          if (statsMap[view.post_id]) {
            statsMap[view.post_id].views++;
          }
        });
      }

      const { data: likesData } = await supabase
        .from("post_likes")
        .select("post_id")
        .in("post_id", postIds);
      
      if (likesData) {
        likesData.forEach(like => {
          if (statsMap[like.post_id]) {
            statsMap[like.post_id].likes++;
          }
        });
      }

      const { data: commentsData } = await supabase
        .from("comments")
        .select("post_id")
        .in("post_id", postIds);
      
      if (commentsData) {
        commentsData.forEach(comment => {
          if (statsMap[comment.post_id]) {
            statsMap[comment.post_id].comments++;
          }
        });
      }

      const { data: sharesData } = await supabase
        .from("post_shares")
        .select("post_id")
        .in("post_id", postIds);
      
      if (sharesData) {
        sharesData.forEach(share => {
          if (statsMap[share.post_id]) {
            statsMap[share.post_id].shares++;
          }
        });
      }

      setPostStats(statsMap);
    } catch (error) {
      console.error("Error fetching post stats:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Post deleted successfully",
      });

      fetchPosts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (post: Post) => {
    navigate(`/admin/posts/edit/${post.id}`);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center">Loading...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Manage Posts</h1>
          <p className="text-muted-foreground">Create and manage blog posts</p>
        </div>

        <Button onClick={() => navigate("/admin/posts/new")}>
          <Plus className="mr-2 h-4 w-4" />
          New Post
        </Button>
      </div>

      {/* Lesson Reorder Section */}
      {!moderatorOnly && (
        <div className="mb-8">
          <LessonReorder />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Posts</CardTitle>
          <CardDescription>Manage all your blog posts</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Published</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="font-medium">{post.title}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${
                      post.status === "published" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                    }`}>
                      {post.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    {post.published_at ? format(new Date(post.published_at), "MMM d, yyyy") : "-"}
                  </TableCell>
                  <TableCell>
                    {format(new Date(post.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (post.courses?.slug) {
                            window.open(`/course/${post.courses.slug}?lesson=${post.slug}`, "_blank");
                          } else {
                            toast({
                              title: "No Course",
                              description: "This post doesn't have a course assigned.",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(post)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="p-3">
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">Views:</span>
                                <span className="font-medium">{postStats[post.id]?.views || 0}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">Likes:</span>
                                <span className="font-medium">{postStats[post.id]?.likes || 0}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">Comments:</span>
                                <span className="font-medium">{postStats[post.id]?.comments || 0}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">Shares:</span>
                                <span className="font-medium">{postStats[post.id]?.shares || 0}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">Last Updated:</span>
                                <span className="font-medium">{format(new Date(post.updated_at), "MMM d, yyyy")}</span>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(post.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {posts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No posts yet. Create your first post!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminPosts;
