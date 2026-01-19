import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useCourseProgress } from "@/hooks/useCourseProgress";
import { useCourseStats } from "@/hooks/useCourseStats";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useCareers } from "@/hooks/useCareers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  Play, 
  Star, 
  Users, 
  Clock, 
  Globe, 
  Calendar,
  TrendingUp,
  Info,
  List,
  BookOpen,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  Target,
  Sparkles,
  BookmarkPlus,
  BookmarkCheck,
  UserPlus,
  UserCheck,
  Copy,
  Check,
  FileText,
  RotateCcw,
  Briefcase
} from "lucide-react";
import CourseReviewDialog from "@/components/CourseReviewDialog";
import ShareTooltip from "@/components/ShareTooltip";
import ReportSuggestDialog from "@/components/ReportSuggestDialog";
import SEOHead from "@/components/SEOHead";
import CourseStructuredData from "@/components/CourseStructuredData";
import { format } from "date-fns";

interface Course {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  level: string | null;
  learning_hours: number | null;
  featured_image: string | null;
  status: string;
  created_at: string;
  updated_at: string | null;
}

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  lesson_order: number;
  is_published: boolean | null;
  posts: Post[];
}

interface Post {
  id: string;
  title: string;
  slug: string;
  status: string;
  lesson_id: string | null;
}

