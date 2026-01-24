import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { Tag, ArrowLeft, BookOpen, GraduationCap, Clock, Play, ChevronDown, ChevronUp, Layers, Search, X, TrendingUp, Flame, Bookmark } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { calculateReadingTime } from "@/lib/readingTime";
import { useDebounce } from "@/hooks/useDebounce";
import { useRecentlyViewedTags } from "@/hooks/useRecentlyViewedTags";
import { useTagBookmarks } from "@/hooks/useTagBookmarks";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Lesson {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  published_at: string | null;
  course: {
    id: string;
    name: string;
    slug: string;
    level: string | null;
  } | null;
}

interface Course {
  id: string;
  name: string;
  slug: string;
  level: string | null;
  description: string | null;
  featured_image: string | null;
}

interface RelatedTag {
  id: string;
  name: string;
  slug: string;
  count: number;
}

interface PopularTag {
  id: string;
  name: string;
  slug: string;
  postCount: number;
}

type ContentFilter = "all" | "lessons" | "courses";
type LevelFilter = "all" | "Beginner" | "Intermediate" | "Advanced";

const TagPosts = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [relatedTags, setRelatedTags] = useState<RelatedTag[]>([]);
  const [tagName, setTagName] = useState("");
  const [loading, setLoading] = useState(true);
  const [contentFilter, setContentFilter] = useState<ContentFilter>("all");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [popularTags, setPopularTags] = useState<PopularTag[]>([]);
  const [tagId, setTagId] = useState<string | null>(null);
  
  // Debounce search query for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  // Track recently viewed tags
  const { addRecentTag } = useRecentlyViewedTags();
  
  // Tag bookmarks
  const { user } = useAuth();
  const { isBookmarked, toggleBookmark } = useTagBookmarks();

  useEffect(() => {
    fetchPopularTags();
  }, []);

  useEffect(() => {
    if (slug) {
      fetchTagData();
    }
  }, [slug]);

  // Track tag view when tag data is loaded
  useEffect(() => {
    if (tagId && tagName && slug) {
      addRecentTag({ id: tagId, name: tagName, slug });
    }
  }, [tagId, tagName, slug, addRecentTag]);

  const fetchPopularTags = async () => {
    try {
      // Get all post_tags and count by tag_id
      const { data: postTagsData, error } = await supabase
        .from("post_tags")
        .select("tag_id, tags:tag_id (id, name, slug)");

      if (error) throw error;

      // Count occurrences of each tag
      const tagCounts = new Map<string, { tag: PopularTag; count: number }>();
      postTagsData?.forEach(pt => {
        const tag = pt.tags as unknown as { id: string; name: string; slug: string };
        if (tag) {
          const existing = tagCounts.get(tag.id);
          if (existing) {
            existing.count++;
          } else {
            tagCounts.set(tag.id, { 
              tag: { id: tag.id, name: tag.name, slug: tag.slug, postCount: 1 }, 
              count: 1 
            });
          }
        }
      });

      const sortedTags = Array.from(tagCounts.values())
        .map(({ tag, count }) => ({ ...tag, postCount: count }))
        .sort((a, b) => b.postCount - a.postCount)
        .slice(0, 12);

      setPopularTags(sortedTags);
    } catch (error) {
      console.error("Error fetching popular tags:", error);
    }
  };

  const fetchTagData = async () => {
    setLoading(true);
    try {
      // Get the tag
      const { data: tagData, error: tagError } = await supabase
        .from("tags")
        .select("id, name")
        .eq("slug", slug)
        .single();

      if (tagError) throw tagError;
      setTagId(tagData.id);
      setTagName(tagData.name);

      // Get post IDs with this tag
      const { data: postTagsData, error: postTagsError } = await supabase
        .from("post_tags")
        .select("post_id")
        .eq("tag_id", tagData.id);

      if (postTagsError) throw postTagsError;

      if (postTagsData && postTagsData.length > 0) {
        const postIds = postTagsData.map(pt => pt.post_id);

        // Get the lessons (posts) with their course info
        const { data: lessonsData, error: lessonsError } = await supabase
          .from("posts")
          .select(`
            id,
            title,
            slug,
            content,
            published_at,
            category_id,
            courses:category_id (id, name, slug, level)
          `)
          .in("id", postIds)
          .order("published_at", { ascending: false });

        if (lessonsError) throw lessonsError;
        
        const formattedLessons: Lesson[] = (lessonsData || []).map(lesson => ({
          id: lesson.id,
          title: lesson.title,
          slug: lesson.slug,
          content: lesson.content,
          published_at: lesson.published_at,
          course: lesson.courses as Lesson['course']
        }));
        
        setLessons(formattedLessons);

        // Get unique courses from lessons
        const courseIds = [...new Set(formattedLessons.map(l => l.course?.id).filter(Boolean))] as string[];
        
        if (courseIds.length > 0) {
          const { data: coursesData, error: coursesError } = await supabase
            .from("courses")
            .select("id, name, slug, level, description, featured_image")
            .in("id", courseIds)
            .eq("status", "published");

          if (!coursesError && coursesData) {
            setCourses(coursesData);
          }
        }

        // Get related tags (tags that appear on the same posts)
        const { data: relatedTagsData, error: relatedTagsError } = await supabase
          .from("post_tags")
          .select("tag_id, tags:tag_id (id, name, slug)")
          .in("post_id", postIds)
          .neq("tag_id", tagData.id);

        if (!relatedTagsError && relatedTagsData) {
          // Count occurrences of each tag
          const tagCounts = new Map<string, { tag: RelatedTag; count: number }>();
          relatedTagsData.forEach(pt => {
            const tag = pt.tags as unknown as { id: string; name: string; slug: string };
            if (tag) {
              const existing = tagCounts.get(tag.id);
              if (existing) {
                existing.count++;
              } else {
                tagCounts.set(tag.id, { tag: { ...tag, count: 1 }, count: 1 });
              }
            }
          });
          
          const sortedTags = Array.from(tagCounts.values())
            .map(({ tag, count }) => ({ ...tag, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);
          
          setRelatedTags(sortedTags);
        }
      } else {
        setLessons([]);
        setCourses([]);
        setRelatedTags([]);
      }
    } catch (error) {
      console.error("Error fetching tag data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and group lessons
  const filteredLessons = useMemo(() => {
    return lessons.filter(lesson => {
      // Level filter
      if (levelFilter !== "all" && lesson.course?.level !== levelFilter) {
        return false;
      }
      // Search filter (using debounced value)
      if (debouncedSearchQuery.trim()) {
        const query = debouncedSearchQuery.toLowerCase();
        const matchesTitle = lesson.title.toLowerCase().includes(query);
        const matchesCourse = lesson.course?.name.toLowerCase().includes(query);
        if (!matchesTitle && !matchesCourse) {
          return false;
        }
      }
      return true;
    });
  }, [lessons, levelFilter, debouncedSearchQuery]);

  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      // Level filter
      if (levelFilter !== "all" && course.level !== levelFilter) {
        return false;
      }
      // Search filter (using debounced value)
      if (debouncedSearchQuery.trim()) {
        const query = debouncedSearchQuery.toLowerCase();
        const matchesName = course.name.toLowerCase().includes(query);
        const matchesDescription = course.description?.toLowerCase().includes(query);
        if (!matchesName && !matchesDescription) {
          return false;
        }
      }
      return true;
    });
  }, [courses, levelFilter, debouncedSearchQuery]);

  // Group lessons by course
  const lessonsByCourse = useMemo(() => {
    const grouped = new Map<string, { course: Course | null; lessons: Lesson[] }>();
    
    filteredLessons.forEach(lesson => {
      const courseId = lesson.course?.id || "uncategorized";
      const existing = grouped.get(courseId);
      
      if (existing) {
        existing.lessons.push(lesson);
      } else {
        const course = courses.find(c => c.id === courseId) || null;
        grouped.set(courseId, { course, lessons: [lesson] });
      }
    });
    
    return grouped;
  }, [filteredLessons, courses]);

  const toggleCourseExpansion = (courseId: string) => {
    setExpandedCourses(prev => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  };

  const getLevelColor = (level: string | null) => {
    switch (level) {
      case "Beginner":
        return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
      case "Intermediate":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "Advanced":
        return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const showLessons = contentFilter === "all" || contentFilter === "lessons";
  const showCourses = contentFilter === "all" || contentFilter === "courses";

  return (
    <Layout>
      <SEOHead 
        title={`Explore ${tagName} - Lessons & Courses`}
        description={`Discover lessons and courses related to ${tagName}. ${filteredLessons.length} lessons across ${filteredCourses.length} courses.`}
      />

      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container px-4 py-8 md:py-12">
          <div className="flex gap-8 max-w-6xl mx-auto">
            {/* Main Content */}
            <div className="flex-1 min-w-0">
            {/* Back Navigation */}
            <Link to="/courses">
              <Button variant="ghost" size="sm" className="mb-6 gap-2 text-muted-foreground hover:text-foreground -ml-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Courses
              </Button>
            </Link>

            {/* Header Section */}
            <header className="mb-8">
              <div className="flex items-start gap-4 mb-3">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  <Tag className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                        {loading ? <Skeleton className="h-8 w-48" /> : tagName}
                      </h1>
                      <p className="text-muted-foreground">
                        Explore lessons and courses related to {tagName}
                      </p>
                    </div>
                    {/* Bookmark Button */}
                    {!loading && tagId && (
                      <Button
                        variant={isBookmarked(tagId) ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          "gap-2 flex-shrink-0",
                          isBookmarked(tagId) && "bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500"
                        )}
                        onClick={async () => {
                          if (!user) {
                            toast.error("Please log in to bookmark tags");
                            return;
                          }
                          const result = await toggleBookmark({ id: tagId, name: tagName, slug: slug || "" });
                          if (result.success) {
                            toast.success(isBookmarked(tagId) ? "Tag removed from favorites" : "Tag added to favorites");
                          }
                        }}
                      >
                        <Bookmark className={cn("h-4 w-4", isBookmarked(tagId) && "fill-current")} />
                        {isBookmarked(tagId) ? "Saved" : "Save"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Result Summary */}
              {!loading && (
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-4">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4" />
                    {filteredLessons.length} lesson{filteredLessons.length !== 1 ? "s" : ""}
                  </span>
                  <span className="text-border">•</span>
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4" />
                    {filteredCourses.length} course{filteredCourses.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </header>

            {/* Search and Filter Controls */}
            {!loading && (lessons.length > 0 || courses.length > 0) && (
              <div className="space-y-4 mb-8">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search lessons and courses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-10 h-10"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap gap-3">
                {/* Content Type Filter */}
                <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
                  {(["all", "lessons", "courses"] as ContentFilter[]).map((filter) => (
                    <Button
                      key={filter}
                      variant="ghost"
                      size="sm"
                      onClick={() => setContentFilter(filter)}
                      className={cn(
                        "h-8 px-3 text-sm capitalize transition-all",
                        contentFilter === filter
                          ? "bg-background shadow-sm text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {filter}
                    </Button>
                  ))}
                </div>

                {/* Level Filter */}
                <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
                  {(["all", "Beginner", "Intermediate", "Advanced"] as LevelFilter[]).map((level) => (
                    <Button
                      key={level}
                      variant="ghost"
                      size="sm"
                      onClick={() => setLevelFilter(level)}
                      className={cn(
                        "h-8 px-3 text-sm transition-all",
                        levelFilter === level
                          ? "bg-background shadow-sm text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {level === "all" ? "All Levels" : level}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Live Search Result Count */}
              {(searchQuery || levelFilter !== "all" || contentFilter !== "all") && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    Showing{" "}
                    <span className="font-medium text-foreground">
                      {showLessons ? filteredLessons.length : 0}
                    </span>{" "}
                    of {lessons.length} lesson{lessons.length !== 1 ? "s" : ""}
                  </span>
                  <span className="text-border">•</span>
                  <span>
                    <span className="font-medium text-foreground">
                      {showCourses ? filteredCourses.length : 0}
                    </span>{" "}
                    of {courses.length} course{courses.length !== 1 ? "s" : ""}
                  </span>
                  {(searchQuery || levelFilter !== "all") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs ml-2"
                      onClick={() => {
                        setSearchQuery("");
                        setLevelFilter("all");
                        setContentFilter("all");
                      }}
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              )}
            </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="p-4">
                    <div className="flex items-start gap-4">
                      <Skeleton className="h-12 w-12 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!loading && lessons.length === 0 && courses.length === 0 && (
              <div className="text-center py-16">
                <div className="p-4 rounded-full bg-muted/50 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Tag className="h-8 w-8 text-muted-foreground" />
                </div>
                <h2 className="text-lg font-medium text-foreground mb-2">No lessons found for this tag yet</h2>
                <p className="text-muted-foreground mb-6">
                  Check back later or explore other topics
                </p>
                <Link to="/courses">
                  <Button>Browse Courses</Button>
                </Link>
              </div>
            )}

            {/* Results Section */}
            {!loading && (lessons.length > 0 || courses.length > 0) && (
              <div className="space-y-8">
                {/* Lessons Grouped by Course */}
                {showLessons && filteredLessons.length > 0 && (
                  <section>
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      Lessons
                    </h2>
                    
                    <div className="space-y-4">
                      {Array.from(lessonsByCourse.entries()).map(([courseId, { course, lessons: courseLessons }]) => {
                        const isExpanded = expandedCourses.has(courseId) || courseLessons.length <= 3;
                        const displayLessons = isExpanded ? courseLessons : courseLessons.slice(0, 3);
                        
                        return (
                          <div key={courseId} className="rounded-xl border border-border bg-card overflow-hidden">
                            {/* Course Header */}
                            {course && (
                              <div className="px-4 py-3 bg-muted/30 border-b border-border/50 flex items-center justify-between">
                                <Link 
                                  to={`/course/${course.slug}`}
                                  className="flex items-center gap-2 hover:text-primary transition-colors"
                                >
                                  <Layers className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium text-sm">{course.name}</span>
                                  {course.level && (
                                    <Badge variant="outline" className={cn("text-xs", getLevelColor(course.level))}>
                                      {course.level}
                                    </Badge>
                                  )}
                                </Link>
                                <span className="text-xs text-muted-foreground">
                                  {courseLessons.length} lesson{courseLessons.length !== 1 ? "s" : ""}
                                </span>
                              </div>
                            )}
                            
                            {/* Lessons List */}
                            <div className="divide-y divide-border/50">
                              {displayLessons.map((lesson) => (
                                <LessonCard 
                                  key={lesson.id} 
                                  lesson={lesson}
                                  getLevelColor={getLevelColor}
                                />
                              ))}
                            </div>
                            
                            {/* Expand/Collapse Button */}
                            {courseLessons.length > 3 && (
                              <button
                                onClick={() => toggleCourseExpansion(courseId)}
                                className="w-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors flex items-center justify-center gap-1"
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="h-4 w-4" />
                                    Show less
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="h-4 w-4" />
                                    Show {courseLessons.length - 3} more lesson{courseLessons.length - 3 !== 1 ? "s" : ""}
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Courses Section */}
                {showCourses && filteredCourses.length > 0 && (
                  <section>
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-primary" />
                      Courses
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredCourses.map((course) => (
                        <CourseCard 
                          key={course.id} 
                          course={course}
                          lessonCount={lessons.filter(l => l.course?.id === course.id).length}
                          getLevelColor={getLevelColor}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Related Tags */}
                {relatedTags.length > 0 && (
                  <section className="pt-4 border-t border-border">
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">Related Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {relatedTags.map((tag) => (
                        <Link key={tag.id} to={`/tag/${tag.slug}`}>
                          <Badge 
                            variant="secondary" 
                            className="hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                          >
                            <Tag className="h-3 w-3 mr-1" />
                            {tag.name}
                            <span className="ml-1.5 text-xs text-muted-foreground">({tag.count})</span>
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
            </div>

            {/* Sidebar - Popular Tags */}
            <aside className="hidden lg:block w-72 flex-shrink-0">
              <div className="sticky top-24 space-y-6">
                {/* Popular Tags Section */}
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 rounded-lg bg-orange-500/10">
                      <Flame className="h-4 w-4 text-orange-500" />
                    </div>
                    <h3 className="font-semibold text-foreground">Popular Tags</h3>
                  </div>
                  
                  {popularTags.length === 0 ? (
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-8 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {popularTags.map((tag, index) => (
                        <Link
                          key={tag.id}
                          to={`/tag/${tag.slug}`}
                          className={cn(
                            "flex items-center justify-between px-3 py-2 rounded-lg transition-colors",
                            slug === tag.slug
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-muted text-foreground"
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {index < 3 && (
                              <span className={cn(
                                "text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center",
                                index === 0 && "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400",
                                index === 1 && "bg-gray-400/20 text-gray-600 dark:text-gray-400",
                                index === 2 && "bg-orange-600/20 text-orange-600 dark:text-orange-400"
                              )}>
                                {index + 1}
                              </span>
                            )}
                            <Tag className={cn("h-3.5 w-3.5 flex-shrink-0", index >= 3 && "ml-5")} />
                            <span className="truncate text-sm">{tag.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                            {tag.postCount}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Browse All Tags Link */}
                <Link to="/tags">
                  <Button variant="outline" className="w-full gap-2">
                    <Tag className="h-4 w-4" />
                    Browse All Tags
                  </Button>
                </Link>

                {/* Trending Indicator */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>Based on lesson count</span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </Layout>
  );
};

// Compact Lesson Card Component
const LessonCard = ({ 
  lesson, 
  getLevelColor 
}: { 
  lesson: Lesson; 
  getLevelColor: (level: string | null) => string;
}) => {
  const readingTime = calculateReadingTime(lesson.content);
  
  return (
    <Link
      to={`/course/${lesson.course?.slug}?lesson=${lesson.slug}`}
      className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors group"
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
        <Play className="h-4 w-4 text-primary" />
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
          {lesson.title}
        </h3>
        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            ~{readingTime} min
          </span>
          {!lesson.course && (
            <span className="text-muted-foreground/60">Uncategorized</span>
          )}
        </div>
      </div>
      
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="sm" variant="ghost" className="h-8 px-3 text-xs">
          Open
        </Button>
      </div>
    </Link>
  );
};

// Course Card Component
const CourseCard = ({ 
  course, 
  lessonCount,
  getLevelColor 
}: { 
  course: Course; 
  lessonCount: number;
  getLevelColor: (level: string | null) => string;
}) => {
  return (
    <Link to={`/course/${course.slug}`}>
      <Card className="p-4 hover:shadow-md hover:border-primary/30 transition-all group h-full">
        <div className="flex gap-4">
          {course.featured_image ? (
            <img 
              src={course.featured_image} 
              alt={course.name}
              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                {course.name}
              </h3>
              {course.level && (
                <Badge variant="outline" className={cn("text-xs flex-shrink-0", getLevelColor(course.level))}>
                  {course.level}
                </Badge>
              )}
            </div>
            
            {course.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {course.description.replace(/<[^>]*>/g, '').slice(0, 100)}
              </p>
            )}
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5" />
              {lessonCount} tagged lesson{lessonCount !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default TagPosts;
