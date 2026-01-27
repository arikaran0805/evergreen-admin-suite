import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CodeEditProvider } from "@/contexts/CodeEditContext";
import { useAdSettings } from "@/hooks/useAdSettings";
import { useCourseStats } from "@/hooks/useCourseStats";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useCourseProgress } from "@/hooks/useCourseProgress";
import { useLessonTimeTracking } from "@/hooks/useLessonTimeTracking";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserState } from "@/hooks/useUserState";
import { useCareers } from "@/hooks/useCareers";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNotesTabOpener } from "@/hooks/useNotesTabManager";
import { useCourseTabRegistration } from "@/hooks/useCourseTabManager";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CareerScopedHeader } from "@/components/course/CareerScopedHeader";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import SEOHead from "@/components/SEOHead";
import CourseStructuredData from "@/components/CourseStructuredData";
import ContentRenderer from "@/components/ContentRenderer";
import CourseReviewDialog from "@/components/CourseReviewDialog";
import { ReviewPreviewCard } from "@/components/course-completed";
import ShareTooltip from "@/components/ShareTooltip";
import CommentDialog from "@/components/CommentDialog";
import ReportSuggestDialog from "@/components/ReportSuggestDialog";
import CourseMetadataSidebar from "@/components/course/CourseMetadataSidebar";
import CourseNotesTab from "@/components/course/CourseNotesTab";
import LessonFooter from "@/components/course/LessonFooter";
import { ProTeaser } from "@/components/course/ProTeaser";
import { LearningCockpit } from "@/components/course/LearningCockpit";
import { CourseSidebarAds } from "@/components/course/CourseSidebarAds";
import { 
  GuestContextBanner, 
  CertificateTeaser, 
  CompletionNudge,
  LockedSidebarSection,
} from "@/components/course/nudges";
import { usePricingDrawer } from "@/contexts/PricingDrawerContext";
import { sanitizeHtml } from "@/lib/sanitize";
import { cn } from "@/lib/utils";
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
import CourseSidebar from "@/components/course/CourseSidebar";
import LessonRightSidebar from "@/components/course/LessonRightSidebar";
import LessonShareMenu from "@/components/LessonShareMenu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { trackSocialMediaClick } from "@/lib/socialAnalytics";
import { trackPostShare } from "@/lib/shareAnalytics";
import { formatReadingTime, formatTotalReadingTime } from "@/lib/readingTime";
import { z } from "zod";
import type { User } from "@supabase/supabase-js";

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

const commentSchema = z.object({
  content: z.string()
    .trim()
    .min(1, { message: "Comment cannot be empty" })
    .max(1000, { message: "Comment must be less than 1000 characters" })
});

