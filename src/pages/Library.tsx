import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { 
  BookOpen, 
  Clock, 
  Users, 
  Search, 
  Star, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  TrendingUp,
  Play,
  GraduationCap,
  Award,
  Library as LibraryIcon,
  ChevronDown,
  Trophy,
  CheckCircle2
} from "lucide-react";

interface CourseWithStats {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  featured_image: string | null;
  level: string | null;
  enrollmentCount: number;
  lessonCount: number;
  averageRating: number | null;
  progress?: number;
  authorName?: string;
  authorAvatar?: string;
  completedAt?: string;
}

interface Certificate {
  id: string;
  courseName: string;
  courseSlug: string;
  courseImage: string | null;
  completedAt: string;
  lessonCount: number;
}

const levelFilters = ["All", "Beginner", "Intermediate", "Advanced"];

const Library = () => {
  const [courses, setCourses] = useState<CourseWithStats[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<CourseWithStats[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [activeNav, setActiveNav] = useState("all-courses");
  const [userId, setUserId] = useState<string | null>(null);
  const [aiPicksExpanded, setAiPicksExpanded] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const { data: coursesData, error } = await supabase
          .from("courses")
          .select("*")
          .eq("status", "published")
          .order("name");

        if (error) throw error;

        const coursesWithStats = await Promise.all(
          (coursesData || []).map(async (course) => {
            const [{ count: enrollmentCount }, { count: lessonCount }, { data: reviews }] = await Promise.all([
              supabase
                .from("course_enrollments")
                .select("*", { count: "exact", head: true })
                .eq("course_id", course.id),
              supabase
                .from("posts")
                .select("*", { count: "exact", head: true })
                .eq("category_id", course.id),
              supabase
                .from("course_reviews")
                .select("rating")
                .eq("course_id", course.id),
            ]);

            const avgRating = reviews && reviews.length > 0
              ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
              : null;

            return {
              ...course,
              enrollmentCount: enrollmentCount || 0,
              lessonCount: lessonCount || 0,
              averageRating: avgRating,
              authorName: "Emojilearn Team",
              authorAvatar: undefined,
            };
          })
        );

        setCourses(coursesWithStats);

        if (userId) {
          const { data: enrollments } = await supabase
            .from("course_enrollments")
            .select("course_id, enrolled_at")
            .eq("user_id", userId);

          if (enrollments && enrollments.length > 0) {
            const enrolledIds = enrollments.map(e => e.course_id);
            const enrolled = coursesWithStats.filter(c => enrolledIds.includes(c.id));
            
            const enrolledWithProgress = await Promise.all(
              enrolled.map(async (course) => {
                const [{ count: completedLessons }, { count: totalLessons }] = await Promise.all([
                  supabase
                    .from("lesson_progress")
                    .select("*", { count: "exact", head: true })
                    .eq("course_id", course.id)
                    .eq("user_id", userId)
                    .eq("completed", true),
                  supabase
                    .from("posts")
                    .select("*", { count: "exact", head: true })
                    .eq("category_id", course.id),
                ]);
                
                const progress = totalLessons && totalLessons > 0 
                  ? Math.round(((completedLessons || 0) / totalLessons) * 100) 
                  : 0;
                
                return { ...course, progress };
              })
            );
            
            setEnrolledCourses(enrolledWithProgress);

            // Find completed courses (100% progress) for certificates
            const completedCourses = enrolledWithProgress
              .filter(c => c.progress === 100)
              .map(c => ({
                id: c.id,
                courseName: c.name,
                courseSlug: c.slug,
                courseImage: c.featured_image,
                completedAt: new Date().toISOString(),
                lessonCount: c.lessonCount,
              }));
            setCertificates(completedCourses);
          }
        }
      } catch (error) {
        console.error("Error fetching courses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [userId]);

  const filteredCourses = courses.filter((course) => {
    const matchesSearch = course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === "All" || course.level?.toLowerCase() === activeFilter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  const beginnerCourses = courses.filter(c => c.level?.toLowerCase() === "beginner").slice(0, 3);
  const recommendedCourses = filteredCourses.slice(0, 4);
  const popularCourses = [...filteredCourses].sort((a, b) => b.enrollmentCount - a.enrollmentCount).slice(0, 4);

  const estimatedHours = (lessonCount: number) => Math.max(1, Math.round((lessonCount * 15) / 60));

  const getLevelColor = (level: string | null) => {
    switch (level?.toLowerCase()) {
      case "beginner": return "bg-emerald-500/90 text-white";
      case "intermediate": return "bg-amber-500/90 text-white";
      case "advanced": return "bg-rose-500/90 text-white";
      default: return "bg-primary/90 text-primary-foreground";
    }
  };

  const navItems = [
    { id: "all-courses", label: "All Courses", icon: LibraryIcon },
    { id: "my-learning", label: "My Learning", icon: GraduationCap },
    { id: "certificates", label: "Certificates", icon: Award },
  ];

  const CourseCard = ({ course, showProgress = false }: { course: CourseWithStats; showProgress?: boolean }) => (
    <Card
      className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group border-0 shadow-md bg-card min-w-[280px] max-w-[320px] flex-shrink-0"
      onClick={() => navigate(`/course/${course.slug}`)}
    >
      <div className="h-44 relative overflow-hidden">
        {course.featured_image ? (
          <img
            src={course.featured_image}
            alt={course.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/20 to-accent/30 flex items-center justify-center">
            <BookOpen className="h-16 w-16 text-primary/50" />
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {showProgress && course.progress !== undefined && (
          <div className="absolute top-3 left-3 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
            {course.progress}%
          </div>
        )}
        
        {course.level && !showProgress && (
          <Badge className={`absolute top-3 left-3 ${getLevelColor(course.level)} border-0 shadow-lg`}>
            {course.level}
          </Badge>
        )}
        
        <button 
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/40 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-white text-lg">+</span>
        </button>
      </div>
      
      <CardContent className="p-4">
        <h3 className="font-semibold text-base mb-2 line-clamp-1 group-hover:text-primary transition-colors">
          {course.name}
        </h3>
        
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            {course.lessonCount}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {course.lessonCount} lessons
          </span>
          {course.averageRating && (
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {course.averageRating.toFixed(1)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {course.enrollmentCount > 1000 
              ? `${(course.enrollmentCount / 1000).toFixed(1)}k` 
              : course.enrollmentCount}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarImage src={course.authorAvatar} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {course.authorName?.charAt(0) || "E"}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate max-w-[80px]">
              {course.authorName || "Emojilearn"}
            </span>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs h-8 px-4 rounded-full hover:bg-primary hover:text-primary-foreground transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/course/${course.slug}`);
            }}
          >
            {showProgress ? "Continue" : "View"}
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const SectionHeader = ({ 
    title, 
    icon: Icon, 
    badge 
  }: { 
    title: string; 
    icon?: React.ComponentType<{ className?: string }>; 
    badge?: string;
  }) => (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        {Icon && <Icon className="h-5 w-5 text-primary" />}
        <h2 className="text-xl font-bold">{title}</h2>
        {badge && (
          <Badge variant="secondary" className="bg-primary/10 text-primary border-0 gap-1">
            <Sparkles className="h-3 w-3" />
            {badge}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  const SidebarCourseItem = ({ course }: { course: CourseWithStats }) => (
    <button
      onClick={() => navigate(`/course/${course.slug}`)}
      className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
    >
      <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
        <BookOpen className="h-4 w-4 text-primary" />
      </div>
      <span className="text-sm text-foreground/80 truncate">{course.name}</span>
    </button>
  );

  return (
    <Layout>
      <SEOHead
        title="Course Library | Browse All Courses"
        description="Explore our complete library of courses. Find the perfect course to advance your career."
      />
      
      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Left Sidebar */}
        <aside className="w-64 border-r border-border bg-muted/30 flex-shrink-0 hidden lg:block">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-8">
              {/* Navigation Links */}
              <nav className="space-y-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveNav(item.id)}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-all text-left ${
                      activeNav === item.id
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>

              {/* AI Picks Section */}
              <div>
                <button 
                  onClick={() => setAiPicksExpanded(!aiPicksExpanded)}
                  className="flex items-center gap-2 w-full mb-4 text-left"
                >
                  <div className="flex items-center gap-2 text-primary">
                    <Sparkles className="h-4 w-4" />
                    <span className="font-semibold text-sm">AI Picks</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground ml-auto transition-transform ${aiPicksExpanded ? "rotate-180" : ""}`} />
                </button>
                
                {aiPicksExpanded && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground px-2 mb-3">Beginner Friendly</p>
                    {beginnerCourses.length > 0 ? (
                      beginnerCourses.map((course) => (
                        <SidebarCourseItem key={course.id} course={course} />
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground px-2">No beginner courses yet</p>
                    )}
                  </div>
                )}
              </div>

              {/* Referenced Courses */}
              {enrolledCourses.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground px-2 mb-3 flex items-center gap-2">
                    <Award className="h-3 w-3" />
                    Recently Viewed
                  </p>
                  <div className="space-y-2">
                    {enrolledCourses.slice(0, 3).map((course) => (
                      <button
                        key={course.id}
                        onClick={() => navigate(`/course/${course.slug}`)}
                        className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                          {course.featured_image ? (
                            <img src={course.featured_image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                              <BookOpen className="h-4 w-4 text-primary" />
                            </div>
                          )}
                        </div>
                        <div className="text-left min-w-0">
                          <p className="text-xs font-medium truncate">{course.name}</p>
                          <p className="text-xs text-muted-foreground">{course.progress}% complete</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 lg:px-8 py-8 max-w-6xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
              <h1 className="text-3xl font-bold">
                {activeNav === "all-courses" && "Course Library"}
                {activeNav === "my-learning" && "My Learning"}
                {activeNav === "certificates" && "My Certificates"}
              </h1>
              
              {/* Search - hide on certificates */}
              {activeNav !== "certificates" && (
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search courses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-11 h-11 rounded-full bg-muted/50 border-0 focus-visible:ring-primary"
                  />
                </div>
              )}
            </div>

            {/* Filter Tabs - only show for all-courses */}
            {activeNav === "all-courses" && (
              <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
                {levelFilters.map((filter) => (
                  <Button
                    key={filter}
                    variant={activeFilter === filter ? "default" : "outline"}
                    size="sm"
                    className={`rounded-full px-6 transition-all ${
                      activeFilter === filter 
                        ? "bg-primary text-primary-foreground shadow-md" 
                        : "bg-muted/50 border-0 hover:bg-muted"
                    }`}
                    onClick={() => setActiveFilter(filter)}
                  >
                    {filter === "All" && "All ≡"}
                    {filter !== "All" && `› ${filter}`}
                  </Button>
                ))}
                <div className="flex items-center gap-2 ml-auto">
                  <Badge variant="outline" className="gap-1 px-3 py-1.5 rounded-full">
                    <Clock className="h-3 w-3 text-amber-500" />
                    24h
                  </Badge>
                </div>
              </div>
            )}

            {loading ? (
              <div className="space-y-12">
                {[...Array(3)].map((_, sectionIdx) => (
                  <div key={sectionIdx}>
                    <Skeleton className="h-8 w-48 mb-6" />
                    <div className="flex gap-6 overflow-hidden">
                      {[...Array(4)].map((_, i) => (
                        <Card key={i} className="min-w-[280px]">
                          <Skeleton className="h-44 rounded-t-lg" />
                          <CardContent className="p-4 space-y-2">
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-1/2" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* All Courses View */}
                {activeNav === "all-courses" && (
                  <div className="space-y-12">
                    {/* Continue Learning Section */}
                    {enrolledCourses.length > 0 && (
                      <section>
                        <SectionHeader title="Continue Learning" icon={Play} />
                        <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
                          {enrolledCourses.map((course) => (
                            <CourseCard key={course.id} course={course} showProgress />
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Recommended for You Section */}
                    <section>
                      <SectionHeader title="Recommended for You" icon={Sparkles} badge="AI Picks" />
                      <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
                        {recommendedCourses.length > 0 ? (
                          recommendedCourses.map((course) => (
                            <CourseCard key={course.id} course={course} />
                          ))
                        ) : (
                          <div className="text-center py-16 w-full">
                            <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">No courses found</h3>
                            <p className="text-muted-foreground">
                              {searchQuery ? "Try a different search term" : "Check back later for new courses"}
                            </p>
                          </div>
                        )}
                      </div>
                    </section>

                    {/* Popular This Week Section */}
                    {popularCourses.length > 0 && (
                      <section>
                        <SectionHeader title="Popular This Week" icon={TrendingUp} />
                        <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
                          {popularCourses.map((course) => (
                            <CourseCard key={course.id} course={course} />
                          ))}
                        </div>
                      </section>
                    )}

                    {/* All Courses Grid */}
                    {filteredCourses.length > 0 && (
                      <section>
                        <h2 className="text-xl font-bold mb-6">All Courses</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                          {filteredCourses.map((course) => (
                            <Card
                              key={course.id}
                              className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group border-0 shadow-md"
                              onClick={() => navigate(`/course/${course.slug}`)}
                            >
                              <div className="h-44 relative overflow-hidden">
                                {course.featured_image ? (
                                  <img
                                    src={course.featured_image}
                                    alt={course.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/20 to-accent/30 flex items-center justify-center">
                                    <BookOpen className="h-16 w-16 text-primary/50" />
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                {course.level && (
                                  <Badge className={`absolute top-3 left-3 ${getLevelColor(course.level)} border-0 shadow-lg`}>
                                    {course.level}
                                  </Badge>
                                )}
                              </div>
                              <CardContent className="p-4">
                                <h3 className="font-semibold text-base mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                                  {course.name}
                                </h3>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                                  <span className="flex items-center gap-1">
                                    <BookOpen className="h-3.5 w-3.5" />
                                    {course.lessonCount}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" />
                                    {estimatedHours(course.lessonCount)}h
                                  </span>
                                  {course.averageRating && (
                                    <span className="flex items-center gap-1">
                                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                      {course.averageRating.toFixed(1)}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Users className="h-3.5 w-3.5" />
                                    {course.enrollmentCount} enrolled
                                  </span>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                )}

                {/* My Learning View */}
                {activeNav === "my-learning" && (
                  <div className="space-y-8">
                    {!userId ? (
                      <div className="text-center py-16">
                        <GraduationCap className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">Sign in to track your learning</h3>
                        <p className="text-muted-foreground mb-6">
                          Create an account to enroll in courses and track your progress
                        </p>
                        <Button onClick={() => navigate("/auth")}>Sign In</Button>
                      </div>
                    ) : enrolledCourses.length === 0 ? (
                      <div className="text-center py-16">
                        <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No courses yet</h3>
                        <p className="text-muted-foreground mb-6">
                          Start learning by enrolling in a course
                        </p>
                        <Button onClick={() => setActiveNav("all-courses")}>Browse Courses</Button>
                      </div>
                    ) : (
                      <>
                        {/* In Progress */}
                        <section>
                          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Play className="h-5 w-5 text-primary" />
                            In Progress ({enrolledCourses.filter(c => (c.progress || 0) < 100).length})
                          </h2>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {enrolledCourses
                              .filter(c => (c.progress || 0) < 100)
                              .map((course) => (
                                <CourseCard key={course.id} course={course} showProgress />
                              ))}
                          </div>
                        </section>

                        {/* Completed */}
                        {enrolledCourses.filter(c => c.progress === 100).length > 0 && (
                          <section>
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                              Completed ({enrolledCourses.filter(c => c.progress === 100).length})
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                              {enrolledCourses
                                .filter(c => c.progress === 100)
                                .map((course) => (
                                  <CourseCard key={course.id} course={course} showProgress />
                                ))}
                            </div>
                          </section>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Certificates View */}
                {activeNav === "certificates" && (
                  <div className="space-y-8">
                    {!userId ? (
                      <div className="text-center py-16">
                        <Award className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">Sign in to view certificates</h3>
                        <p className="text-muted-foreground mb-6">
                          Complete courses to earn certificates
                        </p>
                        <Button onClick={() => navigate("/auth")}>Sign In</Button>
                      </div>
                    ) : certificates.length === 0 ? (
                      <div className="text-center py-16">
                        <Trophy className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No certificates yet</h3>
                        <p className="text-muted-foreground mb-6">
                          Complete a course to earn your first certificate
                        </p>
                        <Button onClick={() => setActiveNav("all-courses")}>Start Learning</Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {certificates.map((cert) => (
                          <Card
                            key={cert.id}
                            className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group border-0 shadow-md bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/10"
                            onClick={() => navigate(`/course/${cert.courseSlug}`)}
                          >
                            <div className="p-6 text-center">
                              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
                                <Award className="h-10 w-10 text-white" />
                              </div>
                              <Badge className="bg-emerald-500 text-white border-0 mb-3">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Completed
                              </Badge>
                              <h3 className="font-semibold text-lg mb-2">{cert.courseName}</h3>
                              <p className="text-sm text-muted-foreground mb-4">
                                {cert.lessonCount} lessons completed
                              </p>
                              <div className="pt-4 border-t border-amber-200 dark:border-amber-800">
                                <p className="text-xs text-muted-foreground">
                                  Certificate of Completion
                                </p>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </Layout>
  );
};

export default Library;
