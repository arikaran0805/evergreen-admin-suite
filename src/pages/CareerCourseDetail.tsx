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
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useSearchParams, useOutletContext, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CodeEditProvider } from "@/contexts/CodeEditContext";
import { useCourseStats } from "@/hooks/useCourseStats";
import { useCourseProgress } from "@/hooks/useCourseProgress";
import { useLessonTimeTracking } from "@/hooks/useLessonTimeTracking";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserState } from "@/hooks/useUserState";
import { useCareerBoard } from "@/contexts/CareerBoardContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNotesTabOpener } from "@/hooks/useNotesTabManager";
import SEOHead from "@/components/SEOHead";
import ContentRenderer from "@/components/ContentRenderer";
import { CourseSidebar } from "@/components/course/CourseSidebar";
import { LearningCockpit } from "@/components/course/LearningCockpit";
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
  CheckCircle, 
  Play,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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

interface OutletContext {
  setCurrentCourseSlug: (slug: string | null) => void;
}

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
  
  // State
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [loadingPost, setLoadingPost] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>("lessons");
  const [restartModalOpen, setRestartModalOpen] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  
  // Course stats and progress
  const { stats: courseStats, reviews: courseReviews, loading: courseStatsLoading, enrolling, enroll } = useCourseStats(course?.id, user);
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

  // Set default tab based on progress
  useEffect(() => {
    if (loading || posts.length === 0) return;
    
    if (tabParam && ["lessons", "notes", "certificate"].includes(tabParam)) {
      setActiveTab(tabParam);
    } else if (courseProgress.percentage > 0) {
      setActiveTab("lessons");
    } else {
      setActiveTab("lessons"); // In career flow, always default to lessons
    }
  }, [loading, posts.length, tabParam, courseProgress.percentage]);

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
        .select("*")
        .eq("course_id", courseData.id)
        .is("deleted_at", null)
        .order("lesson_rank");

      if (lessonsError) throw lessonsError;
      setLessons(lessonsData || []);

      // Fetch posts
      let postsQuery = supabase
        .from("posts")
        .select("id, title, excerpt, slug, featured_image, published_at, updated_at, status, lesson_id, post_rank, post_type, code_theme, profiles(full_name)")
        .eq("category_id", courseData.id)
        .is("deleted_at", null);

      if (!showAllStatuses) {
        postsQuery = postsQuery.eq("status", "published");
      }

      const { data: postsData, error: postsError } = await postsQuery.order("post_rank");

      if (postsError) throw postsError;
      setPosts((postsData as Post[]) || []);

      // Auto-select first lesson if none selected
      if (!lessonSlug && postsData && postsData.length > 0) {
        const firstPost = postsData[0] as Post;
        setSearchParams({ lesson: firstPost.slug, tab: "lessons" }, { replace: true });
      }
    } catch (error) {
      console.error("Error fetching course:", error);
      toast({
        title: "Error",
        description: "Failed to load course data",
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
        .select("content, code_theme")
        .eq("id", post.id)
        .single();

      if (error) throw error;
      
      setSelectedPost({ ...post, content: data.content, code_theme: data.code_theme });

      // Mark as viewed
      if (user && course) {
        await markLessonViewed(post.id);
      }
    } catch (error) {
      console.error("Error fetching post content:", error);
    } finally {
      setLoadingPost(false);
    }
  };

  const handlePostSelect = (post: Post) => {
    if (post.lesson_id) {
      setExpandedLessons((prev) => {
        const newSet = new Set(prev);
        newSet.add(post.lesson_id!);
        return newSet;
      });
    }
    fetchPostContent(post);
    setSearchParams({ lesson: post.slug, tab: "lessons" }, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleMarkComplete = async () => {
    if (!selectedPost || !course || !user) return;
    
    setMarkingComplete(true);
    try {
      await markLessonCompleted(selectedPost.id, true);
      toast({ title: "Lesson marked as complete!" });
      await refetchProgress();
    } catch (error) {
      console.error("Error marking lesson complete:", error);
      toast({ title: "Error", description: "Failed to mark lesson as complete", variant: "destructive" });
    } finally {
      setMarkingComplete(false);
    }
  };

  const handleNextLesson = () => {
    if (!selectedPost) return;
    const currentIndex = posts.findIndex(p => p.id === selectedPost.id);
    if (currentIndex < posts.length - 1) {
      handlePostSelect(posts[currentIndex + 1]);
    }
  };

  const handlePrevLesson = () => {
    if (!selectedPost) return;
    const currentIndex = posts.findIndex(p => p.id === selectedPost.id);
    if (currentIndex > 0) {
      handlePostSelect(posts[currentIndex - 1]);
    }
  };

  const handleTabChange = useCallback((newTab: string) => {
    setActiveTab(newTab);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", newTab);
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Helper functions for CourseSidebar
  const getPostsForLesson = useCallback((lessonId: string) => {
    return posts.filter(p => p.lesson_id === lessonId);
  }, [posts]);

  const getLessonProgress = useCallback((lessonId: string) => {
    const lessonPosts = posts.filter(p => p.lesson_id === lessonId);
    const completedPosts = lessonPosts.filter(p => isLessonCompleted(p.id)).length;
    const totalPosts = lessonPosts.length;
    return {
      totalPosts,
      completedPosts,
      percentage: totalPosts > 0 ? Math.round((completedPosts / totalPosts) * 100) : 0,
      isComplete: totalPosts > 0 && completedPosts === totalPosts,
    };
  }, [posts, isLessonCompleted]);

  const toggleLessonExpansion = useCallback((lessonId: string) => {
    setExpandedLessons((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(lessonId)) {
        newSet.delete(lessonId);
      } else {
        newSet.add(lessonId);
      }
      return newSet;
    });
  }, []);

  const handleHomeClick = useCallback(() => {
    setSearchParams({}, { replace: true });
    setSelectedPost(null);
  }, [setSearchParams]);

  // Loading state
  if (loading || userStateLoading) {
    return <CourseContentSkeleton />;
  }

  // Course not found
  if (!course) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Course not found</h1>
        <p className="text-muted-foreground mb-6">This course doesn't exist or isn't available.</p>
        <Button onClick={() => navigate("/arcade")}>Return to Arcade</Button>
      </div>
    );
  }

  const currentPostIndex = selectedPost ? posts.findIndex(p => p.id === selectedPost.id) : -1;
  const isCurrentLessonCompleted = selectedPost ? isLessonCompleted(selectedPost.id) : false;

  return (
    <CodeEditProvider>
      <SEOHead
        title={`${course.name} | Career Learning`}
        description={course.description || `Learn ${course.name} as part of your career path`}
      />

      <div className="flex min-h-[calc(100vh-9rem)]">
        {/* Left Sidebar - Curriculum */}
        <aside className="hidden lg:block w-[280px] flex-shrink-0 border-r">
          <div className="sticky top-28 h-[calc(100vh-7rem)] overflow-hidden">
            <CourseSidebar
              lessons={lessons}
              posts={posts}
              selectedPost={selectedPost}
              expandedLessons={expandedLessons}
              courseProgress={courseProgress}
              isPreviewMode={isPreviewMode}
              canPreview={isAdmin || isModerator}
              isHeaderVisible={isHeaderVisible}
              showAnnouncement={showAnnouncement}
              isAuthenticated={!!user}
              getPostsForLesson={getPostsForLesson}
              getLessonProgress={getLessonProgress}
              isLessonCompleted={isLessonCompleted}
              toggleLessonExpansion={toggleLessonExpansion}
              handleLessonClick={handlePostSelect}
              handleHomeClick={handleHomeClick}
            />
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          {/* Lesson Content */}
          {selectedPost ? (
            <div className="max-w-4xl mx-auto px-4 lg:px-8 py-8">
              {/* Lesson Header */}
              <div className="mb-8">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <span>{currentPostIndex + 1} of {posts.length}</span>
                  {isCurrentLessonCompleted && (
                    <Badge variant="secondary" className="text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Completed
                    </Badge>
                  )}
                </div>
                <h1 className="text-2xl lg:text-3xl font-bold mb-4">{selectedPost.title}</h1>
              </div>

              {/* Lesson Content */}
              <div className="prose prose-lg dark:prose-invert max-w-none">
                {loadingPost ? (
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-32 w-full" />
                  </div>
                ) : selectedPost.content ? (
                  <ContentRenderer 
                    htmlContent={selectedPost.content} 
                    codeTheme={selectedPost.code_theme || undefined}
                  />
                ) : (
                  <p className="text-muted-foreground">No content available for this lesson.</p>
                )}
              </div>

              {/* Lesson Footer - Navigation & Actions */}
              <div className="mt-12 pt-8 border-t">
                <div className="flex items-center justify-between gap-4">
                  {/* Previous */}
                  <Button
                    variant="outline"
                    onClick={handlePrevLesson}
                    disabled={currentPostIndex <= 0}
                    className="gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>

                  {/* Mark Complete / Next */}
                  <div className="flex items-center gap-2">
                    {!isCurrentLessonCompleted && (
                      <Button
                        onClick={handleMarkComplete}
                        disabled={markingComplete}
                        className="gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        {markingComplete ? "Saving..." : "Mark Complete"}
                      </Button>
                    )}
                    <Button
                      variant={isCurrentLessonCompleted ? "default" : "outline"}
                      onClick={handleNextLesson}
                      disabled={currentPostIndex >= posts.length - 1}
                      className="gap-2"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Course Progress */}
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Course Progress</span>
                    <span className="text-sm text-muted-foreground">
                      {courseProgress.completedCount} of {courseProgress.totalCount} lessons
                    </span>
                  </div>
                  <Progress value={courseProgress.percentage} className="h-2" />
                </div>
              </div>
            </div>
          ) : (
            /* No lesson selected - show course overview */
            <div className="max-w-4xl mx-auto px-4 lg:px-8 py-8">
              <h1 className="text-3xl font-bold mb-4">{course.name}</h1>
              {course.description && (
                <p className="text-lg text-muted-foreground mb-8">{course.description}</p>
              )}
              <Button 
                onClick={() => posts.length > 0 && handlePostSelect(posts[0])}
                disabled={posts.length === 0}
                size="lg"
                className="gap-2"
              >
                <Play className="h-5 w-5" />
                {courseProgress.hasStarted ? "Continue Learning" : "Start Course"}
              </Button>
            </div>
          )}
        </main>

        {/* Right Sidebar - Learning Cockpit (Pro feature, always shown in Career Board) */}
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
      </div>

      {/* Restart Course Modal */}
      <AlertDialog open={restartModalOpen} onOpenChange={setRestartModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restart Course?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset all your progress for this course. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                // Reset progress logic here
                setRestartModalOpen(false);
              }}
            >
              Restart Course
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CodeEditProvider>
  );
};

export default CareerCourseDetail;
