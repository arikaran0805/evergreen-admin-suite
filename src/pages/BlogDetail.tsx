import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { trackPostView } from "@/lib/analytics";
import Header from "@/components/Header";
import SEOHead from "@/components/SEOHead";
import ContentWithCodeCopy from "@/components/ContentWithCodeCopy";
import AdDisplay from "@/components/AdDisplay";
import { Calendar, MessageSquare, ArrowLeft, BookOpen, Mail, Tag, Heart, Share2 } from "lucide-react";
import { format } from "date-fns";
import CommentDialog from "@/components/CommentDialog";

interface Post {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  featured_image: string | null;
  published_at: string | null;
  updated_at: string;
  author_id: string;
  category_id: string | null;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  };
  categories: {
    id: string;
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

interface RelatedPost {
  id: string;
  title: string;
  slug: string;
}

const BlogDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);
  const [recentCourses, setRecentCourses] = useState<any[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    document.title = post ? `${post.title} - BlogHub` : "BlogHub - Course";
  }, [post]);

  useEffect(() => {
    checkUser();
    fetchPost();
    fetchComments();
    fetchRecentCourses();
    fetchTags();
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
          categories:category_id (id, name)
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

      // Fetch related posts from same category
      if (data.category_id) {
        fetchRelatedPosts(data.category_id);
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

  const fetchRelatedPosts = async (categoryId: string) => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("id, title, slug")
        .eq("category_id", categoryId)
        .eq("status", "published")
        .neq("id", id)
        .order("published_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setRelatedPosts(data || []);
    } catch (error) {
      console.error("Error fetching related posts:", error);
    }
  };

  const fetchRecentCourses = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("id, title, slug, featured_image, categories(name)")
        .eq("status", "published")
        .neq("id", id)
        .order("published_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentCourses(data || []);
    } catch (error) {
      console.error("Error fetching recent courses:", error);
    }
  };

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("name")
        .limit(10);

      if (error) throw error;
      setAllTags(data?.map(c => c.name) || []);
    } catch (error) {
      console.error("Error fetching tags:", error);
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

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Subscribed!",
      description: "You've been subscribed to our newsletter.",
    });
    setEmail("");
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
          <h1 className="text-2xl font-bold mb-4">Course not found</h1>
          <Link to="/blogs">
            <Button>Back to Courses</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <SEOHead 
        title={post.title}
        description={post.excerpt || `Read ${post.title} on BlogHub. ${post.categories?.name || 'Article'} by ${post.profiles?.full_name || 'Anonymous'}`}
        keywords={`${post.categories?.name || 'blog'}, ${post.title}, article`}
        ogImage={post.featured_image || undefined}
        ogTitle={post.title}
        ogDescription={post.excerpt || undefined}
      />
      <Header />
      
      {/* Large Poster Banner */}
      {post.featured_image && (
        <div className="w-full h-[400px] md:h-[500px] relative overflow-hidden">
          <img
            src={post.featured_image}
            alt={post.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>
      )}

      {/* Course Introduction */}
      <div className="container mx-auto px-4 -mt-32 relative z-10 mb-12">
        <div className="max-w-4xl mx-auto">
          <Link to="/blogs" className="inline-flex items-center text-primary hover:underline mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Courses
          </Link>

          <Card className="p-8 shadow-elegant border border-primary/10 bg-card/95 backdrop-blur-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                {post.categories && (
                  <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                    {post.categories.name}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="hover:text-primary">
                  <Heart className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="hover:text-primary">
                  <Share2 className="h-5 w-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="hover:text-primary relative"
                  onClick={() => setCommentDialogOpen(true)}
                >
                  <MessageSquare className="h-5 w-5" />
                  {comments.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {comments.length}
                    </span>
                  )}
                </Button>
              </div>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">{post.title}</h1>

            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
              <Calendar className="h-4 w-4" />
              <span>Last updated: {format(new Date(post.updated_at), "MMM d, yyyy")}</span>
            </div>

            {post.excerpt && (
              <p className="text-lg text-muted-foreground leading-relaxed">
                {post.excerpt}
              </p>
            )}
          </Card>
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="container mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT SIDEBAR - Course Topics/Lessons */}
          <aside className="lg:col-span-3">
            <Card className="sticky top-4 p-6 border border-primary/10 shadow-card">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="h-5 w-5 text-primary" />
                <h2 className="font-bold text-lg">Course Topics</h2>
              </div>
              
              <Separator className="mb-4" />
              
              <nav className="space-y-2">
                {relatedPosts.length > 0 ? (
                  relatedPosts.map((topic) => (
                    <Link 
                      key={topic.id}
                      to={`/blog/${topic.slug}`}
                      className="block p-3 rounded-lg hover:bg-primary/5 transition-colors group"
                    >
                      <span className="text-sm group-hover:text-primary transition-colors line-clamp-2">
                        {topic.title}
                      </span>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No related topics yet</p>
                )}
              </nav>
            </Card>
          </aside>

          {/* MAIN CONTENT - Course Details */}
          <main className="lg:col-span-6">
            <Card className="p-8 border border-primary/10 shadow-card">
              <ContentWithCodeCopy 
                content={post.content}
                className="prose prose-lg max-w-none text-foreground"
              />
              
              {/* After Post Ad */}
              <AdDisplay placement="after-post" className="mt-8 pt-8 border-t" />
            </Card>
            
            {/* In-Content Ad */}
            <AdDisplay placement="in-content" className="my-6" />
          </main>

          {/* RIGHT SIDEBAR - Recent Courses, Tags, Newsletter */}
          <aside className="lg:col-span-3 space-y-6">
            
            {/* Recent Courses */}
            <Card className="p-6 border border-primary/10 shadow-card">
              <h3 className="font-bold text-lg mb-4">Recent Courses</h3>
              <div className="space-y-4">
                {recentCourses.map((course) => (
                  <Link 
                    key={course.id}
                    to={`/blog/${course.slug}`}
                    className="block group"
                  >
                    <div className="flex gap-3">
                      {course.featured_image && (
                        <img 
                          src={course.featured_image} 
                          alt={course.title}
                          className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                          {course.title}
                        </h4>
                        {course.categories && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {course.categories.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>

            {/* Tags */}
            <Card className="p-6 border border-primary/10 shadow-card">
              <div className="flex items-center gap-2 mb-4">
                <Tag className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-lg">Tags</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <Badge 
                    key={tag} 
                    variant="secondary"
                    className="bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </Card>

            {/* Newsletter Subscription */}
            <Card className="p-6 border border-primary/10 shadow-card bg-gradient-to-br from-primary/5 to-transparent">
              <div className="flex items-center gap-2 mb-3">
                <Mail className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-lg">Newsletter</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Get the latest courses and updates delivered to your inbox.
              </p>
              <form onSubmit={handleNewsletterSubmit} className="space-y-3">
                <Input 
                  type="email"
                  placeholder="Your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-primary/20"
                />
                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  Subscribe
                </Button>
              </form>
            </Card>

            {/* Sidebar Ad */}
            <AdDisplay placement="sidebar" className="rounded-lg overflow-hidden" />

          </aside>
        </div>
      </div>

      {/* Comment Dialog */}
      <CommentDialog
        open={commentDialogOpen}
        onOpenChange={setCommentDialogOpen}
        comments={comments}
        user={user}
        newComment={newComment}
        setNewComment={setNewComment}
        onSubmitComment={handleSubmitComment}
        submitting={submitting}
      />

      <style>{`
        .prose {
          color: hsl(var(--foreground));
        }
        .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
          color: hsl(var(--foreground));
          font-weight: 700;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }
        .prose h1 { font-size: 2.25em; }
        .prose h2 { font-size: 1.875em; }
        .prose h3 { font-size: 1.5em; }
        .prose h4 { font-size: 1.25em; }
        .prose p {
          margin-bottom: 1em;
          line-height: 1.75;
        }
        .prose a {
          color: hsl(var(--primary));
          text-decoration: underline;
        }
        .prose a:hover {
          color: hsl(var(--primary-glow));
        }
        .prose strong {
          font-weight: 700;
          color: hsl(var(--foreground));
        }
        .prose em {
          font-style: italic;
        }
        .prose ul, .prose ol {
          margin: 1em 0;
          padding-left: 1.5em;
        }
        .prose li {
          margin-bottom: 0.5em;
        }
        .prose blockquote {
          border-left: 4px solid hsl(var(--primary));
          padding-left: 1em;
          margin: 1.5em 0;
          font-style: italic;
          color: hsl(var(--muted-foreground));
        }
        .prose code {
          background: hsl(var(--muted));
          padding: 0.2em 0.4em;
          border-radius: 0.25em;
          font-size: 0.875em;
          font-family: monospace;
        }
        .prose pre {
          background: hsl(var(--muted));
          padding: 1em;
          border-radius: 0.5em;
          overflow-x: auto;
          margin: 1em 0;
        }
        .prose pre code {
          background: none;
          padding: 0;
        }
        .prose img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5em;
          margin: 1.5em 0;
        }
      `}</style>
    </div>
  );
};

export default BlogDetail;