/**
 * Career Course Detail Page
 * 
 * ARCHITECTURAL CONTRACT:
 * - This component is HEADER-AGNOSTIC
 * - It does NOT import or render ANY header
 * - It does NOT check career_id vs active career
 * - It ONLY renders course content
 * 
 * The header is owned by CareerBoardLayout (parent).
 * All career context is inherited from CareerBoardContext.
 * 
 * FEATURE PARITY with CourseDetail (minus ads/nudges):
 * - Full tabs: Details, Lessons, Notes, Certificate
 * - Comments, Likes, Bookmarks, Sharing
 * - Reviews, Reports, Suggestions
 * - LessonFooter with all actions
 * - Course metadata, prerequisites, creator/team info
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useSearchParams, useOutletContext, useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CodeEditProvider } from "@/contexts/CodeEditContext";
import { useCourseStats } from "@/hooks/useCourseStats";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useCourseProgress } from "@/hooks/useCourseProgress";
import { useLessonTimeTracking } from "@/hooks/useLessonTimeTracking";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserState } from "@/hooks/useUserState";
import { useCareerBoard } from "@/contexts/CareerBoardContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNotesTabOpener } from "@/hooks/useNotesTabManager";
import SEOHead from "@/components/SEOHead";
import CourseStructuredData from "@/components/CourseStructuredData";
import ContentRenderer from "@/components/ContentRenderer";
import CourseReviewDialog from "@/components/CourseReviewDialog";
import { ReviewPreviewCard } from "@/components/course-completed";
import ShareTooltip from "@/components/ShareTooltip";
import CommentDialog from "@/components/CommentDialog";
import ReportSuggestDialog from "@/components/ReportSuggestDialog";
import CourseMetadataSidebar from "@/components/course/CourseMetadataSidebar";
import LessonFooter from "@/components/course/LessonFooter";
import { LearningCockpit } from "@/components/course/LearningCockpit";
import { CourseSidebar } from "@/components/course/CourseSidebar";
import LessonShareMenu from "@/components/LessonShareMenu";
import { cn } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitize";
import { formatReadingTime, formatTotalReadingTime } from "@/lib/readingTime";
import { z } from "zod";
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
  ChevronLeft, 
  ChevronRight, 
  BookOpen, 
  Users, 
  Tag, 
  ThumbsUp, 
  Share2, 
  MessageSquare, 
  Calendar, 
  MoreVertical, 
  Bookmark, 
  BookmarkCheck, 
  Flag, 
  Edit, 
  Lightbulb, 
  Star, 
  UserPlus, 
  CheckCircle, 
  Circle, 
  AlertTriangle, 
  Info, 
  List,
  StickyNote,
  Award,
  Play,
  Lock,
  RefreshCw,
  Sparkles,
  Target,
  Home,
  Link2,
  Clock,
  Linkedin,
  Copy,
  ExternalLink,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import type { User } from "@supabase/supabase-js";

// Types
interface Course {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  featured_image: string | null;
  status: string;
  level?: string | null;
  learning_hours?: number | null;
  author_id?: string | null;
  created_at?: string;
  updated_at?: string | null;
  prerequisites?: string[] | null;
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

interface OutletContext {
  setCurrentCourseSlug: (slug: string | null) => void;
}

const commentSchema = z.object({
  content: z.string()
    .trim()
    .min(1, { message: "Comment cannot be empty" })
    .max(1000, { message: "Comment must be less than 1000 characters" })
});

/**
 * Loading skeleton for course content
 */
const CourseContentSkeleton = () => (
  <div className="container mx-auto px-4 py-8">
    <div className="max-w-4xl mx-auto space-y-6">
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </div>
  </div>
);

