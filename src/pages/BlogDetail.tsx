import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { trackPostView } from "@/lib/analytics";
import Header from "@/components/Header";
import { Calendar, User, MessageSquare, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

interface Post {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  featured_image: string | null;
  published_at: string | null;
  author_id: string;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  };
  categories: {
    name: string;
  } | null;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

const BlogDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    document.title = post ? `${post.title} - BlogHub` : "BlogHub - Blog Post";
  }, [post]);

  useEffect(() => {
    checkUser();
    fetchPost();
    fetchComments();
  }, [id]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
  };

  const fetchPost = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles:author_id (full_name, avatar_url),
          categories:category_id (name)
        `)
        .eq("id", id)
        .eq("status", "published")
        .single();

      if (error) throw error;
      setPost(data);
      
      // Track post view
      if (id) {
        trackPostView(id);
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

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from("comments")
        .select(`
          *,
          profiles:user_id (full_name, avatar_url)
        `)
        .eq("post_id", id)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error: any) {
      console.error("Error fetching comments:", error);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please login to comment",
        variant: "destructive",
      });
      return;
    }

    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("comments")
        .insert({
          post_id: id,
          user_id: user.id,
          content: newComment.trim(),
          status: "pending",
        });

      if (error) throw error;

      toast({
        title: "Comment submitted",
        description: "Your comment is pending approval",
      });

      setNewComment("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center">Loading...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Post not found</h1>
          <Link to="/blogs">
            <Button>Back to Blogs</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/blogs" className="inline-flex items-center text-primary hover:underline mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Blogs
        </Link>

        <article>
          {post.featured_image && (
            <img
              src={post.featured_image}
              alt={post.title}
              className="w-full h-96 object-cover rounded-lg mb-6"
            />
          )}

          <div className="mb-6">
            {post.categories && (
              <Badge variant="secondary" className="mb-4">
                {post.categories.name}
              </Badge>
            )}
            
            <h1 className="text-4xl font-bold text-foreground mb-4">{post.title}</h1>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{post.profiles?.full_name || "Anonymous"}</span>
              </div>
              {post.published_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(post.published_at), "MMM d, yyyy")}</span>
                </div>
              )}
            </div>
          </div>

          <Separator className="mb-6" />

          <div className="prose prose-lg max-w-none text-foreground mb-12">
            {post.content.split('\n').map((paragraph, idx) => (
              <p key={idx} className="mb-4">{paragraph}</p>
            ))}
          </div>
        </article>

        <Separator className="my-8" />

        {/* Comments Section */}
        <section>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            Comments ({comments.length})
          </h2>

          {/* Comment Form */}
          {user ? (
            <Card className="mb-8">
              <CardContent className="pt-6">
                <form onSubmit={handleSubmitComment} className="space-y-4">
                  <Textarea
                    placeholder="Share your thoughts..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={4}
                    required
                  />
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Submitting..." : "Post Comment"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="mb-8">
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground mb-4">Please login to leave a comment</p>
                <Link to="/auth">
                  <Button>Login</Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Comments List */}
          <div className="space-y-4">
            {comments.map((comment) => (
              <Card key={comment.id}>
                <CardContent className="pt-6">
                  <div className="flex gap-4">
                    <Avatar>
                      <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                      <AvatarFallback>
                        {comment.profiles?.full_name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold">
                          {comment.profiles?.full_name || "Anonymous"}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(comment.created_at), "MMM d, yyyy")}
                        </span>
                      </div>
                      <p className="text-foreground">{comment.content}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {comments.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No comments yet. Be the first to comment!
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default BlogDetail;
