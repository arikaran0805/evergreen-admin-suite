import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdSettings } from "@/hooks/useAdSettings";
import { useCourseStats } from "@/hooks/useCourseStats";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useCourseProgress } from "@/hooks/useCourseProgress";
import { useLessonTimeTracking } from "@/hooks/useLessonTimeTracking";
import { useUserRole } from "@/hooks/useUserRole";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import SEOHead from "@/components/SEOHead";
import ContentWithCodeCopy from "@/components/ContentWithCodeCopy";
import CourseReviewDialog from "@/components/CourseReviewDialog";
import { Home, ChevronLeft, ChevronRight, ChevronDown, BookOpen, Users, Mail, Tag, Search, ThumbsUp, Share2, MessageSquare, Calendar, MoreVertical, Bookmark, BookmarkCheck, Flag, Edit, Star, UserPlus, UserCheck, CheckCircle, Circle, AlertTriangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ShareTooltip from "@/components/ShareTooltip";
import CommentDialog from "@/components/CommentDialog";
import {
  SidebarAdTop,
  SidebarAdMiddle,
  SidebarAdBottom
} from "@/components/ads";
import ContentRenderer from "@/components/ContentRenderer";

import { trackSocialMediaClick } from "@/lib/socialAnalytics";
import { z } from "zod";
import type { User } from "@supabase/supabase-js";

interface Course {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  featured_image: string | null;
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
  code_theme?: string | null;
  profiles: {
    full_name: string | null;
  };
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string | null;
  status: string;
  is_anonymous: boolean;
  display_name: string | null;
  parent_id: string | null;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

const commentSchema = z.object({
  content: z.string()
    .trim()
    .min(1, { message: "Comment cannot be empty" })
    .max(1000, { message: "Comment must be less than 1000 characters" })
});

const CourseDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const lessonSlug = searchParams.get("lesson");
  const isPreviewMode = searchParams.get("preview") === "true";
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [recentCourses, setRecentCourses] = useState<any[]>([]);
  const [allTags, setAllTags] = useState<Array<{id: string; name: string; slug: string}>>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [siteSettings, setSiteSettings] = useState<any>(null);
  const [canPreview, setCanPreview] = useState(false);
  const { isAdmin, isModerator, isLoading: roleLoading } = useUserRole();
  const [footerCategories, setFooterCategories] = useState<any[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [loadingPost, setLoadingPost] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentContent, setCommentContent] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const [likeCount, setLikeCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [likingPost, setLikingPost] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const { toast } = useToast();
  const { settings: adSettings } = useAdSettings();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const [showAnnouncement, setShowAnnouncement] = useState(false);

  // Course stats hook
  const {
    stats: courseStats,
    reviews: courseReviews,
    enrolling,
    enroll,
    unenroll,
    submitReview,
    deleteReview,
  } = useCourseStats(course?.id, user);

  // Course progress hook
  const { progress, markLessonViewed, markLessonCompleted, isLessonCompleted } = useCourseProgress(course?.id);
  const [markingComplete, setMarkingComplete] = useState(false);

  // Time tracking hook
  useLessonTimeTracking({ lessonId: selectedPost?.id, courseId: course?.id });

  const handleAnnouncementVisibility = useCallback((visible: boolean) => {
    setShowAnnouncement(visible);
  }, []);

  const handleEnroll = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to enroll in this course.",
        variant: "destructive",
      });
      return;
    }
    const success = await enroll();
    if (success) {
      toast({ title: "Successfully enrolled!", description: "You can now access all course materials." });
    }
  };

  const handleUnenroll = async () => {
    const success = await unenroll();
    if (success) {
      toast({ title: "Unenrolled", description: "You have been unenrolled from this course." });
    }
  };

  useEffect(() => {
    document.title = course ? `${course.name} - BlogHub` : "BlogHub - Course";
  }, [course]);

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

  // Set preview access based on user role
  useEffect(() => {
    if (!roleLoading) {
      setCanPreview(isAdmin || isModerator);
    }
  }, [isAdmin, isModerator, roleLoading]);

  useEffect(() => {
    if (!roleLoading) {
      fetchCourseAndLessons();
      fetchRecentCourses();
      fetchSiteSettings();
      fetchFooterCategories();
    }
  }, [slug, roleLoading, canPreview]);

  // Auto-select lesson from URL query param (supports browser back/forward)
  useEffect(() => {
    if (lessonSlug && posts.length > 0) {
      const lessonToSelect = posts.find(p => p.slug === lessonSlug);
      if (lessonToSelect && selectedPost?.slug !== lessonSlug) {
        // Directly fetch content and set state without triggering another URL update
        if (lessonToSelect.parent_id) {
          setExpandedParents(new Set([lessonToSelect.parent_id]));
        } else {
          const hasChildren = posts.some(p => p.parent_id === lessonToSelect.id);
          if (hasChildren) {
            setExpandedParents(new Set([lessonToSelect.id]));
          }
        }
        fetchPostContent(lessonToSelect);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [lessonSlug, posts]);

  useEffect(() => {
    if (selectedPost) {
      fetchComments(selectedPost.id);
      fetchTags(selectedPost.id);

      // Subscribe to real-time comment updates
      const channel = supabase
        .channel(`comments-${selectedPost.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'comments',
            filter: `post_id=eq.${selectedPost.id}`
          },
          () => {
            fetchComments(selectedPost.id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setComments([]);
      setAllTags([]);
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
        .from("courses")
        .select("name, slug")
        .order("name", { ascending: true })
        .limit(6);

      if (error) throw error;
      setFooterCategories(data || []);
    } catch (error) {
      console.error("Error fetching footer courses:", error);
    }
  };

  const fetchCourseAndLessons = async () => {
    try {
      // Fetch course - in preview mode, allow any status for admins/moderators
      let courseQuery = supabase
        .from("courses")
        .select("*")
        .eq("slug", slug);
      
      // Only filter by published status if not in preview mode or user can't preview
      if (!isPreviewMode || !canPreview) {
        courseQuery = courseQuery.eq("status", "published");
      }

      const { data: courseData, error: courseError } = await courseQuery.single();

      if (courseError) {
        if (courseError.code === 'PGRST116') {
          // No rows found - course doesn't exist or not accessible
          throw new Error("Course not found or not published yet");
        }
        throw courseError;
      }
      setCourse(courseData);

      // Fetch posts in this course - in preview mode, show all statuses
      let postsQuery = supabase
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
          status,
          profiles:author_id (full_name)
        `)
        .eq("category_id", courseData.id)
        .order("lesson_order", { ascending: true })
        .order("created_at", { ascending: true });

      // Only filter by published status if not in preview mode or user can't preview
      if (!isPreviewMode || !canPreview) {
        postsQuery = postsQuery.eq("status", "published");
      }

      const { data: postsData, error: postsError } = await postsQuery;

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
        .from("courses")
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

  const fetchTags = async (postId?: string) => {
    if (!postId) {
      setAllTags([]);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from("post_tags")
        .select("tags(id, name, slug)")
        .eq("post_id", postId);

      if (error) throw error;
      
      const tags = data?.map(item => (item.tags as any)) || [];
      setAllTags(tags);
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  const fetchLikeData = async (postId: string) => {
    try {
      const { count } = await supabase
        .from("post_likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);
      setLikeCount(count || 0);

      if (user) {
        const { data } = await supabase
          .from("post_likes")
          .select("id")
          .eq("post_id", postId)
          .eq("user_id", user.id)
          .maybeSingle();
        setHasLiked(!!data);
      }
    } catch (error) {
      console.error("Error fetching like data:", error);
    }
  };

  const handleLikeToggle = async () => {
    if (!user) {
      toast({ title: "Authentication required", description: "Please sign in to like this lesson.", variant: "destructive" });
      return;
    }
    if (!selectedPost || likingPost) return;

    setLikingPost(true);
    try {
      if (hasLiked) {
        await supabase.from("post_likes").delete().eq("post_id", selectedPost.id).eq("user_id", user.id);
        setHasLiked(false);
        setLikeCount((prev) => Math.max(0, prev - 1));
      } else {
        await supabase.from("post_likes").insert({ post_id: selectedPost.id, user_id: user.id });
        setHasLiked(true);
        setLikeCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    } finally {
      setLikingPost(false);
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
      await fetchLikeData(post.id);
      
      // Mark lesson as viewed for progress tracking
      if (user) {
        markLessonViewed(post.id);
      }
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
    
    // Helper to update URL with lesson slug (adds to browser history)
    const updateUrlWithLesson = (lessonSlug: string) => {
      navigate(`/course/${slug}?lesson=${lessonSlug}`);
    };
    
    // If clicking a sub-lesson, only keep its parent expanded
    if (post.parent_id) {
      setExpandedParents(new Set([post.parent_id]));
      fetchPostContent(post);
      updateUrlWithLesson(post.slug);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (hasChildren) {
      // Check if a child of this parent is currently selected
      const hasActiveChild = selectedPost?.parent_id === post.id;
      const isCurrentlyExpanded = expandedParents.has(post.id);
      
      // If child is active, load parent content but keep expanded
      if (isCurrentlyExpanded && hasActiveChild) {
        fetchPostContent(post);
        updateUrlWithLesson(post.slug);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      
      setExpandedParents(prev => {
        const newSet = new Set(prev);
        if (newSet.has(post.id)) {
          newSet.delete(post.id);
        } else {
          newSet.clear();
          newSet.add(post.id);
        }
        return newSet;
      });
      // Only load content if expanding (not collapsing) and not already selected
      if (!isCurrentlyExpanded && selectedPost?.id !== post.id) {
        fetchPostContent(post);
        updateUrlWithLesson(post.slug);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      // If clicking a main lesson without children, close all
      setExpandedParents(new Set());
      fetchPostContent(post);
      updateUrlWithLesson(post.slug);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
          is_anonymous,
          display_name,
          parent_id,
          profiles:user_id (full_name, avatar_url)
        `)
        .eq("post_id", postId)
        .eq("status", "approved")
        .order("created_at", { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error: any) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent, isAnonymous: boolean = false, parentId?: string, content?: string) => {
    e.preventDefault();

    if (!selectedPost) return;

    // Use provided content for replies, otherwise use commentContent state
    const commentText = content || commentContent;

    try {
      // Validate input
      const validated = commentSchema.parse({ content: commentText });

      setSubmittingComment(true);

      const commentData: any = {
        content: validated.content,
        post_id: selectedPost.id,
        is_anonymous: user ? isAnonymous : true,
        display_name: user && !isAnonymous ? null : "unknown_ant",
        parent_id: parentId || null,
      };

      // Only set user_id if logged in and not posting anonymously
      if (user) {
        commentData.user_id = user.id;
      }

      const { error } = await supabase
        .from("comments")
        .insert(commentData);

      if (error) throw error;

      toast({
        title: "Comment Posted",
        description: "Your comment has been posted.",
      });

      // Only clear the main comment box for top-level comments
      if (!content) {
        setCommentContent("");
      }
      fetchComments(selectedPost.id);
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

  const handleEditComment = async (commentId: string, newContent: string) => {
    try {
      const validated = commentSchema.parse({ content: newContent });

      const { error } = await supabase
        .from("comments")
        .update({ content: validated.content })
        .eq("id", commentId)
        .eq("user_id", user?.id);

      if (error) throw error;

      toast({ title: "Comment updated" });
      if (selectedPost) fetchComments(selectedPost.id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error instanceof z.ZodError ? error.errors[0].message : "Failed to update comment",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", user?.id);

      if (error) throw error;

      toast({ title: "Comment deleted" });
      if (selectedPost) fetchComments(selectedPost.id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive",
      });
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

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="fixed top-0 left-0 right-0 z-[60]">
          <AnnouncementBar onVisibilityChange={handleAnnouncementVisibility} />
        </div>
        <Header announcementVisible={showAnnouncement} />
        <div className={`container mx-auto px-4 text-center ${showAnnouncement ? 'pt-32' : 'pt-24'}`}>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="fixed top-0 left-0 right-0 z-[60]">
          <AnnouncementBar onVisibilityChange={handleAnnouncementVisibility} />
        </div>
        <Header announcementVisible={showAnnouncement} />
        <div className={`container mx-auto px-4 text-center ${showAnnouncement ? 'pt-32' : 'pt-24'}`}>
          <h1 className="text-2xl font-bold mb-4">Course not found</h1>
          {isPreviewMode && !canPreview && (
            <p className="text-muted-foreground mb-4">You don't have permission to preview this content.</p>
          )}
          <Link to="/">
            <Button className="bg-primary hover:bg-primary/90">Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead 
        title={`${course.name} - Course`}
        description={course.description || `Explore ${course.name} courses and lessons. Join ${courseStats.enrollmentCount.toLocaleString()} learners in this comprehensive learning path.`}
        keywords={`${course.name}, course, learning, tutorial, lessons`}
        ogTitle={`${course.name} Course`}
        ogDescription={course.description || `Learn ${course.name} with our comprehensive course materials`}
      />
      
      {/* Preview Mode Banner */}
      {isPreviewMode && canPreview && (
        <div className="fixed top-0 left-0 right-0 z-[70] bg-amber-500 text-amber-950 py-2 px-4">
          <div className="container mx-auto flex items-center justify-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4" />
            <span>Preview Mode - This content is not published yet</span>
          </div>
        </div>
      )}
      
      <div className={`fixed ${isPreviewMode && canPreview ? 'top-10' : 'top-0'} left-0 right-0 z-[60]`}>
        <AnnouncementBar onVisibilityChange={handleAnnouncementVisibility} />
      </div>
      <Header announcementVisible={showAnnouncement} />

      {/* 3-Column Layout */}
      <div className={`w-full ${isPreviewMode && canPreview ? (showAnnouncement ? 'pt-[10.5rem]' : 'pt-[8.5rem]') : (showAnnouncement ? 'pt-32' : 'pt-24')}`}>
        <div className="flex flex-col lg:flex-row gap-0">
          
          {/* LEFT SIDEBAR - Course Topics/Lessons List */}
          <aside className="lg:w-64 bg-green-50 border-r border-green-100 flex-shrink-0">
            <div className={`sticky ${isPreviewMode && canPreview ? (showAnnouncement ? 'top-[10.5rem]' : 'top-[8.5rem]') : (showAnnouncement ? 'top-32' : 'top-24')}`}>
              <div className="px-6 py-4 border-b border-green-100 bg-green-100/50">
                <div 
                  className="flex items-center justify-center gap-2 cursor-pointer hover:text-green-700 transition-colors"
                  onClick={() => setSelectedPost(null)}
                >
                  <BookOpen className="h-5 w-5 text-green-700" />
                  <h2 className="font-semibold text-lg text-green-900">Course Lessons</h2>
                </div>
                {user && progress.totalLessons > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-green-700 mb-1">
                      <span>{progress.viewedLessons}/{progress.totalLessons} lessons</span>
                      <span>{progress.percentage}%</span>
                    </div>
                    <Progress value={progress.percentage} className="h-1.5 bg-green-200 [&>div]:bg-green-600" />
                  </div>
                )}
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
                              <div className="ml-4 mt-1 pl-3 border-l-2 border-green-300 space-y-1 animate-accordion-down">
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
                                        {subPost.title}
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
          <main className="flex-1">
            <Card className="border-l border-t border-b border-primary/10 shadow-card rounded-none">
              <CardContent className="pt-8 px-12 pb-12 leading-relaxed">
                {loadingPost ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">Loading lesson...</p>
                  </div>
                ) : selectedPost ? (
                  <>
                    {/* Lesson Header */}
                    <div className="mb-4 pb-2 border-b">
                      <h1 className="text-4xl font-bold mb-1">{selectedPost.title}</h1>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Last updated: {new Date(selectedPost.updated_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ShareTooltip
                            title={selectedPost?.title || course?.name || ""}
                            url={window.location.href}
                            postId={selectedPost?.id}
                          >
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 hover:bg-transparent"
                            >
                              <Share2 className="h-5 w-5 text-foreground" />
                            </Button>
                          </ShareTooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 hover:bg-transparent"
                                onClick={() => setCommentDialogOpen(true)}
                              >
                                <MessageSquare className="h-5 w-5 text-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{comments.length} {comments.length === 1 ? 'comment' : 'comments'}</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 hover:bg-transparent"
                                onClick={() => toggleBookmark(undefined, selectedPost?.id)}
                              >
                                {isBookmarked(undefined, selectedPost?.id) ? (
                                  <BookmarkCheck className="h-5 w-5 text-primary fill-primary" />
                                ) : (
                                  <Bookmark className="h-5 w-5 text-foreground" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{isBookmarked(undefined, selectedPost?.id) ? 'Remove bookmark' : 'Add bookmark'}</p>
                            </TooltipContent>
                          </Tooltip>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 hover:bg-transparent"
                              >
                                <MoreVertical className="h-5 w-5 text-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={handleLikeToggle}
                                disabled={likingPost}
                              >
                                <ThumbsUp className={`mr-2 h-4 w-4 ${hasLiked ? 'fill-current' : ''}`} />
                                <span>{hasLiked ? 'Unlike' : 'Like'} ({likeCount})</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Flag className="mr-2 h-4 w-4" />
                                <span>Report</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Suggest Changes</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
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

                    {/* Lesson Content */}
                    <ContentRenderer 
                      htmlContent={selectedPost.content || ''}
                      courseType={course?.slug?.toLowerCase()}
                      codeTheme={selectedPost.code_theme || undefined}
                    />

                    {/* Mark as Complete Button */}
                    {user && selectedPost && (
                      <div className="mt-8 flex justify-center">
                        <Button
                          variant={isLessonCompleted(selectedPost.id) ? "outline" : "default"}
                          size="lg"
                          className={`gap-2 ${isLessonCompleted(selectedPost.id) ? 'border-green-500 text-green-600 hover:bg-green-50' : 'bg-green-600 hover:bg-green-700'}`}
                          disabled={markingComplete}
                          onClick={async () => {
                            setMarkingComplete(true);
                            const completed = !isLessonCompleted(selectedPost.id);
                            const success = await markLessonCompleted(selectedPost.id, completed);
                            if (success) {
                              toast({
                                title: completed ? "Lesson completed!" : "Lesson marked as incomplete",
                                description: completed ? "Great job! Keep up the good work." : "You can mark it complete anytime.",
                              });
                            }
                            setMarkingComplete(false);
                          }}
                        >
                          {isLessonCompleted(selectedPost.id) ? (
                            <>
                              <CheckCircle className="h-5 w-5 fill-green-500" />
                              Completed
                            </>
                          ) : (
                            <>
                              <Circle className="h-5 w-5" />
                              Mark as Complete
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    {/* Bottom Line with Tags and Icons */}
                    <div className="mt-8 pt-6 border-t border-border">
                      <div className="flex items-center justify-between">
                        {/* Tags on left */}
                        <div className="flex items-center gap-2 text-base">
                          {allTags.length > 0 && (
                            <>
                              <Tag className="h-5 w-5 text-primary" />
                              <span className="font-medium text-primary">Tags:</span>
                              <div className="flex items-center gap-2">
                                {allTags.map((tag) => (
                                  <Link 
                                    key={tag.id} 
                                    to={`/tag/${tag.slug}`}
                                    className="text-primary font-medium bg-primary/10 px-3 py-1 rounded-full hover:bg-primary/20 transition-colors cursor-pointer"
                                  >
                                    {tag.name}
                                  </Link>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                        
                        {/* Icons on right */}
                        <div className="flex items-center gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 hover:bg-transparent"
                                  onClick={() => setCommentDialogOpen(true)}
                                >
                                  <MessageSquare className="h-5 w-5 text-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{comments.length} {comments.length === 1 ? 'comment' : 'comments'}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          <ShareTooltip 
                            url={`${window.location.origin}/course/${course?.slug}?lesson=${selectedPost.slug}`}
                            title={selectedPost.title}
                            postId={selectedPost.id}
                          />
                          
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 hover:bg-transparent"
                                  onClick={handleLikeToggle}
                                  disabled={likingPost}
                                >
                                  <ThumbsUp className={`h-5 w-5 text-foreground ${hasLiked ? 'fill-current' : ''}`} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{likeCount} {likeCount === 1 ? 'like' : 'likes'}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 hover:bg-transparent"
                                >
                                  <Edit className="h-5 w-5 text-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Suggest Changes</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </div>

                    {/* Lesson Navigation */}
                    <div className="mt-8">
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
                    {/* Course Header - No banner */}
                    <div className="mb-8">
                      <h2 className="text-4xl font-bold mb-4 text-foreground">{course.name}</h2>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-5 w-5" />
                          <span className="text-lg font-semibold">{courseStats.enrollmentCount.toLocaleString()} enrolled</span>
                        </div>
                        {courseStats.averageRating > 0 && (
                          <CourseReviewDialog
                            reviews={courseReviews}
                            averageRating={courseStats.averageRating}
                            reviewCount={courseStats.reviewCount}
                            userReview={courseStats.userReview}
                            isEnrolled={courseStats.isEnrolled}
                            isAuthenticated={!!user}
                            onSubmitReview={submitReview}
                            onDeleteReview={deleteReview}
                          >
                            <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                              <span className="text-lg font-semibold">{courseStats.averageRating.toFixed(1)}</span>
                              <span className="text-sm">({courseStats.reviewCount} reviews)</span>
                            </button>
                          </CourseReviewDialog>
                        )}
                      </div>
                      {/* Enroll/Unenroll Button */}
                      <div className="flex items-center gap-2">
                        {courseStats.isEnrolled ? (
                          <Button
                            variant="outline"
                            onClick={handleUnenroll}
                            disabled={enrolling}
                          >
                            <UserCheck className="h-4 w-4 mr-2" />
                            {enrolling ? "Processing..." : "Enrolled"}
                          </Button>
                        ) : (
                          <Button
                            onClick={handleEnroll}
                            disabled={enrolling}
                            className="bg-primary hover:bg-primary/90"
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            {enrolling ? "Enrolling..." : "Enroll Now"}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => toggleBookmark(course?.id)}
                        >
                          {isBookmarked(course?.id) ? (
                            <>
                              <BookmarkCheck className="h-4 w-4 mr-2 text-primary" />
                              Saved
                            </>
                          ) : (
                            <>
                              <Bookmark className="h-4 w-4 mr-2" />
                              Save Course
                            </>
                          )}
                        </Button>
                        <CourseReviewDialog
                          reviews={courseReviews}
                          averageRating={courseStats.averageRating}
                          reviewCount={courseStats.reviewCount}
                          userReview={courseStats.userReview}
                          isEnrolled={courseStats.isEnrolled}
                          isAuthenticated={!!user}
                          onSubmitReview={submitReview}
                          onDeleteReview={deleteReview}
                        >
                          <Button variant="outline">
                            <Star className="h-4 w-4 mr-2" />
                            {courseStats.userReview ? "Update Review" : "Rate Course"}
                          </Button>
                        </CourseReviewDialog>
                      </div>
                    </div>

                    {/* Course Overview - Default View */}
                    {course.description && (
                      <div className="py-4 mb-8">
                        <div 
                          className="prose prose-lg max-w-none text-foreground leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: course.description }}
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

          {/* RIGHT SIDEBAR - Ads Only */}
          <aside className="lg:w-[300px] flex-shrink-0">
            <div className="sticky top-4 space-y-1">
              {/* SidebarAdTop - Always Google AdSense */}
              <SidebarAdTop 
                googleAdClient={adSettings.googleAdClient}
                googleAdSlot={adSettings.sidebarTopSlot}
              />
              
              {/* SidebarAdMiddle - 3rd party if provided, else Google AdSense */}
              <SidebarAdMiddle 
                googleAdClient={adSettings.googleAdClient}
                googleAdSlot={adSettings.sidebarMiddleSlot}
                thirdPartyAdCode={adSettings.thirdPartySidebarCode || undefined}
              />
              
              {/* SidebarAdBottom - Always Google AdSense */}
              <SidebarAdBottom 
                googleAdClient={adSettings.googleAdClient}
                googleAdSlot={adSettings.sidebarBottomSlot}
              />
            </div>
          </aside>
        </div>
      </div>

      <Footer />

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

      {/* Comment Dialog */}
      {selectedPost && (
        <CommentDialog
          open={commentDialogOpen}
          onOpenChange={setCommentDialogOpen}
          comments={comments}
          user={user}
          newComment={commentContent}
          setNewComment={setCommentContent}
          onSubmitComment={handleCommentSubmit}
          onEditComment={handleEditComment}
          onDeleteComment={handleDeleteComment}
          submitting={submittingComment}
        />
      )}
    </div>
  );
};

export default CourseDetail;