const CourseDetail = () => {
  const params = useParams<{ slug: string }>();
  const slug = decodeURIComponent((params.slug ?? "").split("?")[0]).trim();
  const [searchParams, setSearchParams] = useSearchParams();
  const lessonSlug = searchParams.get("lesson");
  const tabParam = searchParams.get("tab"); // Persist active tab in URL
  const isPreviewMode = searchParams.get("preview") === "true";
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [siteSettings, setSiteSettings] = useState<any>(null);
  const [canPreview, setCanPreview] = useState(false);
  const { isAdmin, isModerator, isLoading: roleLoading } = useUserRole();
  const { userState, entrySource, isGuest, isLearner, isPro, shouldShowAds, shouldShowProFeatures, isCareerFlow, markAsInternal, isLoading: userStateLoading } = useUserState();
  const { openPricingDrawer } = usePricingDrawer();
  const isMobile = useIsMobile();
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [loadingPost, setLoadingPost] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentContent, setCommentContent] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [likingPost, setLikingPost] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [suggestDialogOpen, setSuggestDialogOpen] = useState(false);
  const [allTags, setAllTags] = useState<Array<{id: string; name: string; slug: string}>>([]);
  const [copiedUrl, setCopiedUrl] = useState(false);
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
  const { toast } = useToast();
  const { settings: adSettings } = useAdSettings();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [restartModalOpen, setRestartModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null); // Defer until we know user context
  const [defaultTabResolved, setDefaultTabResolved] = useState(false);
  const [shareOpenPostId, setShareOpenPostId] = useState<string | null>(null);
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);
  const [userSelectedCareer, setUserSelectedCareer] = useState<string | null>(null);

  // Career data hook for career-scoped navigation
  const { 
    getCareerBySlug, 
    getCareerCourses, 
    loading: careersLoading 
  } = useCareers();

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
  const { progress, markLessonViewed, markLessonCompleted, isLessonCompleted, refetch: refetchProgress } = useCourseProgress(course?.id);
  const [markingComplete, setMarkingComplete] = useState(false);

  // Time tracking hook
  useLessonTimeTracking({ lessonId: selectedPost?.id, courseId: course?.id });

  // Notes tab manager - prevents multiple notes tabs for same course
  const { openNotesTab } = useNotesTabOpener(course?.id);

  // Handle navigation to lesson from external tabs (Deep Notes, etc.)
  const handleExternalLessonNavigation = useCallback((lessonSlug: string) => {
    console.log('[CourseDetail] External navigation to lesson:', lessonSlug);
    setSearchParams({ lesson: lessonSlug, tab: "lessons" }, { replace: true });
    // Scroll to top smoothly when navigating to a lesson
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [setSearchParams]);

  // Register this Course Detail tab for single-tab-per-course management
  useCourseTabRegistration(course?.id, slug, handleExternalLessonNavigation);

  const handleAnnouncementVisibility = useCallback((visible: boolean) => {
    setShowAnnouncement(visible);
  }, []);

  const handleHeaderVisibility = useCallback((visible: boolean) => {
    setIsHeaderVisible(visible);
  }, []);

  // Computed values for course status
  const courseProgress = useMemo(() => {
    const completedCount = progress.completedLessons;
    const totalCount = posts.length;
    const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const hasStarted = completedCount > 0;
    const isCompleted = completedCount === totalCount && totalCount > 0;
    return { completedCount, totalCount, percentage, hasStarted, isCompleted };
  }, [progress.completedLessons, posts.length]);

  // Career-scoped navigation data for Pro users
  const userCareer = useMemo(() => {
    if (!userSelectedCareer) return null;
    return getCareerBySlug(userSelectedCareer);
  }, [userSelectedCareer, getCareerBySlug]);

  const careerScopedCourses = useMemo(() => {
    if (!userCareer) return [];
    const careerCourseData = getCareerCourses(userCareer.id);
    return careerCourseData
      .filter(cc => cc.course)
      .map(cc => ({
        id: cc.course!.id,
        name: cc.course!.name,
        slug: cc.course!.slug,
      }));
  }, [userCareer, getCareerCourses]);

  // GUEST REDIRECT: If guest arrives from external source, redirect to first lesson
  useEffect(() => {
    // Wait for data to load
    if (loading || userStateLoading || posts.length === 0) return;
    
    // Only redirect guests from external sources who don't have a lesson already selected
    if (isGuest && entrySource === "external" && !lessonSlug) {
      const firstPost = posts[0];
      if (firstPost) {
        // Redirect to first lesson without showing Course Detail Page
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set("lesson", firstPost.slug);
        nextParams.set("tab", "lessons");
        setSearchParams(nextParams, { replace: true });
      }
    }
  }, [loading, userStateLoading, isGuest, entrySource, lessonSlug, posts, searchParams, setSearchParams]);

  // Mark as internal navigation when user navigates within the app
  useEffect(() => {
    // Mark as internal after first interaction with course
    if (user && course) {
      markAsInternal();
    }
  }, [user, course, markAsInternal]);

  // Resolve default tab based on URL param, user role, and progress state
  useEffect(() => {
    // Skip if already resolved or still loading essential data
    if (defaultTabResolved || loading || roleLoading) return;

    // Priority 1: If a lesson is already selected via URL, go to lessons tab
    // (Lesson reading always lives in the Lessons context)
    if (lessonSlug) {
      setActiveTab("lessons");
      setDefaultTabResolved(true);
      return;
    }

    // Priority 2: If tab is specified in URL, use it (for persistence across refresh)
    if (tabParam && ["details", "lessons"].includes(tabParam)) {
      setActiveTab(tabParam);
      setDefaultTabResolved(true);
      return;
    }

    // Priority 3: Admin / Super Moderator / Senior Moderator → Course Details
    if (isAdmin || isModerator) {
      setActiveTab("details");
      setDefaultTabResolved(true);
      return;
    }

    // Priority 4: Enrolled learner - in progress (1%-99%) or completed → Lessons
    if (courseStats.isEnrolled && courseProgress.hasStarted) {
      setActiveTab("lessons");
      setDefaultTabResolved(true);
      return;
    }

    // Priority 5: Learners see Lessons tab by default
    if (isLearner || isPro) {
      setActiveTab("lessons");
      setDefaultTabResolved(true);
      return;
    }

    // Default: Not started / not enrolled / unknown → Course Details (onboarding)
    setActiveTab("details");
    setDefaultTabResolved(true);
  }, [
    defaultTabResolved,
    loading,
    roleLoading,
    isAdmin,
    isModerator,
    lessonSlug,
    tabParam,
    courseStats.isEnrolled,
    courseProgress.hasStarted,
    isLearner,
    isPro,
  ]);

  // Persist active tab to URL when it changes
  const handleTabChange = useCallback((newTab: string) => {
    setActiveTab(newTab);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", newTab);
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Get first uncompleted post for "Continue Learning"
  const getNextPost = useCallback(() => {
    const orderedPosts = getAllOrderedPosts();
    for (const post of orderedPosts) {
      if (!isLessonCompleted(post.id)) {
        return post;
      }
    }
    return orderedPosts[0]; // If all completed, return first
  }, [posts, lessons, isLessonCompleted]);

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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch user's selected career for career-scoped header
  useEffect(() => {
    const fetchUserCareer = async () => {
      if (!user?.id) {
        setUserSelectedCareer(null);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("selected_career")
          .eq("id", user.id)
          .single();
        
        if (!error && data?.selected_career) {
          setUserSelectedCareer(data.selected_career);
        }
      } catch (err) {
        console.error("Error fetching user career:", err);
      }
    };
    
    fetchUserCareer();
  }, [user?.id]);

  useEffect(() => {
    if (roleLoading || !slug) return;

    const hasPreviewAccess = isAdmin || isModerator;
    setCanPreview(hasPreviewAccess);
    fetchCourseAndLessons();
    fetchSiteSettings();
  }, [slug, roleLoading, isAdmin, isModerator]);

  useEffect(() => {
    if (lessonSlug && posts.length > 0) {
      const postToSelect = posts.find((p) => p.slug === lessonSlug);
      // Only hydrate via URL when it isn't already selected (prevents double-fetch on CTA clicks)
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

  useEffect(() => {
    if (selectedPost) {
      fetchComments(selectedPost.id);
      fetchTags(selectedPost.id);

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

  // Fetch careers mapped to this course
  useEffect(() => {
    if (course?.id) {
      fetchCareers();
      fetchCourseTeam();
    }
  }, [course?.id]);

  // Fetch prerequisites separately so it can re-run when user changes (for completion data)
  useEffect(() => {
    if (course?.id) {
      fetchLinkedPrerequisites();
    }
  }, [course?.id, user?.id]);

  // Legacy: Listen for NAVIGATE_TO_LESSON messages via window.postMessage (fallback)
  // The primary method is now via BroadcastChannel in useCourseTabRegistration
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data?.type === "NAVIGATE_TO_LESSON") {
        console.log("[CourseDetail] Legacy postMessage navigation:", event.data);
        const { lessonSlug: targetLessonSlug, courseSlug: targetCourseSlug } = event.data;
        
        if (targetLessonSlug && targetCourseSlug && slug === targetCourseSlug) {
          handleExternalLessonNavigation(targetLessonSlug);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [slug, handleExternalLessonNavigation]);

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
      // Fetch course creator (author)
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

      // Fetch maintenance team from course_assignments
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

      // Fetch linked course details
      const courseIds = (data || [])
        .filter(p => p.prerequisite_course_id)
        .map(p => p.prerequisite_course_id) as string[];

      let coursesMap: Record<string, { id: string; name: string; slug: string }> = {};
      let completionMap: Record<string, { isCompleted: boolean; progressPercentage: number }> = {};
      
      if (courseIds.length > 0) {
        // Fetch course details
        const { data: courses, error: coursesError } = await supabase
          .from("courses")
          .select("id, name, slug")
          .in("id", courseIds);

        if (!coursesError && courses) {
          coursesMap = Object.fromEntries(courses.map(c => [c.id, c]));
        }

        // Fetch completion data for logged-in user
        if (user) {
          // For each prerequisite course, get total lessons and completed lessons
          const completionPromises = courseIds.map(async (prereqCourseId) => {
            // Get total published lessons for this course
            const { count: totalLessons } = await supabase
              .from("posts")
              .select("*", { count: "exact", head: true })
              .eq("category_id", prereqCourseId)
              .eq("status", "published")
              .is("deleted_at", null);

            // Get completed lessons for this user
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

  const fetchCourseAndLessons = async () => {
    try {
      const showAllStatuses = isPreviewMode && (isAdmin || isModerator);
      
      let courseQuery = supabase
        .from("courses")
        .select("*")
        .eq("slug", slug);

      if (!showAllStatuses) {
        courseQuery = courseQuery.eq("status", "published");
      }

      const { data: courseData, error: courseError } = await courseQuery.single();

      if (courseError) {
        if (courseError.code === 'PGRST116') {
          throw new Error("Course not found or not published yet");
        }
        throw courseError;
      }
      setCourse(courseData);

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

  const handleLessonClick = (post: Post) => {
    // Single-open accordion: when clicking a lesson, make its group the only open one
    if (post.lesson_id) {
      setExpandedLessons(new Set([post.lesson_id]));
    }

    // Ensure the Lessons tab is active and persists across refresh
    setActiveTab("lessons");
    setDefaultTabResolved(true);

    fetchPostContent(post);

    // Preserve existing query params (preview, etc.) and keep tab in sync
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", "lessons");
    nextParams.set("lesson", post.slug);
    setSearchParams(nextParams);

    window.scrollTo({ top: 0, behavior: "smooth" });
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

      const { error } = await supabase
        .from("comments")
        .insert(commentData);

      if (error) throw error;

      toast({
        title: "Comment Posted",
        description: "Your comment has been posted.",
      });

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
  // Single-open accordion behavior: only one lesson group can be expanded at a time
  const toggleLessonExpansion = (lessonId: string) => {
    setExpandedLessons(prev => {
      // If clicking the already-open lesson, close it (empty set)
      if (prev.has(lessonId)) {
        return new Set();
      }
      // Otherwise, close all and open only the clicked lesson
      return new Set([lessonId]);
    });
  };

  // Copy course URL to clipboard
  const copyUrl = async () => {
    const url = `${window.location.origin}/course/${course?.slug}`;
    await navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
    toast({ title: "URL copied!", description: "Course URL copied to clipboard." });
  };

  // Get primary CTA button props based on user state, enrollment, progress, and role
  const getPrimaryCTAProps = () => {
    // State 5: Admin / Super Moderator / Senior Moderator
    if (isAdmin || isModerator) {
      return {
        label: "Manage Course",
        icon: Edit,
        onClick: () => window.open(`/admin/courses/${course?.id}`, '_blank'),
      };
    }

    // State 0: User not logged in
    if (!user) {
      return {
        label: "Enroll Now",
        icon: UserPlus,
        onClick: () => setLoginModalOpen(true),
      };
    }

    // State 1: User logged in but not enrolled
    if (!courseStats.isEnrolled) {
      return {
        label: "Enroll Now",
        icon: UserPlus,
        onClick: handleEnroll,
      };
    }

    // State 4: User enrolled and completed (100%)
    if (courseProgress.isCompleted) {
      return {
        label: "Restart Course",
        icon: RefreshCw,
        onClick: () => setRestartModalOpen(true),
      };
    }

    // State 3: User enrolled and in progress (1%-99%)
    if (courseProgress.hasStarted) {
      return {
        label: "Continue Learning",
        icon: Play,
        onClick: () => {
          const next = getNextPost();
          if (next) handleLessonClick(next);
        },
      };
    }

    // State 2: User enrolled but not started (0%)
    return {
      label: "Start Course",
      icon: Play,
      onClick: () => {
        // Prefer the first ordered lesson post; fall back to the first course post if lessons aren't wired up.
        const firstPost = orderedPosts[0] ?? posts[0];
        if (!firstPost) {
          toast({
            title: "No lessons available",
            description: "This course doesn't have any published lessons yet.",
            variant: "destructive",
          });
          return;
        }

        handleLessonClick(firstPost);
      },
    };
  };

  // Handle restart course confirmation
  const handleRestartCourse = async () => {
    if (!user || !course?.id) {
      setRestartModalOpen(false);
      return;
    }

    try {
      // Delete all lesson progress for this course
      const { error } = await supabase
        .from('lesson_progress')
        .delete()
        .eq('user_id', user.id)
        .eq('course_id', course.id);

      if (error) throw error;

      // Refetch progress to update UI
      refetchProgress();

      toast({
        title: "Progress Reset",
        description: "Your course progress has been reset. Starting from the beginning!",
      });

      setRestartModalOpen(false);

      // Navigate to first lesson
      const firstPost = orderedPosts[0] ?? posts[0];
      if (firstPost) handleLessonClick(firstPost);
    } catch (error: any) {
      console.error("Error resetting progress:", error);
      toast({
        title: "Error",
        description: "Failed to reset course progress",
        variant: "destructive",
      });
      setRestartModalOpen(false);
    }
  };

  // Handle login redirect
  const handleLoginRedirect = () => {
    setLoginModalOpen(false);
    // Store current URL to redirect back after login
    const returnUrl = window.location.pathname + window.location.search;
    navigate(`/auth?returnUrl=${encodeURIComponent(returnUrl)}`);
  };

  // Get lesson completion info
  const getLessonProgress = (lessonId: string) => {
    const lessonPosts = getPostsForLesson(lessonId);
    const completedPosts = lessonPosts.filter(p => isLessonCompleted(p.id)).length;
    const totalPosts = lessonPosts.length;
    const percentage = totalPosts > 0 ? Math.round((completedPosts / totalPosts) * 100) : 0;
    const isComplete = completedPosts === totalPosts && totalPosts > 0;
    return { completedPosts, totalPosts, percentage, isComplete };
  };

  // Get Action Reinforcement Card content based on current state (mirrors Primary CTA)
  const getActionCardContent = () => {
    // State 6: Admin / Super Moderator / Senior Moderator
    if (isAdmin || isModerator) {
      return {
        title: "Manage This Course",
        message: "View and manage course settings, structure, and metadata.",
        buttonLabel: "Manage Course",
        icon: Edit,
      };
    }

    // State 1: User not logged in
    if (!user) {
      return {
        title: "Login to Get Started",
        message: "Please log in to enroll and track your learning progress.",
        buttonLabel: "Log in",
        icon: UserPlus,
      };
    }

    // State 2: User logged in but not enrolled
    if (!courseStats.isEnrolled) {
      return {
        title: "Ready to Get Started?",
        message: "Enroll in this course to begin your learning journey.",
        buttonLabel: "Enroll Now",
        icon: UserPlus,
      };
    }

    // State 5: User enrolled and completed (100%)
    if (courseProgress.isCompleted) {
      return {
        title: "Course Completed 🎉",
        message: "You've completed this course. You can restart anytime to revise.",
        buttonLabel: "Restart Course",
        icon: RefreshCw,
      };
    }

    // State 4: User enrolled and in progress (1%-99%)
    if (courseProgress.hasStarted) {
      return {
        title: "Keep going",
        message: `${courseProgress.completedCount} of ${courseProgress.totalCount} lessons completed`,
        buttonLabel: "Continue Learning",
        icon: Play,
      };
    }

    // State 3: User enrolled but not started (0%)
    return {
      title: "You're All Set to Start",
      message: "Begin your learning journey when you're ready.",
      buttonLabel: "Start Course",
      icon: Play,
    };
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="fixed top-0 left-0 right-0 z-[60]">
          <AnnouncementBar onVisibilityChange={handleAnnouncementVisibility} />
        </div>
        {/* LOADING STATE: Global Header always shows, CareerScopedHeader shows additionally in career flow */}
        <Header announcementVisible={showAnnouncement} />
        {isCareerFlow && (
          <CareerScopedHeader
            currentCourse={undefined}
            career={null}
            careerCourses={[]}
            announcementVisible={showAnnouncement}
            isHeaderVisible={true}
            isLoading={true}
          />
        )}
        <div className={`container mx-auto px-4 text-center ${isCareerFlow ? 'pt-32' : (showAnnouncement ? 'pt-32' : 'pt-24')}`}>
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground">Loading course...</p>
          </div>
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
        {/* NOT FOUND STATE: Global Header always shows */}
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

  const ctaProps = getPrimaryCTAProps();
  const CtaIcon = ctaProps.icon;

  return (
    <CodeEditProvider>
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
      
      {/* Preview Mode Banner */}
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
      
      {/* HEADER RENDERING:
          - Global Header ALWAYS renders (primary nav)
          - CareerScopedHeader renders ADDITIONALLY as secondary header when in career flow */}
      <Header 
        announcementVisible={showAnnouncement} 
        onVisibilityChange={handleHeaderVisibility}
      />
      
      {/* Career Flow: Show CareerScopedHeader as SECONDARY header below Global Header */}
      {isCareerFlow && isPro && (
        <CareerScopedHeader
          currentCourse={course ? {
            id: course.id,
            name: course.name,
            slug: course.slug,
          } : undefined}
          career={userCareer}
          careerCourses={careerScopedCourses}
          isHeaderVisible={isHeaderVisible}
          announcementVisible={showAnnouncement}
          isLoading={userStateLoading || careersLoading || !course || !userCareer}
        />
      )}

      {/* Main Layout - adjust padding based on header visibility and career flow
          - Career Flow + Header Visible: Global Header (64px) + CareerScopedHeader (48px) + Announcement (36px)
          - Career Flow + Header Hidden: CareerScopedHeader (48px) + Announcement (36px)
          - Non-Career + Header Visible: Global Header (64px) + Announcement (36px)
          - Non-Career + Header Hidden: Announcement only (36px) */}
      <div className={`w-full transition-[padding-top] duration-200 ease-out ${
        isCareerFlow && isPro
          ? isHeaderVisible
            ? (showAnnouncement ? 'pt-[9.25rem]' : 'pt-28') // 148px / 112px (64+48+36 / 64+48)
            : (showAnnouncement ? 'pt-[5.25rem]' : 'pt-12') // 84px / 48px (48+36 / 48)
          : isPreviewMode && canPreview 
            ? (showAnnouncement ? 'pt-[8.75rem]' : 'pt-[6.5rem]') 
            : isHeaderVisible
              ? (showAnnouncement ? 'pt-[6.25rem]' : 'pt-16') // 100px / 64px
              : (showAnnouncement ? 'pt-9' : 'pt-0') // 36px / 0px
      }`}>
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
            handleHomeClick={() => {
              setSelectedPost(null);

              if (!slug) {
                navigate("/courses");
                return;
              }

              const desiredTab = courseProgress.percentage > 0
                ? "lessons"
                : "details";

              setActiveTab(desiredTab);
              setDefaultTabResolved(true);

              const nextSearch = new URLSearchParams(searchParams);
              nextSearch.delete("lesson");
              nextSearch.set("tab", desiredTab);
              setSearchParams(nextSearch, { replace: true });
            }}
          />

          {/* MAIN CONTENT - max-w-4xl for readability, flex centers it between sidebars */}
          <main className="flex-1 min-w-0 max-w-4xl">
            <Card className="rounded-none border-0 shadow-none">
              <CardContent className="p-6 lg:p-8">
                {loadingPost ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : selectedPost ? (
                  /* Post Content View */
                  <>
                    {/* Post Header */}
                    <div className="mb-4">
                      <h1 className="text-3xl lg:text-4xl font-bold mb-4 text-foreground">{selectedPost.title}</h1>
                      <div className="flex items-center justify-between flex-wrap gap-4">
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
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Share2 className="h-5 w-5" />
                            </Button>
                          </ShareTooltip>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCommentDialogOpen(true)}>
                                  <MessageSquare className="h-5 w-5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{comments.length} comments</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {/* Like button - visible for guests, hidden for logged-in users (they see it in footer) */}
                          {isGuest && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8"
                                    onClick={handleLikeToggle}
                                    disabled={likingPost}
                                  >
                                    <ThumbsUp className={cn("h-5 w-5", hasLiked && "fill-current text-primary")} />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{hasLiked ? 'Unlike' : 'Like'} ({likeCount})</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {/* Bookmark - only for logged-in users */}
                          {!isGuest && (
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
                                <TooltipContent>
                                  <p>{isBookmarked(undefined, selectedPost?.id) ? 'Remove bookmark' : 'Add bookmark'}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {/* More options menu - only for logged-in users */}
                          {!isGuest && (
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
                          )}
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

                    {/* Guest Context Banner - dismissible, session-based */}
                    {isGuest && (
                      <GuestContextBanner className="mb-6" />
                    )}


                    {/* Completion Nudge for Learners - 40-60% trigger */}
                    {isLearner && courseStats.isEnrolled && course?.id && (
                      <CompletionNudge
                        courseId={course.id}
                        progressPercentage={courseProgress.percentage}
                        className="mb-6"
                        onUpgrade={() => openPricingDrawer("completion_nudge")}
                      />
                    )}

                    {/* Lesson Content */}
                    <ContentRenderer 
                      htmlContent={selectedPost.content || ''}
                      courseType={course?.slug?.toLowerCase()}
                      codeTheme={selectedPost.code_theme || undefined}
                    />

                    {/* Certificate Teaser - after lesson content */}
                    {(isGuest || isLearner) && (
                      <CertificateTeaser
                        variant={isGuest ? "guest" : "learner"}
                        className="mt-8 mb-6"
                        onLearnMore={() => openPricingDrawer("certificate_teaser_guest")}
                        onUpgrade={() => openPricingDrawer("certificate_teaser")}
                      />
                    )}

                    {/* Lesson Footer - Completion, Tags, Actions, Navigation */}
                    {/* Hide progress-related actions for guests */}
                    <LessonFooter
                      isCompleted={selectedPost ? isLessonCompleted(selectedPost.id) : false}
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
                      canComplete={!!user && !isGuest}
                      isGuest={isGuest}
                      completedLessonsCount={isGuest ? 0 : courseProgress.completedCount}
                      totalLessons={orderedPosts.length}
                      courseProgressPercentage={isGuest ? 0 : courseProgress.percentage}
                      isCourseComplete={!isGuest && courseProgress.isCompleted}
                      courseId={course?.id || ""}
                      tags={allTags}
                      onCommentClick={() => setCommentDialogOpen(true)}
                      onSuggestChangesClick={isGuest ? undefined : () => setSuggestDialogOpen(true)}
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
                  </>
                ) : (
                  /* Course Overview View */
                  <>
                    {/* PAGE HEADER */}
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
                            <button className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                              <span className="font-semibold">{courseStats.averageRating.toFixed(1)}</span>
                              <span className="text-muted-foreground text-sm">({courseStats.reviewCount} reviews)</span>
                            </button>
                          </CourseReviewDialog>
                        )}
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span className="text-sm">{courseStats.enrollmentCount.toLocaleString()} enrolled</span>
                        </div>
                      </div>

                      {/* CTAs */}
                      <div className="flex items-center justify-center gap-3">
                        {/* Primary CTA */}
                        <Button
                          size="lg"
                          className="bg-primary hover:bg-primary/90 gap-2 px-8 shadow-lg"
                          onClick={ctaProps.onClick}
                          disabled={posts.length === 0}
                        >
                          <CtaIcon className="h-5 w-5" />
                          {ctaProps.label}
                        </Button>
                        
                        {/* View Certificate - Only when course is completed */}
                        {courseStats.isEnrolled && courseProgress.isCompleted && (
                          <Button
                            size="lg"
                            variant="outline"
                            className="gap-2 px-6"
                            onClick={() => navigate(`/course/${course.id}/completed`)}
                          >
                            <Award className="h-5 w-5" />
                            View Certificate
                          </Button>
                        )}
                      </div>
                      
                      {/* Completion Cheer Label - subtle progress reinforcement below CTAs */}
                      {courseStats.isEnrolled && (
                        <p className="text-sm text-muted-foreground font-medium text-center mt-3">
                          {courseProgress.isCompleted ? (
                            <>
                              <span className="mr-1.5">🎉</span>
                              Successfully completed
                            </>
                          ) : courseProgress.hasStarted && courseProgress.percentage > 0 ? (
                            <>
                              <span className="mr-1.5">💪</span>
                              Making great progress
                            </>
                          ) : null}
                        </p>
                      )}
                    </div>

                    {/* TABS */}
                    <Tabs value={activeTab ?? "details"} onValueChange={handleTabChange} className="w-full">
                      <TabsList className="mb-6 w-full justify-start">
                        <TabsTrigger value="details" className="gap-2">
                          <Info className="h-4 w-4" />
                          Course Details
                        </TabsTrigger>
                        <TabsTrigger value="lessons" className="gap-2">
                          <List className="h-4 w-4" />
                          Lessons ({lessons.filter(l => l.is_published || (isPreviewMode && (isAdmin || isModerator))).length})
                        </TabsTrigger>
                        {user && course && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              {isMobile ? (
                                <Link
                                  to={`/courses/${course.id}/notes`}
                                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border border-transparent hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                >
                                  <StickyNote className="h-4 w-4" />
                                  Notes
                                </Link>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    openNotesTab({
                                      lessonId: selectedPost?.id,
                                      entityType: selectedPost ? 'lesson' : undefined,
                                    });
                                  }}
                                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border border-transparent hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                >
                                  <StickyNote className="h-4 w-4" />
                                  Notes
                                  <ExternalLink className="h-3 w-3 opacity-50" />
                                </button>
                              )}
                            </TooltipTrigger>
                            {!isMobile && (
                              <TooltipContent side="bottom" className="text-xs">
                                Opens notes in a new tab
                              </TooltipContent>
                            )}
                          </Tooltip>
                        )}
                      </TabsList>

                      {/* Course Details Tab */}
                      <TabsContent value="details">
                        <div className="space-y-8">
                          {/* Description */}
                          {course.description && (
                            <div className="prose prose-lg max-w-none">
                              <h3 className="text-xl font-semibold mb-4">About This Course</h3>
                              <div 
                                className="text-foreground leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(course.description) }}
                              />
                            </div>
                          )}

                          {/* Review Preview - Social proof */}
                          {courseReviews.length > 0 && (
                            <ReviewPreviewCard
                              reviews={courseReviews}
                              averageRating={courseStats.averageRating}
                            />
                          )}

                          {/* Action Reinforcement Card - mirrors Primary CTA */}
                          {posts.length > 0 && (() => {
                            const cardContent = getActionCardContent();
                            const CardIcon = cardContent.icon;
                            
                            return (
                              <div 
                                id="action-reinforcement-card" 
                                className="p-5 bg-primary/5 rounded-xl border border-primary/10 transition-all duration-300"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                  {/* Left: Icon + Content */}
                                  <div className="flex items-start gap-4 flex-1">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                      <Target className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                      <h3 className="font-semibold text-foreground text-lg leading-tight">
                                        {cardContent.title}
                                      </h3>
                                      <p className="text-sm text-muted-foreground">
                                        {cardContent.message}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Right: CTA */}
                                  <div className="flex flex-col items-center gap-1.5 sm:ml-auto">
                                    <Button 
                                      onClick={ctaProps.onClick}
                                      disabled={posts.length === 0 || enrolling}
                                      className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-5 h-10 font-medium shadow-sm"
                                    >
                                      <CardIcon className="h-4 w-4 mr-2" />
                                      {enrolling ? "Processing..." : cardContent.buttonLabel}
                                    </Button>
                                    <span className="text-xs text-muted-foreground hidden sm:block text-center">
                                      {(() => {
                                        // Moderator/Admin context
                                        if (isAdmin || isModerator) {
                                          const draftCount = posts.filter(p => p.status === 'draft').length;
                                          return draftCount > 0 
                                            ? `${posts.length} lesson${posts.length !== 1 ? 's' : ''} • ${draftCount} draft${draftCount !== 1 ? 's' : ''} pending`
                                            : `${posts.length} lesson${posts.length !== 1 ? 's' : ''} ready`;
                                        }
                                        // Learner with progress - find next incomplete lesson
                                        if (courseProgress.hasStarted) {
                                          const nextLesson = orderedPosts.find(p => !isLessonCompleted(p.id));
                                          if (nextLesson) {
                                            return `Resume from ${nextLesson.title}`;
                                          }
                                        }
                                        // New learner
                                        return "Start your learning journey";
                                      })()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </TabsContent>

                      {/* Lessons Tab */}
                      <TabsContent value="lessons">
                        <div className="mb-6">
                          <h3 className="text-xl font-semibold mb-1">Course Curriculum</h3>
                          <p className="text-muted-foreground text-sm">
                            {lessons.filter(l => l.is_published || (isPreviewMode && (isAdmin || isModerator))).length} lessons • {posts.length} posts
                          </p>
                        </div>

                        {lessons.length === 0 ? (
                          <div className="text-center py-16 bg-muted/30 rounded-xl">
                            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                            <p className="text-muted-foreground">No lessons available yet</p>
                            <p className="text-sm text-muted-foreground mt-1">Check back soon for new content!</p>
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
                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                                          lessonProgress.isComplete 
                                            ? 'bg-primary text-primary-foreground' 
                                            : 'bg-muted text-muted-foreground'
                                        }`}>
                                          {lessonProgress.isComplete ? <CheckCircle className="h-4 w-4" /> : lessonIndex + 1}
                                        </div>
                                        <div>
                                          <h4 className="font-semibold">{lesson.title}</h4>
                                          {lesson.description && (
                                            <p className="text-xs text-muted-foreground">{lesson.description}</p>
                                          )}
                                        </div>
                                        {!lesson.is_published && (
                                          <Badge variant="secondary" className="text-xs">Draft</Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-3">
                                        {lessonProgress.totalPosts > 0 && (
                                          <div className="flex items-center gap-2">
                                            <Progress value={lessonProgress.percentage} className="w-16 h-1.5" />
                                        <span className="text-xs text-muted-foreground">
                                              {lessonProgress.completedPosts} of {lessonProgress.totalPosts} posts completed
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {lessonPosts.length > 0 ? (
                                      <div className="divide-y">
                                        {lessonPosts.map((post) => {
                                          const isCompleted = isLessonCompleted(post.id);
                                          
                                          const isActive = selectedPost?.id === post.id;
                                          
                                          return (
                                            <div 
                                              key={post.id}
                                              className={cn(
                                                "relative flex items-center justify-between hover:bg-muted/30 cursor-pointer transition-colors group",
                                                isActive && "bg-primary/5",
                                                shareOpenPostId === post.id && !isActive && "bg-muted/40"
                                              )}
                                              onClick={() => handleLessonClick(post)}
                                            >
                                              {/* Accent bar - active or share open */}
                                              {(isActive || shareOpenPostId === post.id) && (
                                                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary rounded-r" />
                                              )}
                                              
                                              <div className="px-4 py-3 flex items-center gap-3 flex-1">
                                                {isCompleted ? (
                                                  <CheckCircle className="h-4 w-4 text-primary" />
                                                ) : (
                                                  <Circle className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                                )}
                                                <span className={`text-sm ${isActive ? "font-medium" : ""}`}>{post.title}</span>
                                                {post.post_type && post.post_type !== 'content' && (
                                                  <Badge variant="secondary" className="text-[10px]">
                                                    {post.post_type}
                                                  </Badge>
                                                )}
                                              </div>
                                              <div className="flex items-center gap-2 pr-4">
                                                {/* Estimated Time - always visible */}
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                  <Clock className="h-3 w-3" />
                                                  ~{formatReadingTime(post.content)}
                                                </span>
                                                
                                                {/* Copy Link - visible on hover */}
                                                <Tooltip>
                                                  <TooltipTrigger asChild>
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigator.clipboard.writeText(`${window.location.origin}/courses/${post.slug}`);
                                                        setCopiedPostId(post.id);
                                                        toast({ title: "Link copied!" });
                                                        setTimeout(() => setCopiedPostId(null), 2000);
                                                      }}
                                                      className={`p-1 rounded text-muted-foreground hover:text-foreground transition-opacity ${
                                                        shareOpenPostId === post.id || copiedPostId === post.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                                      }`}
                                                    >
                                                      <Link2 className="h-3.5 w-3.5" />
                                                    </button>
                                                  </TooltipTrigger>
                                                  <TooltipContent side="top" className="text-xs">
                                                    {copiedPostId === post.id ? "Copied" : "Copy link"}
                                                  </TooltipContent>
                                                </Tooltip>
                                                
                                                {/* Share - visible on hover */}
                                                <LessonShareMenu
                                                  postId={post.id}
                                                  postTitle={post.title}
                                                  postSlug={post.slug}
                                                  sectionName={lesson.title}
                                                  side="right"
                                                  vertical
                                                  onOpenChange={(isOpen) =>
                                                    setShareOpenPostId((prev) =>
                                                      isOpen ? post.id : prev === post.id ? null : prev
                                                    )
                                                  }
                                                />
                                                
                                                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                              </div>
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

                      {/* Notes now opens in a separate tab */}
                    </Tabs>
                  </>
                )}
              </CardContent>
            </Card>
          </main>

          {/* RIGHT SIDEBAR - Role-based content */}
          {selectedPost ? (
            /* Lesson view sidebars */
            isPro ? (
              /* PRO: Learning Cockpit - full features, no ads */
              <LearningCockpit
                lessonId={selectedPost.id}
                lessonTitle={selectedPost.title}
                courseId={course?.id}
                courseSlug={slug}
                userId={user?.id || ""}
                isLessonCompleted={isLessonCompleted(selectedPost.id)}
                isHeaderVisible={isHeaderVisible}
                showAnnouncement={showAnnouncement}
                courseProgress={courseProgress}
                certificateEligible={courseProgress.isCompleted}
                onOpenNotes={() => openNotesTab()}
              />
            ) : isLearner && courseStats.isEnrolled ? (
              /* LEARNER (enrolled): Show ads + Pro teaser */
              <aside className="hidden xl:block w-[300px] flex-shrink-0">
                <div className={cn(
                  "sticky transition-[top] duration-200 ease-out",
                  isHeaderVisible
                    ? (showAnnouncement ? 'top-[8.75rem]' : 'top-[6.5rem]')
                    : (showAnnouncement ? 'top-[4.75rem]' : 'top-10')
                )}>
                  <div className="space-y-4 p-1 pb-6">
                    {/* Ad slots for free learners */}
                    <CourseSidebarAds
                      adSettings={adSettings ? {
                        googleAdClient: adSettings.googleAdClient,
                        sidebarTopSlot: adSettings.sidebarTopSlot,
                        sidebarMiddleSlot: adSettings.sidebarMiddleSlot,
                        sidebarBottomSlot: adSettings.sidebarBottomSlot,
                      } : null}
                      isHeaderVisible={isHeaderVisible}
                      showAnnouncement={showAnnouncement}
                    />
                    
                    {/* Locked Pro features for learners */}
                    <LockedSidebarSection
                      onUpgrade={() => openPricingDrawer("locked_sidebar")}
                    />
                  </div>
                </div>
              </aside>
            ) : isGuest ? (
              /* GUEST: Show ads only */
              <CourseSidebarAds
                adSettings={adSettings ? {
                  googleAdClient: adSettings.googleAdClient,
                  sidebarTopSlot: adSettings.sidebarTopSlot,
                  sidebarMiddleSlot: adSettings.sidebarMiddleSlot,
                  sidebarBottomSlot: adSettings.sidebarBottomSlot,
                } : null}
                isHeaderVisible={isHeaderVisible}
                showAnnouncement={showAnnouncement}
              />
            ) : null
          ) : (
            /* Course overview sidebars */
            activeTab !== "notes" && (
              <aside className="hidden xl:block w-[300px] flex-shrink-0">
                <div className={cn(
                  "sticky transition-[top] duration-200 ease-out",
                  isHeaderVisible
                    ? (showAnnouncement ? 'top-[8.75rem]' : 'top-[6.5rem]')
                    : (showAnnouncement ? 'top-[4.75rem]' : 'top-10')
                )}>
                  <div className="space-y-4 p-1 pb-6">
                    {/* Course metadata always shown */}
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
                    
                    {/* Ads for non-Pro users */}
                    {shouldShowAds && (
                      <CourseSidebarAds
                        adSettings={adSettings ? {
                          googleAdClient: adSettings.googleAdClient,
                          sidebarTopSlot: adSettings.sidebarTopSlot,
                          sidebarMiddleSlot: adSettings.sidebarMiddleSlot,
                          sidebarBottomSlot: adSettings.sidebarBottomSlot,
                        } : null}
                        isHeaderVisible={isHeaderVisible}
                        showAnnouncement={showAnnouncement}
                      />
                    )}
                    
                    {/* Pro teaser for free learners */}
                    {isLearner && <ProTeaser />}
                  </div>
                </div>
              </aside>
            )
          )}
        </div>
      </div>

      <Footer />

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

      {/* Login Required Modal */}
      <AlertDialog open={loginModalOpen} onOpenChange={setLoginModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Login Required</AlertDialogTitle>
            <AlertDialogDescription>
              Please log in to enroll in this course and track your progress.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLoginRedirect} className="bg-primary hover:bg-primary/90">
              Log in
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restart Course Confirmation Modal */}
      <AlertDialog open={restartModalOpen} onOpenChange={setRestartModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restart Course?</AlertDialogTitle>
            <AlertDialogDescription>
              Restarting will reset your progress. Your completion history will be preserved. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestartCourse} className="bg-primary hover:bg-primary/90">
              Restart Course
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Notes now opens in a dedicated route: /courses/:courseId/notes */}
    </div>
    </CodeEditProvider>
  );
};

export default CourseDetail;