export default function CourseDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isModerator, isLoading: roleLoading } = useUserRole();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [activeLesson, setActiveLesson] = useState<string | null>(null);

  const { isLessonCompleted } = useCourseProgress(course?.id);
  const { 
    stats: courseStats, 
    reviews: courseReviews, 
    enroll, 
    unenroll, 
    submitReview, 
    deleteReview,
    refetch: refetchStats 
  } = useCourseStats(course?.id, user);
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const { careerCourses } = useCareers();

  const isPreviewMode = isAdmin || isModerator;

  const handleToggleBookmark = () => {
    toggleBookmark(course?.id, undefined);
  };

  // Fetch course and lessons
  useEffect(() => {
    const fetchCourse = async () => {
      if (!slug) return;
      
      setLoading(true);
      try {
        // Fetch course
        const { data: courseData, error: courseError } = await supabase
          .from("courses")
          .select("*")
          .eq("slug", slug)
          .is("deleted_at", null)
          .single();

        if (courseError) throw courseError;
        setCourse(courseData);

        // Fetch lessons with posts
        const { data: lessonsData, error: lessonsError } = await supabase
          .from("course_lessons")
          .select(`
            id,
            title,
            description,
            lesson_order,
            is_published,
            posts:posts(id, title, slug, status, lesson_id)
          `)
          .eq("course_id", courseData.id)
          .is("deleted_at", null)
          .order("lesson_rank", { ascending: true, nullsFirst: false })
          .order("lesson_order", { ascending: true });

        if (lessonsError) throw lessonsError;
        setLessons(lessonsData || []);

        // Auto-expand first lesson
        if (lessonsData && lessonsData.length > 0) {
          setExpandedLessons(new Set([lessonsData[0].id]));
          setActiveLesson(lessonsData[0].id);
        }
      } catch (error) {
        console.error("Error fetching course:", error);
        toast.error("Failed to load course");
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [slug]);

  // Get mapped careers for this course
  const mappedCareers = useMemo(() => {
    if (!course?.id || !careerCourses) return [];
    const careerIds: string[] = [];
    Object.entries(careerCourses).forEach(([careerId, courses]) => {
      if (courses.some(cc => cc.course_id === course.id)) {
        careerIds.push(careerId);
      }
    });
    return careerIds;
  }, [course?.id, careerCourses]);

  // Calculate progress
  const { completedCount, totalCount, percentage } = useMemo(() => {
    const allPosts = lessons.flatMap(l => l.posts.filter(p => p.status === "published" || (isPreviewMode && p.status === "draft")));
    const completed = allPosts.filter(p => isLessonCompleted(p.id)).length;
    const total = allPosts.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completedCount: completed, totalCount: total, percentage: pct };
  }, [lessons, isLessonCompleted, isPreviewMode]);

  // Get next lesson to continue
  const getNextLesson = () => {
    for (const lesson of lessons) {
      const publishedPosts = lesson.posts.filter(p => p.status === "published");
      const incompletePost = publishedPosts.find(p => !isLessonCompleted(p.id));
      if (incompletePost) {
        return { lesson, post: incompletePost };
      }
    }
    return null;
  };

  const handleStartCourse = () => {
    const firstLesson = lessons.find(l => l.is_published || isPreviewMode);
    if (firstLesson) {
      const firstPost = firstLesson.posts.find(p => p.status === "published" || (isPreviewMode && p.status === "draft"));
      if (firstPost) {
        navigate(`/courses/${slug}/${firstPost.slug}`);
      }
    }
  };

  const handleContinueLearning = () => {
    const next = getNextLesson();
    if (next) {
      navigate(`/courses/${slug}/${next.post.slug}`);
    } else {
      handleStartCourse();
    }
  };

  const handleRestartCourse = () => {
    handleStartCourse();
  };

  const handleEnroll = async () => {
    if (!user) {
      toast.error("Please sign in to enroll");
      navigate("/auth");
      return;
    }
    setEnrolling(true);
    const success = await enroll();
    if (success) {
      toast.success("Successfully enrolled!");
    }
    setEnrolling(false);
  };

  const handleUnenroll = async () => {
    setEnrolling(true);
    const success = await unenroll();
    if (success) {
      toast.success("Successfully unenrolled");
    }
    setEnrolling(false);
  };

  const toggleLesson = (lessonId: string) => {
    setExpandedLessons(prev => {
      const next = new Set(prev);
      if (next.has(lessonId)) {
        next.delete(lessonId);
      } else {
        next.add(lessonId);
      }
      return next;
    });
    setActiveLesson(lessonId);
  };

  const copyUrl = async () => {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    toast.success("URL copied to clipboard");
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const getLessonProgress = (lesson: Lesson) => {
    const publishedPosts = lesson.posts.filter(p => p.status === "published" || (isPreviewMode && p.status === "draft"));
    const completed = publishedPosts.filter(p => isLessonCompleted(p.id)).length;
    return { completed, total: publishedPosts.length, percentage: publishedPosts.length > 0 ? Math.round((completed / publishedPosts.length) * 100) : 0 };
  };

  const getCTAButton = () => {
    if (percentage === 0) {
      return (
        <Button size="lg" className="gap-2 px-8 bg-primary hover:bg-primary/90" onClick={handleStartCourse}>
          <Play className="h-5 w-5" />
          Start Course
        </Button>
      );
    } else if (percentage === 100) {
      return (
        <Button size="lg" className="gap-2 px-8" variant="outline" onClick={handleRestartCourse}>
          <RotateCcw className="h-5 w-5" />
          Restart Course
        </Button>
      );
    } else {
      return (
        <Button size="lg" className="gap-2 px-8 bg-primary hover:bg-primary/90" onClick={handleContinueLearning}>
          <Play className="h-5 w-5" />
          Continue Learning
        </Button>
      );
    }
  };

  if (loading || roleLoading) {
    return (
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <Skeleton className="h-96 w-full" />
          </div>
          <div className="lg:col-span-3">
            <Skeleton className="h-12 w-3/4 mb-4" />
            <Skeleton className="h-6 w-1/2 mb-8" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Course Not Found</h1>
        <p className="text-muted-foreground mb-8">The course you're looking for doesn't exist or has been removed.</p>
        <Button onClick={() => navigate("/courses")}>Browse Courses</Button>
      </div>
    );
  }

  const visibleLessons = lessons.filter(l => l.is_published || (isPreviewMode && (isAdmin || isModerator)));

  return (
    <>
      <SEOHead 
        title={`${course.name} | Learn`}
        description={course.description || `Learn ${course.name} with our comprehensive course.`}
      />
      <CourseStructuredData 
        course={course} 
        lessons={lessons.map(l => ({ id: l.id, title: l.title, slug: l.id }))}
        stats={courseStats ? {
          enrollmentCount: courseStats.enrollmentCount,
          averageRating: courseStats.averageRating,
          reviewCount: courseStats.reviewCount
        } : undefined}
      />
      
      <div className="min-h-screen bg-background">
        <div className="container max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* LEFT SIDEBAR - Sticky Navigation */}
            <aside className="lg:col-span-1">
              <div className="sticky top-24 space-y-4">
                {/* Progress Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Your Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">{completedCount} of {totalCount} posts</span>
                        <span className="font-semibold text-primary">{percentage}%</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                    
                    {percentage > 0 && percentage < 100 && (
                      <div className="flex items-center gap-2 text-sm text-primary bg-primary/5 p-2 rounded-lg">
                        <Sparkles className="h-4 w-4" />
                        <span>You're making progress!</span>
                      </div>
                    )}
                    
                    {percentage === 100 && (
                      <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 p-3 rounded-lg">
                        <Target className="h-4 w-4" />
                        <span className="font-medium">Congratulations! Course completed!</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Lesson Navigation */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Lessons</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[400px]">
                      <div className="p-4 pt-0 space-y-1">
                        {visibleLessons.map((lesson, index) => {
                          const lessonProgress = getLessonProgress(lesson);
                          const isExpanded = expandedLessons.has(lesson.id);
                          const isActive = activeLesson === lesson.id;
                          
                          return (
                            <Collapsible key={lesson.id} open={isExpanded} onOpenChange={() => toggleLesson(lesson.id)}>
                              <CollapsibleTrigger className={`w-full flex items-center gap-2 p-2 rounded-lg text-left text-sm hover:bg-muted/50 transition-colors ${isActive ? 'bg-muted' : ''}`}>
                                {lessonProgress.percentage === 100 ? (
                                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                                ) : lessonProgress.completed > 0 ? (
                                  <div className="h-4 w-4 rounded-full border-2 border-primary flex items-center justify-center flex-shrink-0">
                                    <div className="h-2 w-2 rounded-full bg-primary" />
                                  </div>
                                ) : (
                                  <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                )}
                                <span className="flex-1 truncate font-medium">{lesson.title}</span>
                                <span className="text-xs text-muted-foreground">{lessonProgress.completed}/{lessonProgress.total}</span>
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="ml-6 border-l border-border pl-4 py-1 space-y-1">
                                  {lesson.posts
                                    .filter(p => p.status === "published" || (isPreviewMode && p.status === "draft"))
                                    .map(post => (
                                      <button
                                        key={post.id}
                                        onClick={() => navigate(`/courses/${slug}/${post.slug}`)}
                                        className="w-full flex items-center gap-2 p-1.5 rounded text-left text-xs hover:bg-muted/50 transition-colors"
                                      >
                                        {isLessonCompleted(post.id) ? (
                                          <CheckCircle2 className="h-3 w-3 text-primary flex-shrink-0" />
                                        ) : (
                                          <Circle className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                        )}
                                        <span className="truncate">{post.title}</span>
                                      </button>
                                    ))}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="lg:col-span-3">
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

                {/* Primary CTA */}
                <div className="flex justify-center">
                  {getCTAButton()}
                </div>
              </div>

              {/* TABS */}
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="mb-6 w-full justify-start">
                  <TabsTrigger value="details" className="gap-2">
                    <Info className="h-4 w-4" />
                    Course Details
                  </TabsTrigger>
                  <TabsTrigger value="lessons" className="gap-2">
                    <List className="h-4 w-4" />
                    Lessons ({visibleLessons.length})
                  </TabsTrigger>
                  <TabsTrigger value="info" className="gap-2">
                    <Briefcase className="h-4 w-4" />
                    Course Info
                  </TabsTrigger>
                </TabsList>

                {/* COURSE DETAILS TAB */}
                <TabsContent value="details" className="mt-0">
                  <div className="space-y-6">
                    {/* About This Course */}
                    <Card>
                      <CardHeader>
                        <CardTitle>About This Course</CardTitle>
                      </CardHeader>
                      <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                        {course.description ? (
                          <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{course.description}</p>
                        ) : (
                          <p className="text-muted-foreground italic">No description available.</p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Ready to Get Started CTA */}
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="flex items-center gap-4 p-6">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Target className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">Ready to Get Started?</h3>
                          <p className="text-sm text-muted-foreground">Start your learning journey today and master new skills.</p>
                        </div>
                        {getCTAButton()}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* LESSONS TAB */}
                <TabsContent value="lessons" className="mt-0">
                  <div className="space-y-4">
                    {/* Curriculum Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-xl font-semibold">Course Curriculum</h2>
                        <p className="text-sm text-muted-foreground">{visibleLessons.length} lessons • {totalCount} posts</p>
                      </div>
                    </div>

                    {/* Lesson Cards */}
                    {visibleLessons.map((lesson, index) => {
                      const lessonProgress = getLessonProgress(lesson);
                      const publishedPosts = lesson.posts.filter(p => p.status === "published" || (isPreviewMode && p.status === "draft"));
                      
                      return (
                        <Card key={lesson.id} className="overflow-hidden">
                          <Collapsible open={expandedLessons.has(lesson.id)} onOpenChange={() => toggleLesson(lesson.id)}>
                            <CollapsibleTrigger className="w-full">
                              <CardHeader className="flex flex-row items-center gap-4 hover:bg-muted/30 transition-colors cursor-pointer">
                                {/* Lesson Number Badge */}
                                <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                                  lessonProgress.percentage === 100 
                                    ? 'bg-primary text-primary-foreground' 
                                    : 'bg-muted text-muted-foreground'
                                }`}>
                                  {lessonProgress.percentage === 100 ? (
                                    <CheckCircle2 className="h-5 w-5" />
                                  ) : (
                                    `#${index + 1}`
                                  )}
                                </div>
                                
                                <div className="flex-1 text-left">
                                  <CardTitle className="text-base flex items-center gap-2">
                                    {lesson.title}
                                    {!lesson.is_published && isPreviewMode && (
                                      <Badge variant="secondary" className="text-xs">Draft</Badge>
                                    )}
                                  </CardTitle>
                                  <CardDescription className="flex items-center gap-2 mt-1">
                                    <FileText className="h-3 w-3" />
                                    {publishedPosts.length} posts
                                    {lessonProgress.completed > 0 && (
                                      <span className="text-primary">• {lessonProgress.completed} completed</span>
                                    )}
                                  </CardDescription>
                                </div>

                                {/* Progress */}
                                <div className="flex items-center gap-3">
                                  {lessonProgress.total > 0 && (
                                    <div className="w-24">
                                      <Progress value={lessonProgress.percentage} className="h-1.5" />
                                    </div>
                                  )}
                                  {expandedLessons.has(lesson.id) ? (
                                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                  )}
                                </div>
                              </CardHeader>
                            </CollapsibleTrigger>
                            
                            <CollapsibleContent>
                              <CardContent className="pt-0 pb-4">
                                {lesson.description && (
                                  <p className="text-sm text-muted-foreground mb-4 pl-14">{lesson.description}</p>
                                )}
                                
                                {publishedPosts.length > 0 ? (
                                  <div className="space-y-2 pl-14">
                                    {publishedPosts.map(post => (
                                      <button
                                        key={post.id}
                                        onClick={() => navigate(`/courses/${slug}/${post.slug}`)}
                                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                                      >
                                        {isLessonCompleted(post.id) ? (
                                          <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                                        ) : (
                                          <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0 group-hover:text-primary transition-colors" />
                                        )}
                                        <span className="flex-1 text-sm font-medium">{post.title}</span>
                                        <span className="text-xs text-muted-foreground">~5 min</span>
                                        {post.status === "draft" && isPreviewMode && (
                                          <Badge variant="outline" className="text-xs">Draft</Badge>
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="pl-14">
                                    <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30 border border-dashed">
                                      <BookOpen className="h-5 w-5 text-muted-foreground" />
                                      <span className="text-sm text-muted-foreground">Content coming soon</span>
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </CollapsibleContent>
                          </Collapsible>
                        </Card>
                      );
                    })}

                    {visibleLessons.length === 0 && (
                      <Card className="p-8 text-center">
                        <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-semibold mb-2">No Lessons Available</h3>
                        <p className="text-sm text-muted-foreground">Lessons are being prepared. Check back soon!</p>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                {/* COURSE INFO TAB */}
                <TabsContent value="info" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Course Info</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Difficulty */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <TrendingUp className="h-4 w-4" />
                          <span className="text-sm">Difficulty</span>
                        </div>
                        <Badge variant="outline" className="capitalize">{course.level || "Beginner"}</Badge>
                      </div>

                      {/* Duration */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm">Duration</span>
                        </div>
                        <span className="text-sm font-medium">{course.learning_hours || 2} hours</span>
                      </div>

                      {/* Language */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Globe className="h-4 w-4" />
                          <span className="text-sm">Language</span>
                        </div>
                        <span className="text-sm font-medium">English</span>
                      </div>

                      {/* Last Updated */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">Last Updated</span>
                        </div>
                        <span className="text-sm font-medium">
                          {course.updated_at ? format(new Date(course.updated_at), "MMM yyyy") : format(new Date(course.created_at), "MMM yyyy")}
                        </span>
                      </div>

                      <Separator />

                      {/* Career Paths */}
                      {mappedCareers.length > 0 && (
                        <>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Target className="h-4 w-4" />
                              <span className="text-sm">Career Paths</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {mappedCareers.map(careerId => (
                                <Badge key={careerId} variant="secondary" className="text-xs">
                                  Career Path
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <Separator />
                        </>
                      )}

                      {/* Course URL */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Globe className="h-4 w-4" />
                          <span className="text-sm">Course URL</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs bg-muted p-2 rounded truncate">{window.location.href}</code>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyUrl}>
                            {copiedUrl ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      <Separator />

                      {/* Action Buttons */}
                      <div className="space-y-2">
                        {courseStats.isEnrolled ? (
                          <Button variant="outline" className="w-full gap-2" onClick={handleUnenroll} disabled={enrolling}>
                            <UserCheck className="h-4 w-4" />
                            {enrolling ? "Processing..." : "Enrolled"}
                          </Button>
                        ) : (
                          <Button className="w-full gap-2 bg-primary hover:bg-primary/90" onClick={handleEnroll} disabled={enrolling}>
                            <UserPlus className="h-4 w-4" />
                            {enrolling ? "Enrolling..." : "Enroll Now"}
                          </Button>
                        )}
                        <Button variant="outline" className="w-full gap-2" onClick={() => toggleBookmark(course?.id)}>
                          {isBookmarked(course?.id) ? (
                            <>
                              <BookmarkCheck className="h-4 w-4 text-primary" />
                              Saved
                            </>
                          ) : (
                            <>
                              <BookmarkPlus className="h-4 w-4" />
                              Save Course
                            </>
                          )}
                        </Button>
                      </div>

                      <Separator />

                      {/* Share */}
                      <ShareTooltip title={course.name} url={window.location.href}>
                        <Button variant="outline" size="sm" className="w-full">
                          Share Course
                        </Button>
                      </ShareTooltip>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
