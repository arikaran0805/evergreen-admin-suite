import { useState, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ChevronDown,
  CheckCircle,
  Circle,
  BookOpen,
  Home,
  Search,
  X,
  Sparkles,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  lesson_id: string | null;
  status: string;
}

interface LessonProgress {
  totalPosts: number;
  completedPosts: number;
  percentage: number;
  isComplete: boolean;
}

interface CourseProgressData {
  percentage: number;
  completedCount: number;
  totalCount: number;
  hasStarted: boolean;
  isCompleted: boolean;
}

interface CourseSidebarProps {
  lessons: CourseLesson[];
  posts: Post[];
  selectedPost: Post | null;
  expandedLessons: Set<string>;
  courseProgress: CourseProgressData;
  isPreviewMode: boolean;
  canPreview: boolean;
  isHeaderVisible: boolean;
  showAnnouncement: boolean;
  isAuthenticated: boolean;
  getPostsForLesson: (lessonId: string) => Post[];
  getLessonProgress: (lessonId: string) => LessonProgress;
  isLessonCompleted: (postId: string) => boolean;
  toggleLessonExpansion: (lessonId: string) => void;
  handleLessonClick: (post: Post) => void;
  handleHomeClick: () => void;
}

export const CourseSidebar = ({
  lessons,
  posts,
  selectedPost,
  expandedLessons,
  courseProgress,
  isPreviewMode,
  canPreview,
  isHeaderVisible,
  showAnnouncement,
  isAuthenticated,
  getPostsForLesson,
  getLessonProgress,
  isLessonCompleted,
  toggleLessonExpansion,
  handleLessonClick,
  handleHomeClick,
}: CourseSidebarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Filter lessons based on search query
  const filteredLessons = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    
    if (!query) {
      return lessons.filter(lesson => isPreviewMode || lesson.is_published);
    }

    return lessons
      .filter(lesson => isPreviewMode || lesson.is_published)
      .filter(lesson => {
        // Check if lesson title/description matches
        const lessonMatches = 
          lesson.title.toLowerCase().includes(query) ||
          (lesson.description?.toLowerCase().includes(query) ?? false);
        
        // Check if any posts in this lesson match
        const lessonPosts = getPostsForLesson(lesson.id);
        const hasMatchingPosts = lessonPosts.some(post =>
          post.title.toLowerCase().includes(query) ||
          (post.excerpt?.toLowerCase().includes(query) ?? false)
        );

        return lessonMatches || hasMatchingPosts;
      });
  }, [lessons, searchQuery, isPreviewMode, getPostsForLesson]);

  // Get filtered posts for a lesson (when searching)
  const getFilteredPostsForLesson = (lessonId: string) => {
    const allPosts = getPostsForLesson(lessonId);
    const query = searchQuery.toLowerCase().trim();

    if (!query) return allPosts;

    // Check if the lesson itself matches
    const lesson = lessons.find(l => l.id === lessonId);
    const lessonMatches = lesson && (
      lesson.title.toLowerCase().includes(query) ||
      (lesson.description?.toLowerCase().includes(query) ?? false)
    );

    // If lesson matches, show all posts; otherwise filter posts
    if (lessonMatches) return allPosts;

    return allPosts.filter(post =>
      post.title.toLowerCase().includes(query) ||
      (post.excerpt?.toLowerCase().includes(query) ?? false)
    );
  };

  // Calculate sticky top position based on header visibility
  const stickyTopClass = isPreviewMode && canPreview
    ? (showAnnouncement ? 'top-[10.5rem]' : 'top-[8.5rem]')
    : isHeaderVisible
      ? (showAnnouncement ? 'top-[8.75rem]' : 'top-[6.5rem]')
      : (showAnnouncement ? 'top-[4.75rem]' : 'top-10');

  const noResults = searchQuery && filteredLessons.length === 0;

  return (
    <aside className="lg:w-72 bg-sidebar border-r border-sidebar-border flex-shrink-0">
      <div className={cn("sticky transition-[top] duration-200 ease-out h-[calc(100vh-6.5rem)]", stickyTopClass)}>
        
        {/* === SECTION 1: COURSE PROGRESS HEADER === */}
        <div className="px-4 pt-4 pb-1">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sidebar-foreground text-sm tracking-wide uppercase leading-none">
              {isAuthenticated ? "Course Progress" : "Course Outline"}
            </h2>
            <div className="flex items-center gap-0.5">
              {/* Search Icon */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      setIsSearchFocused(!isSearchFocused);
                      if (isSearchFocused) setSearchQuery("");
                    }}
                    className={cn(
                      "p-1.5 rounded-md transition-all duration-200",
                      isSearchFocused 
                        ? "text-sidebar-primary bg-sidebar-accent" 
                        : "text-muted-foreground hover:text-sidebar-primary hover:bg-sidebar-accent"
                    )}
                    aria-label="Search lessons"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Search lessons
                </TooltipContent>
              </Tooltip>

              {/* Home Icon */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleHomeClick}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-sidebar-primary hover:bg-sidebar-accent transition-all duration-200"
                    aria-label="Go to course home"
                  >
                    <Home className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Course home
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* === SECTION 2: LESSON SEARCH (Collapsible) === */}
        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out",
            isSearchFocused ? "max-h-24 opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search lessons…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "w-full pl-9 pr-8 py-2 text-sm rounded-lg",
                  "bg-background border border-sidebar-border",
                  "placeholder:text-muted-foreground/60",
                  "transition-all duration-200",
                  "focus:outline-none focus:ring-2 focus:ring-sidebar-ring/30 focus:border-sidebar-primary/50"
                )}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          {/* Separator inside collapsible - only visible when search is open */}
          <Separator className="bg-sidebar-border" />
        </div>

        {/* === SECTION 3: PROGRESS DISPLAY (Logged-in users only) === */}
        {isAuthenticated ? (
          <>
            <div className="px-4 pt-1 pb-4">
              <div className="space-y-2.5">
                {/* Completion Stats Row */}
                <div className="flex items-center justify-between">
                  {courseProgress.percentage > 0 ? (
                    <span className="text-xs text-muted-foreground">
                      {courseProgress.completedCount}/{courseProgress.totalCount} lessons completed
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/60">
                      {courseProgress.totalCount} lessons
                    </span>
                  )}
                  <span className="text-sm font-semibold text-sidebar-primary">
                    {courseProgress.percentage}%
                  </span>
                </div>

                {/* Progress Bar */}
                <Progress 
                  value={courseProgress.percentage} 
                  className="h-2 bg-sidebar-accent [&>div]:bg-gradient-to-r [&>div]:from-sidebar-primary [&>div]:to-sidebar-primary/70 [&>div]:transition-all [&>div]:duration-500"
                  aria-label={`Course progress: ${courseProgress.percentage}%`}
                />

                {/* Motivational Text */}
                <div className="flex items-center gap-1.5 text-xs">
                  {!courseProgress.hasStarted && (
                    <>
                      <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Ready when you are</span>
                    </>
                  )}
                  {courseProgress.hasStarted && !courseProgress.isCompleted && courseProgress.percentage < 50 && (
                    <>
                      <Sparkles className="h-3.5 w-3.5 text-sidebar-primary" />
                      <span className="text-sidebar-accent-foreground">Great start! Keep going</span>
                    </>
                  )}
                  {courseProgress.hasStarted && !courseProgress.isCompleted && courseProgress.percentage >= 50 && (
                    <>
                      <Sparkles className="h-3.5 w-3.5 text-sidebar-primary" />
                      <span className="text-sidebar-accent-foreground">You're doing amazing!</span>
                    </>
                  )}
                  {courseProgress.isCompleted && (
                    <>
                      <Award className="h-3.5 w-3.5 text-sidebar-primary" />
                      <span className="text-sidebar-primary font-medium">Course completed!</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <Separator className="bg-sidebar-border" />
          </>
        ) : (
          /* Guest CTA */
          <div className="px-4 py-3">
            <p className="text-xs text-muted-foreground">
              <a href="/auth" className="text-sidebar-primary hover:underline">Log in</a> to track your progress
            </p>
          </div>
        )}

        {/* === SECTION 4: LESSON TREE === */}
        <ScrollArea className="flex-1 h-[calc(100%-16rem)]">
          <nav className="p-2" aria-label="Course lessons">
            {noResults ? (
              /* Empty State: No Search Results */
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <Search className="h-8 w-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground font-medium">
                  No lessons match your search
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Try a different keyword
                </p>
              </div>
            ) : filteredLessons.length > 0 ? (
              filteredLessons.map((lesson) => {
                const lessonPosts = getFilteredPostsForLesson(lesson.id);
                const isExpanded = expandedLessons.has(lesson.id);
                const hasActivePost = lessonPosts.some(p => p.id === selectedPost?.id);
                const lessonProgress = getLessonProgress(lesson.id);
                const isSingleModule = filteredLessons.length === 1;

                return (
                  <div key={lesson.id} className="mb-1">
                    {/* Module Header */}
                    <button
                      onClick={() => toggleLessonExpansion(lesson.id)}
                      className={cn(
                        "w-full rounded-lg transition-all duration-200 text-left",
                        "focus:outline-none focus:ring-2 focus:ring-sidebar-ring/40",
                        hasActivePost
                          ? "bg-sidebar-accent border border-sidebar-primary/20"
                          : "hover:bg-sidebar-accent"
                      )}
                      aria-expanded={isExpanded}
                    >
                      <div className="px-3 py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          {/* Module Status Icon - Only show progress for authenticated users */}
                          {isAuthenticated ? (
                            lessonProgress.isComplete ? (
                              <CheckCircle className="h-4 w-4 text-sidebar-primary flex-shrink-0" />
                            ) : lessonProgress.completedPosts > 0 ? (
                              <div className="h-4 w-4 rounded-full border-2 border-sidebar-primary flex items-center justify-center flex-shrink-0">
                                <div className="h-1.5 w-1.5 rounded-full bg-sidebar-primary/60" />
                              </div>
                            ) : (
                              <Circle className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                            )
                          ) : (
                            <BookOpen className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                          )}
                          <span className="text-sm font-medium text-sidebar-foreground truncate">
                            {lesson.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Module Progress Indicator - Only for authenticated users */}
                          {isAuthenticated && lessonProgress.totalPosts > 0 && (
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              {lessonProgress.completedPosts}/{lessonProgress.totalPosts}
                            </span>
                          )}
                          {/* Chevron - hide for single module if not needed */}
                          {!isSingleModule && (
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                                isExpanded && "rotate-180"
                              )}
                            />
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Lesson Posts */}
                    {(isExpanded || isSingleModule) && (
                      <div className="ml-3 mt-1 border-l-2 border-sidebar-border pl-2 space-y-0.5">
                        {lessonPosts.length > 0 ? (
                          lessonPosts.map((post) => {
                            const isActive = selectedPost?.id === post.id;
                            const isCompleted = isLessonCompleted(post.id);

                            return (
                              <button
                                key={post.id}
                                onClick={() => handleLessonClick(post)}
                                className={cn(
                                  "w-full rounded-md transition-all duration-200 text-left group",
                                  "focus:outline-none focus:ring-2 focus:ring-sidebar-ring/40",
                                  isActive
                                    ? "bg-sidebar-primary shadow-sm"
                                    : "hover:bg-sidebar-accent"
                                )}
                              >
                                <div className="px-3 py-2 flex items-center gap-2">
                                  {/* Lesson Status - Only show for authenticated users */}
                                  {isAuthenticated ? (
                                    isCompleted ? (
                                      <CheckCircle
                                        className={cn(
                                          "h-3.5 w-3.5 flex-shrink-0",
                                          isActive ? "text-sidebar-primary-foreground" : "text-sidebar-primary"
                                        )}
                                      />
                                    ) : (
                                      <Circle
                                        className={cn(
                                          "h-3.5 w-3.5 flex-shrink-0",
                                          isActive ? "text-sidebar-primary-foreground/70" : "text-muted-foreground/50"
                                        )}
                                      />
                                    )
                                  ) : null}
                                  <span
                                    className={cn(
                                      "text-sm flex-1 truncate transition-colors",
                                      isActive
                                        ? "text-sidebar-primary-foreground font-medium"
                                        : "text-sidebar-foreground group-hover:text-sidebar-accent-foreground"
                                    )}
                                  >
                                    {post.title}
                                  </span>
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <div className="px-3 py-3 text-xs text-muted-foreground/60 italic">
                            Content coming soon…
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              /* Empty State: No Lessons */
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <BookOpen className="h-8 w-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No lessons yet</p>
              </div>
            )}
          </nav>
        </ScrollArea>
      </div>
    </aside>
  );
};

export default CourseSidebar;
