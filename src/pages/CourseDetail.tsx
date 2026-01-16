import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import CourseStructuredData from "@/components/CourseStructuredData";
import ContentWithCodeCopy from "@/components/ContentWithCodeCopy";
import CourseReviewDialog from "@/components/CourseReviewDialog";
import { Home, ChevronLeft, ChevronRight, ChevronDown, BookOpen, Users, Mail, Tag, Search, ThumbsUp, Share2, MessageSquare, Calendar, MoreVertical, Bookmark, BookmarkCheck, Flag, Edit, Star, UserPlus, UserCheck, CheckCircle, Circle, AlertTriangle, Info, List } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ShareTooltip from "@/components/ShareTooltip";
import CommentDialog from "@/components/CommentDialog";
import ReportSuggestDialog from "@/components/ReportSuggestDialog";
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
  status: string;
}

interface CourseLesson {
  id: string;
  title: string;
  description: string | null;
  lesson_rank: string;
  is_published: boolean;
  course_id: string;
}

interface Post {
  id: string;
  title: string;
  excerpt: string | null;
  slug: string;
  featured_image: string | null;
  published_at: string | null;
  updated_at: string;
  status: string;
  content?: string;
  lesson_id: string | null;
  post_rank: string | null;
  post_type: string | null;
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
  const params = useParams<{ slug: string }>();
  // Guard against any accidental query-string leakage into the route param.
  const slug = decodeURIComponent((params.slug ?? "").split("?")[0]).trim();
  const [searchParams] = useSearchParams();
  const lessonSlug = searchParams.get("lesson");
  const isPreviewMode = searchParams.get("preview") === "true";
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());
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
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [suggestDialogOpen, setSuggestDialogOpen] = useState(false);
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

  // Set preview access based on user role and fetch data
  useEffect(() => {
    if (roleLoading || !slug) return;

    const hasPreviewAccess = isAdmin || isModerator;
    setCanPreview(hasPreviewAccess);
    fetchCourseAndLessons();
    fetchRecentCourses();
    fetchSiteSettings();
    fetchFooterCategories();
  }, [slug, roleLoading, isAdmin, isModerator]);

  // Auto-select lesson from URL query param (supports browser back/forward)
  useEffect(() => {
    if (lessonSlug && posts.length > 0) {
      const postToSelect = posts.find(p => p.slug === lessonSlug);
      if (postToSelect && selectedPost?.slug !== lessonSlug) {
        // Expand the parent lesson
        if (postToSelect.lesson_id) {
          setExpandedLessons(prev => {
            const newSet = new Set(prev);
            newSet.add(postToSelect.lesson_id!);
            return newSet;
          });
        }
        fetchPostContent(postToSelect);
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
        .eq("status", "published")
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
      // Fetch course
      // Regular users only see published courses
      // Admins/moderators in preview mode can see unpublished courses
      const showAllStatuses = isPreviewMode && (isAdmin || isModerator);
      
      let courseQuery = supabase
        .from("courses")
        .select("*")
        .eq("slug", slug);

      // Filter to only published courses for regular users
      if (!showAllStatuses) {
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

      // Fetch lessons from course_lessons table, ordered by lesson_rank
      const { data: lessonsData, error: lessonsError } = await supabase
        .from("course_lessons")
        .select("id, title, description, lesson_rank, is_published, course_id")
        .eq("course_id", courseData.id)
        .is("deleted_at", null)
        .order("lesson_rank", { ascending: true });

      if (lessonsError) throw lessonsError;
      
      // Type the lessons data properly using unknown first
      const typedLessons = (lessonsData || []) as unknown as CourseLesson[];
      setLessons(typedLessons);

      // Auto-expand first lesson if there are lessons
      if (typedLessons.length > 0) {
        setExpandedLessons(new Set([typedLessons[0].id]));
      }

      // Fetch posts in this course, ordered by post_rank
      // Regular users only see published posts
      // Admins/moderators in preview mode can see all posts
      
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
          lesson_id,
          post_rank,
          post_type,
          status,
          profiles:author_id (full_name)
        `)
        .eq("category_id", courseData.id)
        .order("post_rank", { ascending: true });

      // Filter to only published posts for regular users
      if (!showAllStatuses) {
        postsQuery = postsQuery.eq("status", "published");
      }

      const { data: postsData, error: postsError } = await postsQuery;

      if (postsError) throw postsError;
      
      // Cast to Post[] with proper typing
      let typedPosts = (postsData || []).map(p => ({
        ...p,
        lesson_id: p.lesson_id as string | null,
        post_rank: p.post_rank as string | null,
        post_type: p.post_type as string | null,
        profiles: p.profiles as { full_name: string | null }
      })) as Post[];
      
      // For regular users, filter out posts whose parent lesson is unpublished
      if (!showAllStatuses) {
        const publishedLessonIds = new Set(
          (lessonsData || [])
            .filter(lesson => lesson.is_published === true)
            .map(lesson => lesson.id)
        );
        typedPosts = typedPosts.filter(post => 
          post.lesson_id === null || publishedLessonIds.has(post.lesson_id)
        );
      }
      
      setPosts(typedPosts);
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
        .eq("status", "published")
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
        .select(
          `
          *,
          profiles:author_id (full_name, avatar_url)
        `
        )
        .eq("id", post.id)
        .single();

      if (error) throw error;

      // For draft content, admins/moderators often work via versions without syncing to posts.content.
      // In preview mode (or when viewing a non-published lesson with preview access), prefer the latest version content.
      const shouldUseLatestVersion = canPreview;

      let hydratedPost: any = data;

      if (shouldUseLatestVersion) {
        const { data: latestVersion, error: versionError } = await supabase
          .from("post_versions")
          .select("content, version_number, status")
          .eq("post_id", post.id)
          .order("version_number", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!versionError && latestVersion?.content) {
          console.debug(`[CourseDetail] Using latest version (v${latestVersion.version_number}) content for post ${post.id}`);
          hydratedPost = { ...hydratedPost, content: latestVersion.content };
        }
      }

      setSelectedPost(hydratedPost);
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
    // Helper to update URL with lesson slug (adds to browser history)
    const updateUrlWithLesson = (lessonSlug: string) => {
      navigate(`/course/${slug}?lesson=${lessonSlug}`);
    };
    
    // Expand the lesson containing this post
    if (post.lesson_id) {
      setExpandedLessons(prev => {
        const newSet = new Set(prev);
        newSet.add(post.lesson_id!);
        return newSet;
      });
    }
    
    fetchPostContent(post);
    updateUrlWithLesson(post.slug);
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

  // Build ordered lesson list - now using lessons and posts with lexicographic ranking
  const getOrderedPosts = () => {
    return [...posts].sort((a, b) => {
      const rankA = a.post_rank || 'zzz';
      const rankB = b.post_rank || 'zzz';
      return rankA.localeCompare(rankB);
    });
  };

  // Get posts for a specific lesson, ordered by post_rank
  const getPostsForLesson = (lessonId: string) => {
    return posts
      .filter(p => p.lesson_id === lessonId)
      .sort((a, b) => {
        const rankA = a.post_rank || 'zzz';
        const rankB = b.post_rank || 'zzz';
        return rankA.localeCompare(rankB);
      });
  };

  // Get all posts in order for navigation (flattened from lessons)
  const getAllOrderedPosts = () => {
    const result: Post[] = [];
    lessons.forEach(lesson => {
      const lessonPosts = getPostsForLesson(lesson.id);
      result.push(...lessonPosts);
    });
    return result;
  };

  const orderedPosts = getAllOrderedPosts();
  const currentOrderedIndex = selectedPost 
    ? orderedPosts.findIndex(p => p.id === selectedPost.id)
    : -1;
    
  const hasPrevious = currentOrderedIndex > 0;
  const hasNext = currentOrderedIndex < orderedPosts.length - 1 && currentOrderedIndex !== -1;

  const handlePrevious = () => {
    if (hasPrevious) {
      const prevPost = orderedPosts[currentOrderedIndex - 1];
      handleLessonClick(prevPost);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      const nextPost = orderedPosts[currentOrderedIndex + 1];
      handleLessonClick(nextPost);
    }
  };

  // Toggle lesson expansion
  const toggleLessonExpansion = (lessonId: string) => {
    setExpandedLessons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(lessonId)) {
        newSet.delete(lessonId);
      } else {
        newSet.add(lessonId);
      }
      return newSet;
    });
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
      <CourseStructuredData
        course={course}
        lessons={posts.map((p) => ({ id: p.id, title: p.title, slug: p.slug }))}
        stats={{
          enrollmentCount: courseStats.enrollmentCount,
          averageRating: courseStats.averageRating,
          reviewCount: courseStats.reviewCount,
        }}
        siteUrl={siteSettings?.site_url}
      />
      
      {/* Preview Mode Banner - Only show for unpublished content */}
      {isPreviewMode && canPreview && course?.status !== 'published' && (
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
                {progress.totalLessons > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-green-700 mb-1">
                      <span>{progress.publishedLessons}/{progress.totalLessons} lessons</span>
                      <span>{Math.min(100, progress.percentage)}%</span>
                    </div>
                    <Progress value={Math.min(100, progress.percentage)} className="h-1.5 bg-green-200 [&>div]:bg-green-600" />
                  </div>
                )}
              </div>
              
              <ScrollArea className="h-[calc(100vh-200px)]">
                <nav className="p-2">
                  {lessons.length > 0 ? (
                    lessons.map((lesson, lessonIndex) => {
                      const lessonPosts = getPostsForLesson(lesson.id);
                      const isExpanded = expandedLessons.has(lesson.id);
                      const hasActivePost = lessonPosts.some(p => p.id === selectedPost?.id);
                      
                      return (
                        <div key={lesson.id} className="mb-1">
                          {/* Lesson Header (Parent) */}
                          <div
                            onClick={() => toggleLessonExpansion(lesson.id)}
                            className={`rounded-lg cursor-pointer transition-all duration-300 ${
                              hasActivePost
                                ? 'bg-green-100 border border-green-300' 
                                : 'hover:bg-green-100'
                            }`}
                          >
                            <div className="px-3 py-2.5 flex items-center justify-between">
                              <div className="flex items-center flex-1">
                                <h3 className="text-sm font-medium text-green-900">
                                  {lesson.title}
                                </h3>
                              </div>
                              <ChevronDown 
                                className={`h-4 w-4 text-green-600 transition-transform duration-200 ${
                                  isExpanded ? 'rotate-180' : ''
                                }`} 
                              />
                            </div>
                          </div>
                          
                          {/* Posts (Children) - Dropdown */}
                          {isExpanded && lessonPosts.length > 0 && (
                            <div className="ml-3 mt-1 border-l-2 border-green-200 pl-2">
                              {lessonPosts.map((post) => {
                                const isActive = selectedPost?.id === post.id;
                                
                                return (
                                  <div
                                    key={post.id}
                                    onClick={() => handleLessonClick(post)}
                                    className={`rounded-lg cursor-pointer transition-all duration-300 mb-1 ${
                                      isActive
                                        ? 'bg-green-600 shadow-md' 
                                        : 'hover:bg-green-100'
                                    }`}
                                  >
                                    <div className="px-3 py-2 flex items-center gap-2">
                                      <h4 
                                        className={`text-sm flex-1 transition-colors ${
                                          isActive
                                            ? 'text-white font-medium' 
                                            : 'text-green-800'
                                        }`}
                                      >
                                        {post.title}
                                      </h4>
                                      {post.post_type && post.post_type !== 'content' && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                          isActive 
                                            ? 'bg-white/20 text-white' 
                                            : 'bg-green-200 text-green-700'
                                        }`}>
                                          {post.post_type}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          
                          {/* Empty lesson message */}
                          {isExpanded && lessonPosts.length === 0 && (
                            <div className="ml-3 mt-1 border-l-2 border-green-200 pl-2">
                              <p className="text-xs text-green-500 py-2 px-3">No posts yet</p>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-green-700 p-4">No lessons available yet</p>
                  )}
                </nav>
              </ScrollArea>
            </div>
          </aside>

          {/* MAIN CONTENT - Lesson Content */}
          <main className="flex-1 min-w-0">
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
                              <DropdownMenuItem onClick={() => setReportDialogOpen(true)}>
                                <Flag className="mr-2 h-4 w-4" />
                                <span>Report</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setSuggestDialogOpen(true)}>
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
                                  onClick={() => setSuggestDialogOpen(true)}
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

                    {/* Report/Suggest Dialogs */}
                    {selectedPost && (
                      <>
                        <ReportSuggestDialog
                          open={reportDialogOpen}
                          onOpenChange={setReportDialogOpen}
                          contentType="post"
                          contentId={selectedPost.id}
                          contentTitle={selectedPost.title}
                          type="report"
                        />
                        <ReportSuggestDialog
                          open={suggestDialogOpen}
                          onOpenChange={setSuggestDialogOpen}
                          contentType="post"
                          contentId={selectedPost.id}
                          contentTitle={selectedPost.title}
                          type="suggestion"
                        />
                      </>
                    )}

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
                              <div className="font-semibold truncate max-w-[200px]">{orderedPosts[currentOrderedIndex - 1]?.title}</div>
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
                              <div className="font-semibold truncate max-w-[200px]">{orderedPosts[currentOrderedIndex + 1]?.title}</div>
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
                  <Tabs defaultValue="details" className="w-full">
                    <TabsList className="mb-6">
                      <TabsTrigger value="details" className="gap-2">
                        <Info className="h-4 w-4" />
                        Course Details
                      </TabsTrigger>
                      <TabsTrigger value="lessons" className="gap-2">
                        <List className="h-4 w-4" />
                        Lessons ({lessons.length})
                      </TabsTrigger>
                    </TabsList>

                    {/* Course Details Tab */}
                    <TabsContent value="details">
                      {/* Course Header */}
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

                      {/* Course Slug */}
                      <div className="mb-6 p-4 bg-muted/30 rounded-lg border">
                        <p className="text-sm text-muted-foreground mb-1">Course URL</p>
                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                          /course/{course.slug}
                        </code>
                      </div>

                      {/* Course Description */}
                      {course.description && (
                        <div className="py-4 mb-8">
                          <h3 className="text-xl font-semibold mb-4">Description</h3>
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
                            Select a lesson from the sidebar or go to the Lessons tab to begin!
                          </p>
                          <Button 
                            className="bg-primary hover:bg-primary/90 shadow-md w-full sm:w-auto"
                            onClick={() => handleLessonClick(posts[0])}
                          >
                            Start First Lesson
                          </Button>
                        </div>
                      )}
                    </TabsContent>

                    {/* Lessons Tab */}
                    <TabsContent value="lessons">
                      <div className="mb-6">
                        <h3 className="text-2xl font-bold mb-2">Course Lessons</h3>
                        <p className="text-muted-foreground">
                          {lessons.length} lessons • {posts.length} posts
                        </p>
                      </div>

                      {lessons.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No lessons available yet</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {lessons.map((lesson, lessonIndex) => {
                            const lessonPosts = getPostsForLesson(lesson.id);
                            
                            return (
                              <div key={lesson.id} className="border rounded-lg overflow-hidden">
                                <div className="bg-muted/30 px-4 py-3 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="text-xs">
                                      #{lessonIndex + 1}
                                    </Badge>
                                    <h4 className="font-semibold">{lesson.title}</h4>
                                    {!lesson.is_published && (
                                      <Badge variant="secondary" className="text-xs">Draft</Badge>
                                    )}
                                  </div>
                                  <span className="text-sm text-muted-foreground">
                                    {lessonPosts.length} post{lessonPosts.length !== 1 ? 's' : ''}
                                  </span>
                                </div>
                                {lesson.description && (
                                  <p className="px-4 py-2 text-sm text-muted-foreground border-t bg-background">
                                    {lesson.description}
                                  </p>
                                )}
                                {lessonPosts.length > 0 && (
                                  <div className="divide-y">
                                    {lessonPosts.map((post) => (
                                      <div 
                                        key={post.id}
                                        className="px-4 py-3 flex items-center justify-between hover:bg-muted/20 cursor-pointer transition-colors"
                                        onClick={() => handleLessonClick(post)}
                                      >
                                        <div className="flex items-center gap-3">
                                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                                          <span className="text-sm">{post.title}</span>
                                          {post.post_type && post.post_type !== 'content' && (
                                            <Badge variant="secondary" className="text-[10px]">
                                              {post.post_type}
                                            </Badge>
                                          )}
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </main>

          {/* RIGHT SIDEBAR - Ads Only */}
          <aside className="w-full lg:w-[300px] lg:min-w-[300px] lg:flex-none flex-shrink-0">
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
