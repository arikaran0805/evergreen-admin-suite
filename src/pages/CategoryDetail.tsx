import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import SEOHead from "@/components/SEOHead";
import ContentWithCodeCopy from "@/components/ContentWithCodeCopy";
import { Home, ChevronLeft, ChevronRight, ChevronDown, BookOpen, Users, Mail, Tag, Search, Facebook, Twitter, Linkedin, Youtube, Instagram, Github, Heart, Share2, MessageSquare, Calendar } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trackSocialMediaClick } from "@/lib/socialAnalytics";
import { z } from "zod";
import type { User } from "@supabase/supabase-js";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

interface Post {
  id: string;
  title: string;
  excerpt: string | null;
  slug: string;
  featured_image: string | null;
  published_at: string | null;
  updated_at: string;
  content?: string;
  parent_id: string | null;
  lesson_order: number | null;
  profiles: {
    full_name: string | null;
  };
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  status: string;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

const commentSchema = z.object({
  content: z.string()
    .trim()
    .min(1, { message: "Comment cannot be empty" })
    .max(1000, { message: "Comment must be less than 1000 characters" })
});

const CategoryDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [category, setCategory] = useState<Category | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [recentCourses, setRecentCourses] = useState<any[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [siteSettings, setSiteSettings] = useState<any>(null);
  const [footerCategories, setFooterCategories] = useState<any[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [loadingPost, setLoadingPost] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentContent, setCommentContent] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Calculate learners count
  const learnersCount = Math.floor(Math.random() * 15000) + 5000;
  const formattedLearners = learnersCount.toLocaleString();

  useEffect(() => {
    document.title = category ? `${category.name} - BlogHub` : "BlogHub - Course";
  }, [category]);

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetchCategoryAndPosts();
    fetchRecentCourses();
    fetchTags();
    fetchSiteSettings();
    fetchFooterCategories();
  }, [slug]);

  useEffect(() => {
    if (selectedPost) {
      fetchComments(selectedPost.id);
    } else {
      setComments([]);
    }
  }, [selectedPost]);

  const fetchSiteSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .single();

      if (error) throw error;
      setSiteSettings(data);
    } catch (error) {
      console.error("Error fetching site settings:", error);
    }
  };

  const fetchFooterCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("name, slug")
        .order("name", { ascending: true })
        .limit(6);

      if (error) throw error;
      setFooterCategories(data || []);
    } catch (error) {
      console.error("Error fetching footer categories:", error);
    }
  };

  const fetchCategoryAndPosts = async () => {
    try {
      // Fetch category
      const { data: categoryData, error: categoryError } = await supabase
        .from("categories")
        .select("*")
        .eq("slug", slug)
        .single();

      if (categoryError) throw categoryError;
      setCategory(categoryData);

      // Fetch posts in this category
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select(`
          id,
          title,
          excerpt,
          slug,
          featured_image,
          published_at,
          updated_at,
          lesson_order,
          parent_id,
          profiles:author_id (full_name)
        `)
        .eq("category_id", categoryData.id)
        .eq("status", "published")
        .order("lesson_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (postsError) throw postsError;
      setPosts(postsData || []);
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

  const fetchRecentCourses = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, description")
        .neq("slug", slug)
        .order("created_at", { ascending: false })
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

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Subscribed!",
      description: "You've been subscribed to our newsletter.",
    });
    setEmail("");
  };

  const handleSocialClick = (platform: string) => {
    trackSocialMediaClick(platform);
  };

  const fetchPostContent = async (post: Post) => {
    setLoadingPost(true);
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles:author_id (full_name, avatar_url)
        `)
        .eq("id", post.id)
        .single();

      if (error) throw error;
      setSelectedPost(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load lesson content",
        variant: "destructive",
      });
    } finally {
      setLoadingPost(false);
    }
  };

  const handleLessonClick = (post: Post) => {
    // Check if this lesson has children
    const hasChildren = posts.some(p => p.parent_id === post.id);
    
    // If clicking a sub-lesson, only keep its parent expanded
    if (post.parent_id) {
      setExpandedParents(new Set([post.parent_id]));
    } else if (hasChildren) {
      // If clicking a main lesson with children, expand it
      setExpandedParents(new Set([post.id]));
    } else {
      // If clicking a main lesson without children, close all
      setExpandedParents(new Set());
    }
    
    fetchPostContent(post);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleParentExpansion = (parentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedParents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(parentId)) {
        newSet.delete(parentId);
      } else {
        newSet.add(parentId);
      }
      return newSet;
    });
  };

  const fetchComments = async (postId: string) => {
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from("comments")
        .select(`
          id,
          content,
          created_at,
          user_id,
          status,
          profiles:user_id (full_name, avatar_url)
        `)
        .eq("post_id", postId)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error: any) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to post a comment.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (!selectedPost) return;

    try {
      // Validate input
      const validated = commentSchema.parse({ content: commentContent });

      setSubmittingComment(true);

      const { error } = await supabase
        .from("comments")
        .insert({
          content: validated.content,
          post_id: selectedPost.id,
          user_id: user.id,
          status: "pending", // Comments need approval by default
        });

      if (error) throw error;

      toast({
        title: "Comment Submitted",
        description: "Your comment has been submitted for review.",
      });

      setCommentContent("");
      
      // Refresh comments after a short delay
      setTimeout(() => {
        fetchComments(selectedPost.id);
      }, 500);
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
          description: "Failed to submit comment. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setSubmittingComment(false);
    }
  };

  const currentPostIndex = selectedPost 
    ? posts.findIndex(p => p.id === selectedPost.id)
    : -1;

  // Build ordered lesson list considering hierarchy
  const getOrderedLessons = () => {
    const mainLessons = posts.filter(post => !post.parent_id);
    const orderedLessons: Post[] = [];
    
    mainLessons.forEach(mainLesson => {
      orderedLessons.push(mainLesson);
      const subLessons = posts.filter(post => post.parent_id === mainLesson.id);
      orderedLessons.push(...subLessons);
    });
    
    return orderedLessons;
  };

  const orderedLessons = getOrderedLessons();
  const currentOrderedIndex = selectedPost 
    ? orderedLessons.findIndex(p => p.id === selectedPost.id)
    : -1;
    
  const hasPrevious = currentOrderedIndex > 0;
  const hasNext = currentOrderedIndex < orderedLessons.length - 1 && currentOrderedIndex !== -1;

  const handlePrevious = () => {
    if (hasPrevious) {
      const prevLesson = orderedLessons[currentOrderedIndex - 1];
      
      // Only keep the previous lesson's parent expanded if it's a sub-lesson
      if (prevLesson.parent_id) {
        setExpandedParents(new Set([prevLesson.parent_id]));
      } else {
        setExpandedParents(new Set());
      }
      
      fetchPostContent(prevLesson);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      const nextLesson = orderedLessons[currentOrderedIndex + 1];
      
      // Only keep the next lesson's parent expanded if it's a sub-lesson
      if (nextLesson.parent_id) {
        setExpandedParents(new Set([nextLesson.parent_id]));
      } else {
        setExpandedParents(new Set());
      }
      
      fetchPostContent(nextLesson);
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

  if (!category) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Course not found</h1>
          <Link to="/">
            <Button className="bg-primary hover:bg-primary/90">Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title={`${category.name} - Course Category`}
        description={category.description || `Explore ${category.name} courses and lessons. Join ${formattedLearners} learners in this comprehensive learning path.`}
        keywords={`${category.name}, course, learning, tutorial, lessons`}
        ogTitle={`${category.name} Course`}
        ogDescription={category.description || `Learn ${category.name} with our comprehensive course materials`}
      />
      <Header />

      {/* 3-Column Layout */}
      <div className="w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
          
          {/* LEFT SIDEBAR - Course Topics/Lessons List */}
          <aside className="lg:col-span-2 bg-green-50 border-r border-green-100">
            <div className="sticky top-4">
              <div className="px-6 py-4 border-b border-green-100 bg-green-100/50">
                <div 
                  className="flex items-center gap-2 cursor-pointer hover:text-green-700 transition-colors"
                  onClick={() => setSelectedPost(null)}
                >
                  <BookOpen className="h-5 w-5 text-green-700" />
                  <h2 className="font-semibold text-lg text-green-900">Course Lessons</h2>
                </div>
              </div>
              
              <ScrollArea className="h-[calc(100vh-200px)]">
                <nav className="p-2">
                  {posts.length > 0 ? (
                    (() => {
                      // Group posts by parent
                      const mainLessons = posts.filter(post => !post.parent_id);
                      const subLessonsMap = new Map<string, Post[]>();
                      
                      posts.forEach(post => {
                        if (post.parent_id) {
                          if (!subLessonsMap.has(post.parent_id)) {
                            subLessonsMap.set(post.parent_id, []);
                          }
                          subLessonsMap.get(post.parent_id)!.push(post);
                        }
                      });

                      return mainLessons.map((post) => {
                        const hasChildren = subLessonsMap.has(post.id);
                        const isExpanded = expandedParents.has(post.id);
                        const isMainLessonActive = selectedPost?.id === post.id;
                        const hasActiveChild = selectedPost?.parent_id === post.id;
                        
                        return (
                          <div key={post.id} className="mb-1">
                            {/* Main Lesson */}
                            <div
                              className={`rounded-lg transition-all duration-300 ${
                                isMainLessonActive
                                  ? 'bg-green-600 shadow-md' 
                                  : hasActiveChild
                                  ? 'bg-green-200'
                                  : 'hover:bg-green-100'
                              }`}
                            >
                              <div className="px-3 py-2.5 flex items-center justify-between">
                                <h3 
                                  onClick={() => handleLessonClick(post)}
                                  className={`text-sm font-medium flex-1 cursor-pointer transition-colors ${
                                    isMainLessonActive
                                      ? 'text-white' 
                                      : hasActiveChild
                                      ? 'text-green-900 font-semibold'
                                      : 'text-green-900'
                                  }`}
                                >
                                  {post.title}
                                </h3>
                                {hasChildren && (
                                  <button
                                    onClick={(e) => toggleParentExpansion(post.id, e)}
                                    className={`ml-2 p-1 rounded hover:bg-green-300 transition-all duration-300 ${
                                      isExpanded ? 'rotate-180' : ''
                                    } ${
                                      isMainLessonActive 
                                        ? 'text-white hover:bg-green-700' 
                                        : hasActiveChild
                                        ? 'text-green-900'
                                        : 'text-green-700'
                                    }`}
                                  >
                                    <ChevronDown className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            {/* Sub-lessons - only show when expanded */}
                            {hasChildren && isExpanded && (
                              <div className="ml-4 mt-1 space-y-1 animate-accordion-down">
                                {subLessonsMap.get(post.id)!.map((subPost) => (
                                  <div
                                    key={subPost.id}
                                    onClick={() => handleLessonClick(subPost)}
                                    className={`rounded-lg cursor-pointer transition-all duration-200 ${
                                      selectedPost?.id === subPost.id 
                                        ? 'bg-green-600 shadow-md scale-[1.02]' 
                                        : 'hover:bg-green-100'
                                    }`}
                                  >
                                    <div className="px-3 py-2">
                                      <h3 className={`text-sm transition-colors ${
                                        selectedPost?.id === subPost.id 
                                          ? 'text-white font-medium' 
                                          : 'text-green-700'
                                      }`}>
                                        • {subPost.title}
                                      </h3>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()
                  ) : (
                    <p className="text-sm text-green-700 p-4">No lessons available yet</p>
                  )}
                </nav>
              </ScrollArea>
            </div>
          </aside>

          {/* MAIN CONTENT - Lesson Content */}
          <main className="lg:col-span-8">
            <Card className="border border-primary/10 shadow-card rounded-none">
              <CardContent className="p-12 leading-relaxed">
                {loadingPost ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">Loading lesson...</p>
                  </div>
                ) : selectedPost ? (
                  <>
                    {/* Lesson Header */}
                    <div className="mb-4">
                      <div className="flex items-start justify-between mb-2">
                        <h1 className="text-4xl font-bold flex-1">{selectedPost.title}</h1>
                        <div className="flex items-center gap-3 ml-4">
                          <Button variant="ghost" size="icon" className="hover:text-primary">
                            <Heart className="h-5 w-5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="hover:text-primary">
                            <Share2 className="h-5 w-5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="hover:text-primary">
                            <MessageSquare className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                      {selectedPost.excerpt && (
                        <p className="text-xl text-muted-foreground mb-2">{selectedPost.excerpt}</p>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground pb-4 border-b">
                        <Calendar className="h-4 w-4" />
                        <span>Last updated: {new Date(selectedPost.updated_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}</span>
                      </div>
                    </div>

                    {/* Featured Image */}
                    {selectedPost.featured_image && (
                      <img 
                        src={selectedPost.featured_image} 
                        alt={selectedPost.title}
                        className="w-full h-auto rounded-lg mb-8 shadow-md"
                      />
                    )}

                    <Separator className="my-8" />

                    {/* Lesson Content */}
                    <ContentWithCodeCopy 
                      content={selectedPost.content || ''}
                      className="prose prose-lg max-w-none leading-relaxed"
                    />

                    {/* Comments Section */}
                    <div className="mt-12 pt-8 border-t border-border">
                      <h3 className="text-2xl font-bold mb-6">Comments ({comments.length})</h3>
                      <div className="space-y-6">
                        {/* Comment Form */}
                        <Card className="border border-primary/10">
                          <CardContent className="p-6">
                            <h4 className="font-semibold mb-4">Leave a Comment</h4>
                            {user ? (
                              <form onSubmit={handleCommentSubmit} className="space-y-4">
                                <div>
                                  <textarea
                                    placeholder="Share your thoughts..."
                                    value={commentContent}
                                    onChange={(e) => setCommentContent(e.target.value)}
                                    className="w-full min-h-[120px] px-3 py-2 rounded-md border border-primary/20 bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    maxLength={1000}
                                    required
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {commentContent.length}/1000 characters
                                  </p>
                                </div>
                                <Button 
                                  type="submit" 
                                  className="bg-primary hover:bg-primary/90"
                                  disabled={submittingComment || !commentContent.trim()}
                                >
                                  {submittingComment ? "Posting..." : "Post Comment"}
                                </Button>
                              </form>
                            ) : (
                              <div className="text-center py-8">
                                <p className="text-muted-foreground mb-4">
                                  You must be logged in to leave a comment.
                                </p>
                                <Button 
                                  onClick={() => navigate("/auth")}
                                  className="bg-primary hover:bg-primary/90"
                                >
                                  Log In to Comment
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        {/* Comments List */}
                        <div className="space-y-4">
                          {loadingComments ? (
                            <Card className="border border-primary/10">
                              <CardContent className="p-6 text-center text-muted-foreground">
                                Loading comments...
                              </CardContent>
                            </Card>
                          ) : comments.length > 0 ? (
                            comments.map((comment) => (
                              <Card key={comment.id} className="border border-primary/10">
                                <CardContent className="p-6">
                                  <div className="flex items-start gap-4">
                                    {comment.profiles?.avatar_url ? (
                                      <img 
                                        src={comment.profiles.avatar_url} 
                                        alt={comment.profiles.full_name || "User"}
                                        className="flex-shrink-0 w-10 h-10 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                                        {comment.profiles?.full_name?.charAt(0)?.toUpperCase() || "?"}
                                      </div>
                                    )}
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="font-semibold">
                                          {comment.profiles?.full_name || "Anonymous"}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          {new Date(comment.created_at).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric'
                                          })}
                                        </span>
                                      </div>
                                      <p className="text-muted-foreground whitespace-pre-wrap">
                                        {comment.content}
                                      </p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))
                          ) : (
                            <Card className="border border-primary/10">
                              <CardContent className="p-6 text-center text-muted-foreground">
                                No comments yet. Be the first to share your thoughts!
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Advertisement Placeholder */}
                    <Card className="mt-8 border-2 border-dashed border-primary/20 bg-muted/30">
                      <CardContent className="p-8 text-center">
                        <p className="text-sm text-muted-foreground font-medium">Advertisement</p>
                        <p className="text-xs text-muted-foreground mt-1">300x250</p>
                      </CardContent>
                    </Card>

                    {/* Lesson Navigation */}
                    <div className="mt-12 pt-8 border-t-2 border-border">
                      <div className="flex items-center justify-between gap-4">
                        {hasPrevious ? (
                          <Button 
                            variant="outline" 
                            size="lg"
                            className="gap-2 flex-1"
                            onClick={handlePrevious}
                          >
                            <ChevronLeft className="h-5 w-5" />
                            <div className="text-left">
                              <div className="text-xs text-muted-foreground">Previous</div>
                              <div className="font-semibold truncate max-w-[200px]">{orderedLessons[currentOrderedIndex - 1]?.title}</div>
                            </div>
                          </Button>
                        ) : (
                          <div className="flex-1" />
                        )}
                        {hasNext ? (
                          <Button 
                            size="lg"
                            className="gap-2 bg-primary hover:bg-primary/90 flex-1"
                            onClick={handleNext}
                          >
                            <div className="text-right">
                              <div className="text-xs">Next Lesson</div>
                              <div className="font-semibold truncate max-w-[200px]">{orderedLessons[currentOrderedIndex + 1]?.title}</div>
                            </div>
                            <ChevronRight className="h-5 w-5" />
                          </Button>
                        ) : (
                          <div className="flex-1" />
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Course Banner */}
                    <div className="relative w-full h-64 mb-8 rounded-lg overflow-hidden">
                      <img 
                        src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&h=400&fit=crop"
                        alt={category.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/50 to-transparent flex items-end">
                        <div className="p-8 w-full">
                          <h2 className="text-4xl font-bold mb-2 text-foreground">{category.name}</h2>
                          <div className="flex items-center gap-2 text-foreground/80">
                            <Users className="h-5 w-5" />
                            <span className="text-lg font-semibold">{formattedLearners} learners</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Course Overview - Default View */}
                    {category.description && (
                      <div className="py-4 mb-8">
                        <div 
                          className="prose prose-lg max-w-none text-foreground leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: category.description }}
                        />
                      </div>
                    )}

                    {posts.length > 0 && (
                      <div className="mt-8 p-6 bg-primary/5 rounded-lg border border-primary/20">
                        <h3 className="font-bold text-xl mb-3">Ready to Get Started?</h3>
                        <p className="text-muted-foreground mb-4">
                          Select a lesson from the sidebar to begin your learning journey!
                        </p>
                        <Button 
                          className="bg-primary hover:bg-primary/90 shadow-md w-full sm:w-auto"
                          onClick={() => handleLessonClick(posts[0])}
                        >
                          Start First Lesson
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </main>

          {/* RIGHT SIDEBAR - Recent Courses, Tags, Newsletter, AdSense */}
          <aside className="lg:col-span-2">
            <div className="sticky top-4 space-y-0">
                  
              {/* Search */}
              <Card className="border border-primary/10 shadow-card rounded-none">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Search className="h-5 w-5 text-primary" />
                    <h3 className="font-bold text-lg">Search</h3>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search lessons..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 border-primary/20 rounded-none"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Advertisement Banner 1 */}
              <Card className="border border-primary/10 shadow-card rounded-none">
                <CardContent className="p-6">
                  <div className="bg-muted/30 h-[280px] flex items-center justify-center border-2 border-dashed border-primary/20">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground font-semibold">Advertisement</p>
                      <p className="text-xs text-muted-foreground mt-1">Your ad could be here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Courses */}
              <Card className="border border-primary/10 shadow-card rounded-none">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-4">Recent Courses</h3>
                  <div className="space-y-4">
                    {recentCourses.map((course) => (
                      <Link 
                        key={course.id}
                        to={`/category/${course.slug}`}
                        className="block group"
                      >
                        <div className="p-3 hover:bg-primary/10 transition-all duration-300 hover:shadow-sm">
                          <h4 className="text-sm font-semibold mb-1 group-hover:text-primary transition-colors">
                            {course.name}
                          </h4>
                          {course.description && (
                            <div 
                              className="text-xs text-muted-foreground line-clamp-2 prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{ __html: course.description }}
                            />
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Tags */}
              <Card className="border border-primary/10 shadow-card rounded-none">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Tag className="h-5 w-5 text-primary" />
                    <h3 className="font-bold text-lg">Tags</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {allTags.map((tag) => (
                      <Badge 
                        key={tag} 
                        variant="secondary"
                        className="bg-primary/10 text-primary hover:bg-primary/20 hover:scale-105 cursor-pointer transition-all duration-300"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Google AdSense Placeholder */}
              <Card className="border border-primary/10 shadow-card rounded-none">
                <CardContent className="p-6">
                  <div className="bg-muted/30 h-[250px] flex items-center justify-center border-2 border-dashed border-primary/20">
                    <p className="text-sm text-muted-foreground">Ad Space</p>
                  </div>
                </CardContent>
              </Card>

              {/* Newsletter Subscription */}
              <Card className="border border-primary/10 shadow-card bg-gradient-to-br from-primary/5 to-background rounded-none">
                <CardContent className="p-6">
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
                      className="border-primary/20 rounded-none"
                    />
                    <Button 
                      type="submit" 
                      className="w-full bg-primary hover:bg-primary/90 transition-all duration-300 rounded-none"
                    >
                      Subscribe
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Follow Us - Social Links */}
              <Card className="border border-primary/10 shadow-card rounded-none">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-4">Follow Us</h3>
                  <div className="flex flex-wrap gap-3">
                    {siteSettings?.facebook_url && (
                      <a
                        href={siteSettings.facebook_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleSocialClick('facebook')}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-110"
                      >
                        <Facebook className="h-5 w-5" />
                      </a>
                    )}
                    {siteSettings?.twitter_url && (
                      <a
                        href={siteSettings.twitter_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleSocialClick('twitter')}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-110"
                      >
                        <Twitter className="h-5 w-5" />
                      </a>
                    )}
                    {siteSettings?.linkedin_url && (
                      <a
                        href={siteSettings.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleSocialClick('linkedin')}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-110"
                      >
                        <Linkedin className="h-5 w-5" />
                      </a>
                    )}
                    {siteSettings?.youtube_url && (
                      <a
                        href={siteSettings.youtube_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleSocialClick('youtube')}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-110"
                      >
                        <Youtube className="h-5 w-5" />
                      </a>
                    )}
                    {siteSettings?.instagram_url && (
                      <a
                        href={siteSettings.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleSocialClick('instagram')}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-110"
                      >
                        <Instagram className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Advertisement Banner 2 */}
              <Card className="border border-primary/10 shadow-card">
                <CardContent className="p-6">
                  <div className="bg-muted/30 rounded-lg h-[280px] flex items-center justify-center border-2 border-dashed border-primary/20">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground font-semibold">Advertisement</p>
                      <p className="text-xs text-muted-foreground mt-1">Your ad could be here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-card mt-12">
        <div className="container px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                {siteSettings?.logo_url ? (
                  <img src={siteSettings.logo_url} alt={siteSettings.site_name} className="h-10 w-auto" />
                ) : (
                  <>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
                      <span className="text-xl font-bold text-primary-foreground">
                        {siteSettings?.site_name?.charAt(0) || 'B'}
                      </span>
                    </div>
                    <span className="text-xl font-bold text-primary">{siteSettings?.site_name || 'BlogHub'}</span>
                  </>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {siteSettings?.site_description || 'Inspiring stories and ideas for curious minds.'}
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Categories</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {footerCategories.map((category) => (
                  <li key={category.slug}>
                    <Link to={`/category/${category.slug}`} className="hover:text-primary transition-colors">
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/about" className="hover:text-primary transition-colors">About</Link></li>
                <li><Link to="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
                <li><Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
                <li><Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Connect</h3>
              <div className="flex flex-col gap-2">
                {siteSettings?.twitter_url && (
                  <a 
                    href={siteSettings.twitter_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={() => handleSocialClick("twitter")}
                    className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                    aria-label="Twitter"
                  >
                    <Twitter className="h-5 w-5" />
                    <span>Twitter</span>
                  </a>
                )}
                {siteSettings?.facebook_url && (
                  <a 
                    href={siteSettings.facebook_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={() => handleSocialClick("facebook")}
                    className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                    aria-label="Facebook"
                  >
                    <Facebook className="h-5 w-5" />
                    <span>Facebook</span>
                  </a>
                )}
                {siteSettings?.instagram_url && (
                  <a 
                    href={siteSettings.instagram_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={() => handleSocialClick("instagram")}
                    className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                    aria-label="Instagram"
                  >
                    <Instagram className="h-5 w-5" />
                    <span>Instagram</span>
                  </a>
                )}
                {siteSettings?.linkedin_url && (
                  <a 
                    href={siteSettings.linkedin_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={() => handleSocialClick("linkedin")}
                    className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                    aria-label="LinkedIn"
                  >
                    <Linkedin className="h-5 w-5" />
                    <span>LinkedIn</span>
                  </a>
                )}
                {siteSettings?.youtube_url && (
                  <a 
                    href={siteSettings.youtube_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={() => handleSocialClick("youtube")}
                    className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                    aria-label="YouTube"
                  >
                    <Youtube className="h-5 w-5" />
                    <span>YouTube</span>
                  </a>
                )}
                {siteSettings?.github_url && (
                  <a 
                    href={siteSettings.github_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={() => handleSocialClick("github")}
                    className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                    aria-label="GitHub"
                  >
                    <Github className="h-5 w-5" />
                    <span>GitHub</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} {siteSettings?.site_name || 'BlogHub'}. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <style>{`
        .prose {
          color: hsl(var(--foreground));
        }
        .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
          color: hsl(var(--foreground));
          font-weight: 700;
        }
        .prose p {
          line-height: 1.75;
        }
        .prose ul {
          list-style-type: disc;
          padding-left: 1.5em;
        }
        .prose li {
          margin-bottom: 0.5em;
        }
        .prose img {
          border-radius: 0.5rem;
          margin: 1.5rem 0;
        }
        .prose a {
          color: hsl(var(--primary));
          text-decoration: underline;
        }
        .prose a:hover {
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
};

export default CategoryDetail;