const CareerCourseDetail = () => {
  const params = useParams<{ courseSlug: string }>();
  const courseSlug = decodeURIComponent((params.courseSlug ?? "").split("?")[0]).trim();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const lessonSlug = searchParams.get("lesson");
  const tabParam = searchParams.get("tab");
  const isPreviewMode = searchParams.get("preview") === "true";
  
  // Get the outlet context to update current course in parent layout
  const { setCurrentCourseSlug } = useOutletContext<OutletContext>();
  
  // Career Board context - no need for career checks, we're guaranteed to be in career flow
  const { career, careerCourses } = useCareerBoard();
  
  // User and role hooks
  const { isAdmin, isModerator, isLoading: roleLoading } = useUserRole();
  const { isPro, isLoading: userStateLoading } = useUserState();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  
  // State
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [loadingPost, setLoadingPost] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [canPreview, setCanPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [defaultTabResolved, setDefaultTabResolved] = useState(false);
  const [restartModalOpen, setRestartModalOpen] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  
  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentContent, setCommentContent] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  
  // Likes state
  const [likeCount, setLikeCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [likingPost, setLikingPost] = useState(false);
  
  // Report/Suggest dialogs
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [suggestDialogOpen, setSuggestDialogOpen] = useState(false);
  
  // Tags, careers, team
  const [allTags, setAllTags] = useState<Array<{id: string; name: string; slug: string}>>([]);
  const [careers, setCareers] = useState<Array<{id: string; name: string; slug: string}>>([]);
  const [courseCreator, setCourseCreator] = useState<{id: string; full_name: string | null; avatar_url: string | null; role: string} | null>(null);
  const [maintenanceTeam, setMaintenanceTeam] = useState<Array<{id: string; full_name: string | null; avatar_url: string | null; role: string}>>([]);
  const [linkedPrerequisites, setLinkedPrerequisites] = useState<Array<{
    id: string;
    prerequisite_course_id: string | null;
    prerequisite_text: string | null;
    linkedCourse?: { id: string; name: string; slug: string } | null;
    isCompleted?: boolean;
    progressPercentage?: number;
  }>>([]);
  
  // Share state
  const [shareOpenPostId, setShareOpenPostId] = useState<string | null>(null);
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  
  // Course stats and progress
  const {
    stats: courseStats,
    reviews: courseReviews,
    loading: courseStatsLoading,
    enrolling,
    enroll,
    unenroll,
    submitReview,
    deleteReview,
  } = useCourseStats(course?.id, user);
  const { progress, markLessonViewed, markLessonCompleted, isLessonCompleted, refetch: refetchProgress } = useCourseProgress(course?.id);
  const [markingComplete, setMarkingComplete] = useState(false);
  
  // Time tracking
  useLessonTimeTracking({ lessonId: selectedPost?.id, courseId: course?.id });
  
  // Notes tab opener
  const { openNotesTab } = useNotesTabOpener(course?.id);

  // Register current course slug with parent layout
  useEffect(() => {
    setCurrentCourseSlug(courseSlug);
    return () => setCurrentCourseSlug(null);
  }, [courseSlug, setCurrentCourseSlug]);

  // Course progress calculations
  const courseProgress = useMemo(() => {
    const completedCount = progress.completedLessons;
    const totalCount = posts.length;
    const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const hasStarted = completedCount > 0;
    const isCompleted = completedCount === totalCount && totalCount > 0;
    return { completedCount, totalCount, percentage, hasStarted, isCompleted };
  }, [progress.completedLessons, posts.length]);

  // Auth setup
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch course data
  useEffect(() => {
    if (roleLoading || !courseSlug) return;
    
    const hasPreviewAccess = isAdmin || isModerator;
    setCanPreview(hasPreviewAccess);
    fetchCourseAndLessons();
  }, [courseSlug, roleLoading, isAdmin, isModerator]);

  // Handle lesson selection from URL
  useEffect(() => {
    if (lessonSlug && posts.length > 0) {
      const postToSelect = posts.find((p) => p.slug === lessonSlug);
      if (postToSelect && selectedPost?.slug !== lessonSlug) {
        if (postToSelect.lesson_id) {
          setExpandedLessons((prev) => {
            const newSet = new Set(prev);
            newSet.add(postToSelect.lesson_id!);
            return newSet;
          });
        }
        fetchPostContent(postToSelect);
        window.scrollTo({ top: 0, behavior: "auto" });
      }
    }
  }, [lessonSlug, posts, selectedPost?.slug]);

  // Fetch comments and tags when post changes
  useEffect(() => {
    if (selectedPost) {
      fetchComments(selectedPost.id);
      fetchTags(selectedPost.id);
      
      const channel = supabase
        .channel(`comments-${selectedPost.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${selectedPost.id}`
        }, () => {
          fetchComments(selectedPost.id);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setComments([]);
      setAllTags([]);
    }
  }, [selectedPost]);

  // Fetch careers and team when course changes
  useEffect(() => {
    if (course?.id) {
      fetchCareers();
      fetchCourseTeam();
      fetchLinkedPrerequisites();
    }
  }, [course?.id, user?.id]);

  /**
   * ROLE-AWARE, PROGRESS-AWARE DEFAULT TAB SELECTION
   */
  useEffect(() => {
    if (defaultTabResolved) return;
    if (loading || roleLoading || userStateLoading || courseStatsLoading) return;
    
    const postsLoaded = posts.length > 0;

    // Priority 1: If a lesson is already selected via URL, go to lessons tab
    if (lessonSlug) {
      setActiveTab("lessons");
      setDefaultTabResolved(true);
      return;
    }

    // Priority 2: If tab is specified in URL, use it
    if (tabParam && ["details", "lessons", "notes", "certificate"].includes(tabParam)) {
      if (tabParam === "certificate") {
        if (!postsLoaded) return;
        const certificateTabAvailable = isPro && courseStats.isEnrolled && courseProgress.isCompleted;
        if (!certificateTabAvailable) {
          setActiveTab("lessons");
          setDefaultTabResolved(true);
          return;
        }
      }
      setActiveTab(tabParam);
      setDefaultTabResolved(true);
      return;
    }

    // Priority 3: Admin / Moderator → ALWAYS Course Details
    if (isAdmin || isModerator) {
      setActiveTab("details");
      setDefaultTabResolved(true);
      return;
    }

    // For learner progress-based selection, we MUST wait for posts to be loaded
    if (!postsLoaded) {
      if (!activeTab) {
        setActiveTab("details");
      }
      return;
    }

    // Priority 4: LEARNER progress-based tab selection
    const progressPercentage = courseProgress.percentage;

    // 100% completion → Certificate tab
    if (progressPercentage === 100 && courseProgress.isCompleted) {
      if (isPro && courseStats.isEnrolled) {
        setActiveTab("certificate");
        setDefaultTabResolved(true);
        return;
      }
      setActiveTab("lessons");
      setDefaultTabResolved(true);
      return;
    }

    // 1-99% progress → Lessons tab
    if (progressPercentage > 0 && progressPercentage < 100) {
      setActiveTab("lessons");
      setDefaultTabResolved(true);
      return;
    }

    // 0% progress → Course Details tab
    setActiveTab("details");
    setDefaultTabResolved(true);
  }, [
    defaultTabResolved, loading, roleLoading, userStateLoading, courseStatsLoading,
    isAdmin, isModerator, lessonSlug, tabParam, courseStats.isEnrolled,
    courseProgress.hasStarted, courseProgress.isCompleted, courseProgress.percentage,
    isPro, posts.length, activeTab,
  ]);

  // ========== FETCH FUNCTIONS ==========

  const fetchCourseAndLessons = async () => {
    try {
      setLoading(true);
      const showAllStatuses = isPreviewMode && (isAdmin || isModerator);
      
      let courseQuery = supabase
        .from("courses")
        .select("*")
        .eq("slug", courseSlug);

      if (!showAllStatuses) {
        courseQuery = courseQuery.eq("status", "published");
      }

      const { data: courseData, error: courseError } = await courseQuery.single();

      if (courseError) {
        if (courseError.code === 'PGRST116') {
          navigate("/arcade", { replace: true });
          return;
        }
        throw courseError;
      }
      
      setCourse(courseData);

      // Fetch lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from("course_lessons")
        .select("id, title, description, lesson_rank, is_published, course_id")
        .eq("course_id", courseData.id)
        .is("deleted_at", null)
        .order("lesson_rank", { ascending: true });

      if (lessonsError) throw lessonsError;
      
      const typedLessons = (lessonsData || []) as unknown as CourseLesson[];
      setLessons(typedLessons);

      if (typedLessons.length > 0) {
        setExpandedLessons(new Set([typedLessons[0].id]));
      }

      // Fetch posts
      let postsQuery = supabase
        .from("posts")
        .select("id, title, excerpt, slug, featured_image, published_at, updated_at, status, lesson_id, post_rank, post_type, code_theme, profiles:author_id(full_name)")
        .eq("category_id", courseData.id)
        .is("deleted_at", null)
        .order("post_rank", { ascending: true });

      if (!showAllStatuses) {
        postsQuery = postsQuery.eq("status", "published");
      }

      const { data: postsData, error: postsError } = await postsQuery;

      if (postsError) throw postsError;
      
      let typedPosts = (postsData || []).map(p => ({
        ...p,
        lesson_id: p.lesson_id as string | null,
        post_rank: p.post_rank as string | null,
        post_type: p.post_type as string | null,
        profiles: p.profiles as { full_name: string | null }
      })) as Post[];
      
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

  const fetchPostContent = async (post: Post) => {
    setLoadingPost(true);
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(`*, profiles:author_id (full_name, avatar_url)`)
        .eq("id", post.id)
        .single();

      if (error) throw error;

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
          hydratedPost = { ...hydratedPost, content: latestVersion.content };
        }
      }

      setSelectedPost(hydratedPost);
      await fetchLikeData(post.id);

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

  const fetchComments = async (postId: string) => {
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from("comments")
        .select(`id, content, created_at, user_id, status, is_anonymous, display_name, parent_id, profiles:user_id (full_name, avatar_url)`)
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

  const fetchCareers = async () => {
    if (!course?.id) return;
    try {
      const { data, error } = await supabase
        .from("career_courses")
        .select("careers(id, name, slug)")
        .eq("course_id", course.id)
        .is("deleted_at", null);

      if (error) throw error;
      const mappedCareers = data?.map(item => (item.careers as any)).filter(Boolean) || [];
      setCareers(mappedCareers);
    } catch (error) {
      console.error("Error fetching careers:", error);
    }
  };

  const fetchCourseTeam = async () => {
    if (!course?.id) return;
    try {
      if (course.author_id) {
        const { data: authorData } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .eq("id", course.author_id)
          .single();

        if (authorData) {
          setCourseCreator({
            id: authorData.id,
            full_name: authorData.full_name,
            avatar_url: authorData.avatar_url,
            role: "creator",
          });
        }
      }

      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("course_assignments")
        .select("user_id, role, profiles:user_id(id, full_name, avatar_url)")
        .eq("course_id", course.id);

      if (assignmentsError) throw assignmentsError;

      if (assignmentsData) {
        const team = assignmentsData
          .filter(a => a.profiles)
          .map(a => ({
            id: (a.profiles as any).id,
            full_name: (a.profiles as any).full_name,
            avatar_url: (a.profiles as any).avatar_url,
            role: a.role,
          }));
        setMaintenanceTeam(team);
      }
    } catch (error) {
      console.error("Error fetching course team:", error);
    }
  };

  const fetchLinkedPrerequisites = async () => {
    if (!course?.id) return;
    try {
      const { data, error } = await supabase
        .from("course_prerequisites")
        .select("id, prerequisite_course_id, prerequisite_text, display_order")
        .eq("course_id", course.id)
        .order("display_order");

      if (error) throw error;

      const courseIds = (data || [])
        .filter(p => p.prerequisite_course_id)
        .map(p => p.prerequisite_course_id) as string[];

      let coursesMap: Record<string, { id: string; name: string; slug: string }> = {};
      let completionMap: Record<string, { isCompleted: boolean; progressPercentage: number }> = {};
      
      if (courseIds.length > 0) {
        const { data: courses, error: coursesError } = await supabase
          .from("courses")
          .select("id, name, slug")
          .in("id", courseIds);

        if (!coursesError && courses) {
          coursesMap = Object.fromEntries(courses.map(c => [c.id, c]));
        }

        if (user) {
          const completionPromises = courseIds.map(async (prereqCourseId) => {
            const { count: totalLessons } = await supabase
              .from("posts")
              .select("*", { count: "exact", head: true })
              .eq("category_id", prereqCourseId)
              .eq("status", "published")
              .is("deleted_at", null);

            const { count: completedLessons } = await supabase
              .from("lesson_progress")
              .select("*", { count: "exact", head: true })
              .eq("user_id", user.id)
              .eq("course_id", prereqCourseId)
              .eq("completed", true);

            const total = totalLessons || 0;
            const completed = completedLessons || 0;
            const progressPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;
            const isCompleted = total > 0 && completed >= total;

            return { courseId: prereqCourseId, isCompleted, progressPercentage };
          });

          const completionResults = await Promise.all(completionPromises);
          completionMap = Object.fromEntries(
            completionResults.map(r => [r.courseId, { isCompleted: r.isCompleted, progressPercentage: r.progressPercentage }])
          );
        }
      }

      const enrichedPrereqs = (data || []).map(p => {
        const completion = p.prerequisite_course_id ? completionMap[p.prerequisite_course_id] : undefined;
        return {
          id: p.id,
          prerequisite_course_id: p.prerequisite_course_id,
          prerequisite_text: p.prerequisite_text,
          linkedCourse: p.prerequisite_course_id ? coursesMap[p.prerequisite_course_id] || null : null,
          isCompleted: completion?.isCompleted,
          progressPercentage: completion?.progressPercentage,
        };
      });

      setLinkedPrerequisites(enrichedPrereqs);
    } catch (error) {
      console.error("Error fetching prerequisites:", error);
    }
  };

  // ========== ACTION HANDLERS ==========

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

  const handleCommentSubmit = async (e: React.FormEvent, isAnonymous: boolean = false, parentId?: string, content?: string) => {
    e.preventDefault();
    if (!selectedPost) return;

    const commentText = content || commentContent;

    try {
      const validated = commentSchema.parse({ content: commentText });
      setSubmittingComment(true);

      const commentData: any = {
        content: validated.content,
        post_id: selectedPost.id,
        is_anonymous: user ? isAnonymous : true,
        display_name: user && !isAnonymous ? null : "unknown_ant",
        parent_id: parentId || null,
      };

      if (user) {
        commentData.user_id = user.id;
      }

      const { error } = await supabase.from("comments").insert(commentData);
      if (error) throw error;

      toast({ title: "Comment Posted", description: "Your comment has been posted." });

      if (!content) {
        setCommentContent("");
      }
      fetchComments(selectedPost.id);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({ title: "Validation Error", description: error.errors[0].message, variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Failed to submit comment. Please try again.", variant: "destructive" });
      }
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleEditComment = async (commentId: string, newContent: string) => {
    try {
      const validated = commentSchema.parse({ content: newContent });
      const { error } = await supabase.from("comments").update({ content: validated.content }).eq("id", commentId).eq("user_id", user?.id);
      if (error) throw error;
      toast({ title: "Comment updated" });
      if (selectedPost) fetchComments(selectedPost.id);
    } catch (error: any) {
      toast({ title: "Error", description: error instanceof z.ZodError ? error.errors[0].message : "Failed to update comment", variant: "destructive" });
      throw error;
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase.from("comments").delete().eq("id", commentId).eq("user_id", user?.id);
      if (error) throw error;
      toast({ title: "Comment deleted" });
      if (selectedPost) fetchComments(selectedPost.id);
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to delete comment", variant: "destructive" });
    }
  };

  const handleEnroll = async () => {
    if (!user) {
      toast({ title: "Authentication required", description: "Please sign in to enroll in this course.", variant: "destructive" });
      return;
    }
    const success = await enroll();
    if (success) {
      toast({ title: "Successfully enrolled!", description: "You can now access all course materials." });
    }
  };

  const handleRestartCourse = async () => {
    if (!user || !course?.id) {
      setRestartModalOpen(false);
      return;
    }

    try {
      const { error } = await supabase.from('lesson_progress').delete().eq('user_id', user.id).eq('course_id', course.id);
      if (error) throw error;

      refetchProgress();
      toast({ title: "Progress Reset", description: "Your course progress has been reset. Starting from the beginning!" });
      setRestartModalOpen(false);

      const firstPost = orderedPosts[0] ?? posts[0];
      if (firstPost) handleLessonClick(firstPost);
    } catch (error: any) {
      console.error("Error resetting progress:", error);
      toast({ title: "Error", description: "Failed to reset course progress", variant: "destructive" });
      setRestartModalOpen(false);
    }
  };

  // ========== NAVIGATION HELPERS ==========

  const getPostsForLesson = useCallback((lessonId: string) => {
    return posts
      .filter(p => p.lesson_id === lessonId)
      .sort((a, b) => (a.post_rank || 'zzz').localeCompare(b.post_rank || 'zzz'));
  }, [posts]);

  const getAllOrderedPosts = useCallback(() => {
    const result: Post[] = [];
    lessons.forEach(lesson => {
      const lessonPosts = getPostsForLesson(lesson.id);
      result.push(...lessonPosts);
    });
    return result;
  }, [lessons, getPostsForLesson]);

  const orderedPosts = useMemo(() => getAllOrderedPosts(), [getAllOrderedPosts]);

  const currentOrderedIndex = selectedPost 
    ? orderedPosts.findIndex(p => p.id === selectedPost.id)
    : -1;
    
  const hasPrevious = currentOrderedIndex > 0;
  const hasNext = currentOrderedIndex < orderedPosts.length - 1 && currentOrderedIndex !== -1;

  const getLessonProgress = useCallback((lessonId: string) => {
    const lessonPosts = getPostsForLesson(lessonId);
    const completedPosts = lessonPosts.filter(p => isLessonCompleted(p.id)).length;
    const totalPosts = lessonPosts.length;
    const percentage = totalPosts > 0 ? Math.round((completedPosts / totalPosts) * 100) : 0;
    const isComplete = completedPosts === totalPosts && totalPosts > 0;
    return { completedPosts, totalPosts, percentage, isComplete };
  }, [getPostsForLesson, isLessonCompleted]);

  const toggleLessonExpansion = useCallback((lessonId: string) => {
    setExpandedLessons(prev => {
      if (prev.has(lessonId)) {
        return new Set();
      }
      return new Set([lessonId]);
    });
  }, []);

  const handleLessonClick = useCallback((post: Post) => {
    if (post.lesson_id) {
      setExpandedLessons(new Set([post.lesson_id]));
    }
    setActiveTab("lessons");
    setDefaultTabResolved(true);
    fetchPostContent(post);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", "lessons");
    nextParams.set("lesson", post.slug);
    setSearchParams(nextParams);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [searchParams, setSearchParams]);

  const handlePrevious = useCallback(() => {
    if (hasPrevious) {
      const prevPost = orderedPosts[currentOrderedIndex - 1];
      handleLessonClick(prevPost);
    }
  }, [hasPrevious, orderedPosts, currentOrderedIndex, handleLessonClick]);

  const handleNext = useCallback(() => {
    if (hasNext) {
      const nextPost = orderedPosts[currentOrderedIndex + 1];
      handleLessonClick(nextPost);
    }
  }, [hasNext, orderedPosts, currentOrderedIndex, handleLessonClick]);

  const handleTabChange = useCallback((newTab: string) => {
    setActiveTab(newTab);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", newTab);
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleHomeClick = useCallback(() => {
    setSelectedPost(null);
    const desiredTab = courseProgress.percentage > 0 ? "lessons" : "details";
    setActiveTab(desiredTab);
    setDefaultTabResolved(true);

    const nextSearch = new URLSearchParams(searchParams);
    nextSearch.delete("lesson");
    nextSearch.set("tab", desiredTab);
    setSearchParams(nextSearch, { replace: true });
  }, [courseProgress.percentage, searchParams, setSearchParams]);

  const getNextPost = useCallback(() => {
    for (const post of orderedPosts) {
      if (!isLessonCompleted(post.id)) {
        return post;
      }
    }
    return orderedPosts[0];
  }, [orderedPosts, isLessonCompleted]);

  const getPrimaryCTAProps = useCallback(() => {
    if (isAdmin || isModerator) {
      return { label: "Manage Course", icon: Edit, onClick: () => window.open(`/admin/courses/${course?.id}`, '_blank') };
    }
    if (!user) {
      return { label: "Enroll Now", icon: UserPlus, onClick: handleEnroll };
    }
    if (!courseStats.isEnrolled) {
      return { label: "Enroll Now", icon: UserPlus, onClick: handleEnroll };
    }
    if (courseProgress.isCompleted) {
      return { label: "Restart Course", icon: RefreshCw, onClick: () => setRestartModalOpen(true) };
    }
    if (courseProgress.hasStarted) {
      return { label: "Continue Learning", icon: Play, onClick: () => { const next = getNextPost(); if (next) handleLessonClick(next); } };
    }
    return { label: "Start Course", icon: Play, onClick: () => { const firstPost = orderedPosts[0] ?? posts[0]; if (firstPost) handleLessonClick(firstPost); } };
  }, [isAdmin, isModerator, user, courseStats.isEnrolled, courseProgress.isCompleted, courseProgress.hasStarted, course?.id, getNextPost, handleLessonClick, orderedPosts, posts, handleEnroll]);

  const copyUrl = useCallback(async () => {
    const url = `${window.location.origin}/career-board/${career?.slug}/course/${course?.slug}`;
    await navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
    toast({ title: "URL copied!", description: "Course URL copied to clipboard." });
  }, [career?.slug, course?.slug, toast]);

  // ========== RENDER ==========

  if (loading || userStateLoading) {
    return <CourseContentSkeleton />;
  }

  if (!course) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Course not found</h1>
        <p className="text-muted-foreground mb-6">This course doesn't exist or isn't available.</p>
        <Button onClick={() => navigate("/arcade")}>Return to Arcade</Button>
      </div>
    );
  }

  const ctaProps = getPrimaryCTAProps();
  const CtaIcon = ctaProps.icon;
  const isCurrentLessonCompleted = selectedPost ? isLessonCompleted(selectedPost.id) : false;

  return (
    <CodeEditProvider>
      <SEOHead
        title={`${course.name} | Career Learning`}
        description={course.description || `Learn ${course.name} as part of your career path`}
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
      />

      {/* Preview Mode Banner */}
      {isPreviewMode && canPreview && course?.status !== 'published' && (
        <div className="bg-amber-500 text-amber-950 py-2 px-4">
          <div className="container mx-auto flex items-center justify-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4" />
            <span>Preview Mode - This content is not published yet</span>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-0 justify-center">
        {/* LEFT SIDEBAR - Progress & Navigation */}
        <CourseSidebar
          lessons={lessons}
          posts={posts}
          selectedPost={selectedPost}
          expandedLessons={expandedLessons}
          courseProgress={courseProgress}
          isPreviewMode={isPreviewMode && (isAdmin || isModerator)}
          canPreview={canPreview}
          isHeaderVisible={isHeaderVisible}
          showAnnouncement={showAnnouncement}
          isAuthenticated={!!user}
          getPostsForLesson={getPostsForLesson}
          getLessonProgress={getLessonProgress}
          isLessonCompleted={isLessonCompleted}
          toggleLessonExpansion={toggleLessonExpansion}
          handleLessonClick={handleLessonClick}
          handleHomeClick={handleHomeClick}
        />

        {/* MAIN CONTENT */}
        <main className="flex-1 min-w-0 max-w-4xl mx-auto px-4 lg:px-0">
          <Card className="rounded-none border-0 shadow-none">
            <CardContent className="p-6 lg:p-8">
              {loadingPost ? (
                <div className="flex items-center justify-center py-20">
                  <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : selectedPost ? (
                /* LESSON CONTENT VIEW */
                <>
                  {/* Post Header */}
                  <div className="mb-4">
                    <h1 className="text-3xl lg:text-4xl font-bold mb-4 text-foreground">{selectedPost.title}</h1>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Last updated: {new Date(selectedPost.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ShareTooltip title={selectedPost?.title || course?.name || ""} url={window.location.href} postId={selectedPost?.id}>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><Share2 className="h-5 w-5" /></Button>
                        </ShareTooltip>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCommentDialogOpen(true)}>
                                <MessageSquare className="h-5 w-5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>{comments.length} comments</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {/* Bookmark */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleBookmark(undefined, selectedPost?.id)}>
                                {isBookmarked(undefined, selectedPost?.id) ? (
                                  <BookmarkCheck className="h-5 w-5 text-primary fill-primary" />
                                ) : (
                                  <Bookmark className="h-5 w-5" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>{isBookmarked(undefined, selectedPost?.id) ? 'Remove bookmark' : 'Add bookmark'}</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {/* More options menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 data-[state=open]:bg-transparent">
                              <MoreVertical className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleLikeToggle} disabled={likingPost}>
                              <ThumbsUp className={`mr-2 h-4 w-4 ${hasLiked ? 'fill-current' : ''}`} />
                              <span>{hasLiked ? 'Unlike' : 'Like'} ({likeCount})</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setReportDialogOpen(true)}>
                              <Flag className="mr-2 h-4 w-4" />
                              <span>Report</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSuggestDialogOpen(true)}>
                              <Lightbulb className="mr-2 h-4 w-4" />
                              <span>Suggest Changes</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <Separator className="mt-2" />
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

                  {/* Lesson Footer */}
                  <LessonFooter
                    isCompleted={isCurrentLessonCompleted}
                    isMarkingComplete={markingComplete}
                    onMarkComplete={async () => {
                      if (!selectedPost) return;
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
                    canComplete={!!user}
                    isGuest={false}
                    completedLessonsCount={courseProgress.completedCount}
                    totalLessons={orderedPosts.length}
                    courseProgressPercentage={courseProgress.percentage}
                    isCourseComplete={courseProgress.isCompleted}
                    courseId={course?.id || ""}
                    tags={allTags}
                    onCommentClick={() => setCommentDialogOpen(true)}
                    onSuggestChangesClick={isCurrentLessonCompleted ? () => setSuggestDialogOpen(true) : undefined}
                    onLikeClick={handleLikeToggle}
                    likeCount={likeCount}
                    hasLiked={hasLiked}
                    isLiking={likingPost}
                    commentCount={comments.length}
                    shareTitle={selectedPost?.title || course?.name || ""}
                    shareUrl={window.location.href}
                    postId={selectedPost?.id}
                    previousLesson={hasPrevious ? orderedPosts[currentOrderedIndex - 1] : null}
                    nextLesson={hasNext ? orderedPosts[currentOrderedIndex + 1] : null}
                    onPrevious={handlePrevious}
                    onNext={handleNext}
                  />

                  {/* Dialogs */}
                  {selectedPost && (
                    <>
                      <ReportSuggestDialog open={reportDialogOpen} onOpenChange={setReportDialogOpen} contentType="post" contentId={selectedPost.id} contentTitle={selectedPost.title} type="report" />
                      <ReportSuggestDialog open={suggestDialogOpen} onOpenChange={setSuggestDialogOpen} contentType="post" contentId={selectedPost.id} contentTitle={selectedPost.title} type="suggestion" />
                    </>
                  )}
                </>
              ) : (
                /* COURSE OVERVIEW VIEW - Tabs */
                <>
                  <div className="text-center mb-8">
                    <h1 className="text-3xl lg:text-4xl font-bold mb-4 text-foreground">{course.name}</h1>
                    
                    {/* Stats Row */}
                    <div className="flex items-center justify-center gap-4 flex-wrap mb-6">
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
                          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                            <span>{courseStats.averageRating.toFixed(1)}</span>
                            <span className="text-muted-foreground/70">({courseStats.reviewCount})</span>
                          </button>
                        </CourseReviewDialog>
                      )}
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{courseStats.enrollmentCount.toLocaleString()} learners</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <BookOpen className="h-4 w-4" />
                        <span>{posts.length} lessons</span>
                      </div>
                      {course.level && (
                        <Badge variant="secondary">{course.level}</Badge>
                      )}
                    </div>

                    {/* Primary CTA */}
                    <Button 
                      size="lg"
                      onClick={ctaProps.onClick}
                      disabled={posts.length === 0 || enrolling}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg"
                    >
                      <CtaIcon className="h-5 w-5 mr-2" />
                      {enrolling ? "Processing..." : ctaProps.label}
                    </Button>

                    {/* Cheer Label */}
                    {courseStats.isEnrolled && (
                      <p className="mt-3 text-sm text-muted-foreground">
                        {courseProgress.percentage === 0 && "🚀 Ready to begin — let's start building this skill"}
                        {courseProgress.percentage > 0 && courseProgress.percentage < 100 && "💪 You're making great progress — keep going"}
                        {courseProgress.percentage === 100 && "🎉 You've successfully completed this course"}
                      </p>
                    )}
                  </div>

                  {/* Tabs */}
                  <Tabs value={activeTab || "details"} onValueChange={handleTabChange}>
                    <TabsList className="grid w-full grid-cols-3 lg:grid-cols-4">
                      <TabsTrigger value="details">Details</TabsTrigger>
                      <TabsTrigger value="lessons">Lessons</TabsTrigger>
                      {isPro && <TabsTrigger value="certificate">Certificate</TabsTrigger>}
                    </TabsList>

                    {/* Details Tab */}
                    <TabsContent value="details" className="mt-6">
                      {course.description && (
                        <div className="prose prose-lg dark:prose-invert max-w-none mb-8">
                          <h3 className="text-xl font-semibold mb-3">About This Course</h3>
                          <p className="text-muted-foreground">{course.description}</p>
                        </div>
                      )}

                      {/* Review Preview */}
                      {courseStats.reviewCount > 0 && (
                        <div className="mb-8">
                          <ReviewPreviewCard
                            averageRating={courseStats.averageRating}
                            reviews={courseReviews.slice(0, 2)}
                          />
                        </div>
                      )}
                    </TabsContent>

                    {/* Lessons Tab */}
                    <TabsContent value="lessons" className="mt-6">
                      <div className="mb-6">
                        <h3 className="text-xl font-semibold mb-1">Course Curriculum</h3>
                        <p className="text-muted-foreground text-sm">{lessons.length} lessons • {posts.length} posts</p>
                      </div>

                      {lessons.length === 0 ? (
                        <div className="text-center py-16 bg-muted/30 rounded-xl">
                          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                          <p className="text-muted-foreground">No lessons available yet</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {lessons
                            .filter(lesson => (isPreviewMode && (isAdmin || isModerator)) || lesson.is_published)
                            .map((lesson, lessonIndex) => {
                              const lessonPosts = getPostsForLesson(lesson.id);
                              const lessonProgress = getLessonProgress(lesson.id);
                              
                              return (
                                <Card key={lesson.id} className="overflow-hidden hover:shadow-md transition-shadow">
                                  <div className="bg-muted/30 px-4 py-3 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold ${lessonProgress.isComplete ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                        {lessonProgress.isComplete ? <CheckCircle className="h-4 w-4" /> : lessonIndex + 1}
                                      </div>
                                      <div>
                                        <h4 className="font-semibold">{lesson.title}</h4>
                                        {lesson.description && <p className="text-xs text-muted-foreground">{lesson.description}</p>}
                                      </div>
                                      {!lesson.is_published && <Badge variant="secondary" className="text-xs">Draft</Badge>}
                                    </div>
                                    <div className="flex items-center gap-3">
                                      {lessonProgress.totalPosts > 0 && (
                                        <div className="flex items-center gap-2">
                                          <Progress value={lessonProgress.percentage} className="w-16 h-1.5" />
                                          <span className="text-xs text-muted-foreground">{lessonProgress.completedPosts}/{lessonProgress.totalPosts}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {lessonPosts.length > 0 ? (
                                    <div className="divide-y">
                                      {lessonPosts.map((post) => {
                                        const isCompleted = isLessonCompleted(post.id);
                                        return (
                                          <div 
                                            key={post.id}
                                            className="px-4 py-3 flex items-center gap-3 hover:bg-muted/30 cursor-pointer transition-colors"
                                            onClick={() => handleLessonClick(post)}
                                          >
                                            {isCompleted ? (
                                              <CheckCircle className="h-4 w-4 text-primary" />
                                            ) : (
                                              <Circle className="h-4 w-4 text-muted-foreground" />
                                            )}
                                            <span className="text-sm flex-1">{post.title}</span>
                                            <span className="text-xs text-muted-foreground"><Clock className="h-3 w-3 inline mr-1" />~{formatReadingTime(post.content)}</span>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="px-4 py-6 text-center bg-muted/20">
                                      <Lock className="h-5 w-5 mx-auto mb-2 text-muted-foreground/50" />
                                      <p className="text-sm text-muted-foreground">Content coming soon</p>
                                    </div>
                                  )}
                                </Card>
                              );
                          })}
                        </div>
                      )}
                    </TabsContent>

                    {/* Certificate Tab - Pro only */}
                    {isPro && (
                      <TabsContent value="certificate" className="mt-6">
                        {!courseStats.isEnrolled ? (
                          <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-14 h-14 rounded-full bg-muted/80 flex items-center justify-center mb-4">
                              <Award className="h-7 w-7 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Enroll to Unlock Certificate</h3>
                            <p className="text-sm text-muted-foreground max-w-sm">Start this course to track your progress and earn a certificate upon completion.</p>
                          </div>
                        ) : (
                          <div className="space-y-6 relative">
                            {!courseProgress.isCompleted && (
                              <div className="absolute inset-0 z-10 flex items-center justify-center">
                                <div className="absolute inset-0 bg-background/60 backdrop-blur-sm rounded-lg" />
                                <div className="relative z-20 flex flex-col items-center gap-4 text-center p-8 max-w-sm">
                                  <div className="w-14 h-14 rounded-full bg-muted/80 flex items-center justify-center">
                                    <Lock className="h-7 w-7 text-muted-foreground" />
                                  </div>
                                  <div className="w-48">
                                    <Progress value={courseProgress.percentage} className="h-2 bg-muted" />
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {courseProgress.percentage === 0 ? "Start the course to unlock your certificate" : `You're ${courseProgress.percentage}% there — keep going`}
                                  </p>
                                </div>
                              </div>
                            )}
                            
                            <div className={cn("flex flex-col lg:flex-row gap-6 lg:gap-8 items-center", !courseProgress.isCompleted && "pointer-events-none select-none")}>
                              {/* Certificate Preview */}
                              <div className="w-full max-w-md aspect-[1.4/1] rounded-lg border-4 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
                                <div className="absolute inset-3 border-2 border-primary/30 rounded pointer-events-none" />
                                <div className="mb-3"><Award className="h-12 w-12 text-primary" /></div>
                                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Certificate of Completion</p>
                                <p className="text-sm text-muted-foreground mb-1">This is to certify that</p>
                                <p className="text-lg font-bold text-foreground mb-2 line-clamp-1">{user?.user_metadata?.full_name || 'Learner'}</p>
                                <p className="text-xs text-muted-foreground mb-1">has successfully completed</p>
                                <p className="text-sm font-semibold text-primary line-clamp-2 mb-3">{course.name}</p>
                                <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                              </div>

                              {/* Actions */}
                              <div className="flex flex-col gap-4 flex-1">
                                <div>
                                  <h3 className="text-xl font-semibold mb-1">🎉 Your Certificate is Ready!</h3>
                                  <p className="text-sm text-muted-foreground">Congratulations on completing this course! Download your certificate or share your achievement.</p>
                                </div>
                                <div className="flex flex-col gap-3">
                                  <Button onClick={() => navigate(`/course/${course.id}/completed`)} className="w-full sm:w-auto" size="lg" disabled={!courseProgress.isCompleted}>
                                    <Award className="h-4 w-4 mr-2" />
                                    View & Download Certificate
                                  </Button>
                                  <Button variant="outline" onClick={() => { const text = encodeURIComponent(`I just completed "${course.name}"! 🎉`); const url = encodeURIComponent(window.location.href); window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}&summary=${text}`, '_blank', 'width=600,height=400'); }} className="w-full sm:w-auto" size="lg" disabled={!courseProgress.isCompleted}>
                                    <Linkedin className="h-4 w-4 mr-2" />
                                    Share on LinkedIn
                                  </Button>
                                  <Button variant="outline" onClick={() => { navigator.clipboard.writeText(window.location.href); toast({ title: "Link copied!", description: "Share your achievement with others." }); }} className="w-full sm:w-auto" size="lg" disabled={!courseProgress.isCompleted}>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy Link
                                  </Button>
                                  
                                  {!courseStats.userReview && courseProgress.isCompleted && (
                                    <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border">
                                      <p className="text-sm text-muted-foreground mb-3">💬 Your feedback helps improve this course for others</p>
                                      <CourseReviewDialog reviews={courseReviews} averageRating={courseStats.averageRating} reviewCount={courseStats.reviewCount} userReview={courseStats.userReview} isEnrolled={courseStats.isEnrolled} isAuthenticated={!!user} onSubmitReview={submitReview} onDeleteReview={deleteReview}>
                                        <Button variant="outline" size="sm"><Star className="h-4 w-4 mr-2" />Leave a Review</Button>
                                      </CourseReviewDialog>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </TabsContent>
                    )}
                  </Tabs>
                </>
              )}
            </CardContent>
          </Card>
        </main>

        {/* RIGHT SIDEBAR - Learning Cockpit (Pro feature, always shown in Career Board) */}
        {selectedPost ? (
          <aside className="hidden xl:block w-[280px] flex-shrink-0 border-l">
            <div className="sticky top-28 h-[calc(100vh-7rem)] overflow-hidden p-4">
              <LearningCockpit
                lessonId={selectedPost?.id}
                lessonTitle={selectedPost?.title || ""}
                courseId={course?.id}
                courseSlug={course.slug}
                userId={user?.id || ""}
                isLessonCompleted={isCurrentLessonCompleted}
                isHeaderVisible={isHeaderVisible}
                showAnnouncement={showAnnouncement}
                courseProgress={courseProgress}
                certificateEligible={courseProgress.isCompleted}
                onOpenNotes={() => openNotesTab()}
              />
            </div>
          </aside>
        ) : (
          /* Course overview - show metadata sidebar */
          <aside className="hidden xl:block w-[300px] flex-shrink-0">
            <div className="sticky top-28 p-4">
              <CourseMetadataSidebar
                course={course}
                careers={careers}
                estimatedDuration={formatTotalReadingTime(posts)}
                lastUpdated={posts[0]?.updated_at 
                  ? new Date(posts[0].updated_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                  : undefined
                }
                isAdmin={isAdmin}
                isModerator={isModerator}
                isHeaderVisible={isHeaderVisible}
                showAnnouncement={showAnnouncement}
                linkedPrerequisites={linkedPrerequisites}
                creator={courseCreator}
                maintenanceTeam={maintenanceTeam}
              />
            </div>
          </aside>
        )}
      </div>

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

      {/* Restart Course Modal */}
      <AlertDialog open={restartModalOpen} onOpenChange={setRestartModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restart Course?</AlertDialogTitle>
            <AlertDialogDescription>Restarting will reset your progress. Your completion history will be preserved. Continue?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestartCourse} className="bg-primary hover:bg-primary/90">Restart Course</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CodeEditProvider>
  );
};

export default CareerCourseDetail;
