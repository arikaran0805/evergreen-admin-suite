import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useBookmarks } from "@/hooks/useBookmarks";
import { CourseProgressDisplay } from "@/components/CourseProgressDisplay";
import { CareerPath, getCareerPath } from "@/components/CareerPathSelector";
import { CareerReadinessCard } from "@/components/CareerReadinessCard";
import { CareerSelectionDialog } from "@/components/CareerSelectionDialog";
import { WeeklyActivityTracker } from "@/components/WeeklyActivityTracker";
import Layout from "@/components/Layout";
import { z } from "zod";
import { 
  LayoutDashboard, 
  BookOpen, 
  Bookmark, 
  BookmarkX,
  MessageSquare, 
  Settings, 
  Award,
  Clock,
  TrendingUp,
  Star,
  ChevronRight,
  User,
  Bell,
  Shield,
  LogOut,
  FileText,
  Sparkles,
  Target
} from "lucide-react";

const profileSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  avatar_url: z.string().trim().url("Must be a valid URL").optional().or(z.literal("")),
});

const passwordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type TabType = 'dashboard' | 'learnings' | 'bookmarks' | 'discussions' | 'achievements' | 'notifications' | 'settings';

const sidebarItems = [
  { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'learnings' as TabType, label: 'My Learnings', icon: BookOpen },
  { id: 'bookmarks' as TabType, label: 'Bookmarks', icon: Bookmark },
  { id: 'discussions' as TabType, label: 'Discussions', icon: MessageSquare },
  { id: 'achievements' as TabType, label: 'Achievements', icon: Award },
  { id: 'notifications' as TabType, label: 'Notifications', icon: Bell },
  { id: 'settings' as TabType, label: 'Settings', icon: Settings },
];

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [completedCourseSlugs, setCompletedCourseSlugs] = useState<string[]>([]);
  const [selectedCareer, setSelectedCareer] = useState<CareerPath>('data-science');
  const [careerDialogOpen, setCareerDialogOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { bookmarks, loading: bookmarksLoading, toggleBookmark } = useBookmarks();

  useEffect(() => {
    const tab = searchParams.get('tab') as TabType;
    if (tab && sidebarItems.some(item => item.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Fetch profile data
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error) throw error;

      if (profile) {
        setFullName(profile.full_name || "");
        setAvatarUrl(profile.avatar_url || "");
        setEmail(profile.email);
        setUserId(session.user.id);
        // Load saved career path
        if ((profile as any).selected_career) {
          setSelectedCareer((profile as any).selected_career as CareerPath);
        }
      }

      // Fetch enrolled courses
      const { data: enrollments } = await supabase
        .from("course_enrollments")
        .select(`
          *,
          courses:course_id (
            id,
            name,
            slug,
            description,
            featured_image,
            level
          )
        `)
        .eq("user_id", session.user.id);

      if (enrollments) {
        setEnrolledCourses(enrollments);
      }

      // Fetch all courses for recommendations
      const { data: courses } = await supabase
        .from("courses")
        .select("id, name, slug, description, featured_image, level");

      if (courses) {
        setAllCourses(courses);
      }

      // Fetch lesson progress to determine completed courses
      const { data: lessonProgress } = await supabase
        .from("lesson_progress")
        .select("course_id, completed")
        .eq("user_id", session.user.id)
        .eq("completed", true);

      // Fetch lesson counts per course
      const { data: courseLessons } = await supabase
        .from("posts")
        .select("id, category_id");

      if (lessonProgress && courseLessons && courses) {
        // Count lessons per course
        const lessonCountByCourse: Record<string, number> = {};
        courseLessons.forEach(lesson => {
          if (lesson.category_id) {
            lessonCountByCourse[lesson.category_id] = (lessonCountByCourse[lesson.category_id] || 0) + 1;
          }
        });

        // Count completed lessons per course
        const completedByCourse: Record<string, number> = {};
        lessonProgress.forEach(progress => {
          completedByCourse[progress.course_id] = (completedByCourse[progress.course_id] || 0) + 1;
        });

        // Determine which courses are completed (all lessons done)
        const completed = courses
          .filter(course => {
            const total = lessonCountByCourse[course.id] || 0;
            const done = completedByCourse[course.id] || 0;
            return total > 0 && done >= total;
          })
          .map(course => course.slug);

        setCompletedCourseSlugs(completed);
      }
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

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validated = profileSchema.parse({
        full_name: fullName,
        avatar_url: avatarUrl,
      });

      setUpdating(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: validated.full_name,
          avatar_url: validated.avatar_url || null,
        })
        .eq("id", session.user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
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
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setUpdating(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = passwordSchema.parse({
        newPassword,
        confirmPassword,
      });

      setUpdating(true);

      const { error } = await supabase.auth.updateUser({
        password: validated.newPassword,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Password updated successfully",
      });

      setNewPassword("");
      setConfirmPassword("");
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
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleCareerSelect = async (career: CareerPath) => {
    setSelectedCareer(career);
    
    // Save to database
    if (userId) {
      const { error } = await supabase
        .from("profiles")
        .update({ selected_career: career } as any)
        .eq("id", userId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to save career preference",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Career Updated",
          description: `Your career path has been set to ${getCareerPath(career)?.label}`,
        });
      }
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <p className="text-center">Loading...</p>
        </div>
      </Layout>
    );
  }

  // Get career-related data
  const currentCareer = getCareerPath(selectedCareer);
  const careerRelatedSlugs = currentCareer?.relatedSlugs || [];
  
  const enrolledInCareer = enrolledCourses.filter(e => 
    careerRelatedSlugs.includes(e.courses?.slug)
  ).length;
  
  const recommendedCourses = allCourses.filter(course => 
    careerRelatedSlugs.includes(course.slug) && 
    !enrolledCourses.some(e => e.courses?.id === course.id)
  );

  const careerEnrolledCourses = enrolledCourses.filter(e => 
    careerRelatedSlugs.includes(e.courses?.slug)
  );

  // Calculate completed courses for the career path
  const careerCompletedSlugs = completedCourseSlugs.filter(slug => 
    careerRelatedSlugs.includes(slug)
  );
  const completedInCareer = careerCompletedSlugs.length;

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Top Section: Welcome + Career Readiness */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Welcome Section - Left */}
        <div className="lg:col-span-3 space-y-4">
          <div className="p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-xl border">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 border-2 border-primary ring-4 ring-primary/10">
                <AvatarImage src={avatarUrl} alt={fullName} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                  {fullName?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-primary">Welcome back!</span>
                </div>
                <h2 className="text-2xl font-bold text-foreground">{fullName || 'Learner'}</h2>
                <p className="text-muted-foreground mt-1">Continue your {currentCareer?.label} journey</p>
              </div>
            </div>
          </div>

          {/* Weekly Activity Tracker */}
          <WeeklyActivityTracker />
        </div>

        {/* Career Readiness - Right */}
        <div className="lg:col-span-2">
          <CareerReadinessCard
            selectedCareer={selectedCareer}
            completedCourses={completedInCareer}
            totalRequiredCourses={careerRelatedSlugs.length}
            enrolledInCareer={enrolledInCareer}
            completedCourseSlugs={careerCompletedSlugs}
            onGetStarted={() => setCareerDialogOpen(true)}
          />
          <CareerSelectionDialog
            open={careerDialogOpen}
            onOpenChange={setCareerDialogOpen}
            selectedCareer={selectedCareer}
            onCareerSelect={handleCareerSelect}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{enrolledCourses.length}</p>
              <p className="text-sm text-muted-foreground">Total Enrolled</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-lg bg-green-500/10">
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{enrolledInCareer}</p>
              <p className="text-sm text-muted-foreground">In Career Path</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-lg bg-yellow-500/10">
              <Clock className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">0h</p>
              <p className="text-sm text-muted-foreground">Learning Time</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-lg bg-purple-500/10">
              <Award className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-sm text-muted-foreground">Achievements</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommended for Career Path */}
      {recommendedCourses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Recommended for {currentCareer?.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {recommendedCourses.map((course) => (
                <div 
                  key={course.id}
                  className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/course/${course.slug}`)}
                >
                  <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                    {course.featured_image ? (
                      <img 
                        src={course.featured_image} 
                        alt={course.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{course.name}</h4>
                    <Badge variant="secondary" className="text-xs mt-1">
                      {course.level || 'Beginner'}
                    </Badge>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Continue Learning - Career Specific */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Continue Learning
          </CardTitle>
        </CardHeader>
        <CardContent>
          {careerEnrolledCourses.length > 0 ? (
            <div className="space-y-4">
              {careerEnrolledCourses.slice(0, 3).map((enrollment) => (
                <div 
                  key={enrollment.id}
                  className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/course/${enrollment.courses?.slug}`)}
                >
                  <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                    {enrollment.courses?.featured_image ? (
                      <img 
                        src={enrollment.courses.featured_image} 
                        alt={enrollment.courses.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{enrollment.courses?.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {enrollment.courses?.level || 'Beginner'}
                      </Badge>
                    </div>
                    {userId && enrollment.courses?.id && (
                      <CourseProgressDisplay 
                        courseId={enrollment.courses.id} 
                        userId={userId} 
                        className="mt-2"
                      />
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              ))}
            </div>
          ) : enrolledCourses.length > 0 ? (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No courses enrolled for {currentCareer?.label} path yet.</p>
              <Button className="mt-4" onClick={() => setCareerDialogOpen(true)}>
                Getting Started
              </Button>
              <CareerSelectionDialog
                open={careerDialogOpen}
                onOpenChange={setCareerDialogOpen}
                selectedCareer={selectedCareer}
                onCareerSelect={handleCareerSelect}
              />
            </div>
          ) : (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">You haven't enrolled in any courses yet.</p>
              <Button className="mt-4" onClick={() => setCareerDialogOpen(true)}>
                Getting Started
              </Button>
              <CareerSelectionDialog
                open={careerDialogOpen}
                onOpenChange={setCareerDialogOpen}
                selectedCareer={selectedCareer}
                onCareerSelect={handleCareerSelect}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderLearnings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">My Learnings</h2>
        <Badge variant="secondary">{enrolledCourses.length} Courses</Badge>
      </div>
      
      {enrolledCourses.length > 0 ? (
        <div className="grid gap-4">
          {enrolledCourses.map((enrollment) => (
            <Card 
              key={enrollment.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/course/${enrollment.courses?.slug}`)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-20 h-20 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                  {enrollment.courses?.featured_image ? (
                    <img 
                      src={enrollment.courses.featured_image} 
                      alt={enrollment.courses.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">{enrollment.courses?.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {enrollment.courses?.description || 'No description available'}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <Badge variant="outline">{enrollment.courses?.level || 'Beginner'}</Badge>
                    <span className="text-xs text-muted-foreground">
                      Enrolled {new Date(enrollment.enrolled_at).toLocaleDateString()}
                    </span>
                  </div>
                  {userId && enrollment.courses?.id && (
                    <CourseProgressDisplay 
                      courseId={enrollment.courses.id} 
                      userId={userId} 
                      className="mt-3"
                    />
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No courses yet</h3>
            <p className="text-muted-foreground mb-4">Start your learning journey by enrolling in a course.</p>
            <Button onClick={() => navigate('/courses')}>Explore Courses</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderBookmarks = () => {
    const courseBookmarks = bookmarks.filter(b => b.course_id);
    const lessonBookmarks = bookmarks.filter(b => b.post_id);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Bookmarks</h2>
          <Badge variant="secondary">{bookmarks.length} Saved</Badge>
        </div>
        
        {bookmarksLoading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading bookmarks...</p>
          </div>
        ) : bookmarks.length > 0 ? (
          <div className="space-y-6">
            {/* Course Bookmarks */}
            {courseBookmarks.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Courses ({courseBookmarks.length})
                </h3>
                <div className="grid gap-4">
                  {courseBookmarks.map((bookmark) => (
                    <Card 
                      key={bookmark.id}
                      className="hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <div 
                          className="w-16 h-16 rounded-lg bg-muted overflow-hidden flex-shrink-0 cursor-pointer"
                          onClick={() => navigate(`/course/${bookmark.courses?.slug}`)}
                        >
                          {bookmark.courses?.featured_image ? (
                            <img 
                              src={bookmark.courses.featured_image} 
                              alt={bookmark.courses.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <BookOpen className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => navigate(`/course/${bookmark.courses?.slug}`)}
                        >
                          <h4 className="font-semibold truncate">{bookmark.courses?.name}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {bookmark.courses?.description || 'No description'}
                          </p>
                          <Badge variant="outline" className="mt-1">
                            {bookmark.courses?.level || 'Beginner'}
                          </Badge>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => toggleBookmark(bookmark.course_id || undefined)}
                          className="flex-shrink-0"
                        >
                          <BookmarkX className="h-5 w-5 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Lesson Bookmarks */}
            {lessonBookmarks.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Lessons ({lessonBookmarks.length})
                </h3>
                <div className="grid gap-4">
                  {lessonBookmarks.map((bookmark) => (
                    <Card 
                      key={bookmark.id}
                      className="hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <div 
                          className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 cursor-pointer"
                          onClick={() => navigate(`/course/${bookmark.posts?.courses?.slug}?lesson=${bookmark.posts?.slug}`)}
                        >
                          <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => navigate(`/course/${bookmark.posts?.courses?.slug}?lesson=${bookmark.posts?.slug}`)}
                        >
                          <h4 className="font-semibold truncate">{bookmark.posts?.title}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {bookmark.posts?.excerpt || 'No description'}
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => toggleBookmark(undefined, bookmark.post_id || undefined)}
                          className="flex-shrink-0"
                        >
                          <BookmarkX className="h-5 w-5 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Bookmark className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No bookmarks yet</h3>
              <p className="text-muted-foreground mb-4">Save lessons and courses for quick access.</p>
              <Button onClick={() => navigate('/courses')}>Browse Courses</Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderDiscussions = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">My Discussions</h2>
      <Card>
        <CardContent className="text-center py-12">
          <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No discussions yet</h3>
          <p className="text-muted-foreground">Join the conversation by commenting on lessons.</p>
        </CardContent>
      </Card>
    </div>
  );

  const renderAchievements = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Achievements</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { name: 'First Steps', desc: 'Complete your first lesson', locked: true },
          { name: 'Enrolled', desc: 'Enroll in your first course', locked: enrolledCourses.length === 0 },
          { name: 'Bookworm', desc: 'Complete 5 courses', locked: true },
          { name: 'Discussion Star', desc: 'Leave 10 comments', locked: true },
        ].map((achievement, index) => (
          <Card key={index} className={achievement.locked ? 'opacity-50' : ''}>
            <CardContent className="p-4 text-center">
              <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2 ${achievement.locked ? 'bg-muted' : 'bg-primary/10'}`}>
                <Award className={`h-6 w-6 ${achievement.locked ? 'text-muted-foreground' : 'text-primary'}`} />
              </div>
              <h4 className="font-medium text-sm">{achievement.name}</h4>
              <p className="text-xs text-muted-foreground mt-1">{achievement.desc}</p>
              {!achievement.locked && <Badge className="mt-2" variant="secondary">Unlocked</Badge>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Notifications</h2>
      <Card>
        <CardContent className="text-center py-12">
          <Bell className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No notifications</h3>
          <p className="text-muted-foreground">You're all caught up!</p>
        </CardContent>
      </Card>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Settings</h2>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <CardTitle>Profile Information</CardTitle>
          </div>
          <CardDescription>Update your account details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatarUrl} alt={fullName} />
                <AvatarFallback className="text-2xl">
                  {fullName?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium">{fullName || 'User'}</h3>
                <p className="text-sm text-muted-foreground">{email}</p>
              </div>
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
            </div>

            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div>
              <Label htmlFor="avatarUrl">Avatar URL</Label>
              <Input
                id="avatarUrl"
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>

            <Button type="submit" disabled={updating}>
              {updating ? "Updating..." : "Update Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password Change */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>Security</CardTitle>
          </div>
          <CardDescription>Update your password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
              />
            </div>

            <Button type="submit" disabled={updating}>
              {updating ? "Updating..." : "Change Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Logout */}
      <Card className="border-destructive/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Sign Out</h3>
              <p className="text-sm text-muted-foreground">Sign out of your account</p>
            </div>
            <Button variant="destructive" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return renderDashboard();
      case 'learnings': return renderLearnings();
      case 'bookmarks': return renderBookmarks();
      case 'discussions': return renderDiscussions();
      case 'achievements': return renderAchievements();
      case 'notifications': return renderNotifications();
      case 'settings': return renderSettings();
      default: return renderDashboard();
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-64 flex-shrink-0">
            <Card className="sticky top-28">
              <CardContent className="p-2">
                {/* Profile Summary */}
                <div className="p-4 text-center border-b mb-2">
                  <Avatar className="h-16 w-16 mx-auto mb-3">
                    <AvatarImage src={avatarUrl} alt={fullName} />
                    <AvatarFallback className="text-xl">
                      {fullName?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold truncate">{fullName || 'User'}</h3>
                  <p className="text-sm text-muted-foreground truncate">{email}</p>
                </div>
                
                {/* Navigation */}
                <nav className="space-y-1">
                  {sidebarItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleTabChange(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-colors ${
                        activeTab === item.id 
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {renderContent()}
          </main>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
