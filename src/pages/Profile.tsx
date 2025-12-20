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
import { useCareers } from "@/hooks/useCareers";
import { CareerReadinessCard } from "@/components/CareerReadinessCard";
import { SkillMilestones } from "@/components/SkillMilestones";
import { CareerSelectionDialog } from "@/components/CareerSelectionDialog";
import { WeeklyActivityTracker } from "@/components/WeeklyActivityTracker";
import { ContinueLearningCard } from "@/components/ContinueLearningCard";
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
  Target,
  Flame,
  Trophy,
  Snowflake,
  Zap
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

// OngoingCourseCard component for the learnings section
const OngoingCourseCard = ({ 
  course, 
  userId, 
  onClick 
}: { 
  course: any; 
  userId: string | null;
  onClick: () => void;
}) => {
  const [progress, setProgress] = useState({ completed: 0, total: 0 });

  useEffect(() => {
    const fetchProgress = async () => {
      if (!course?.id || !userId) return;

      const { count: totalLessons } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', course.id)
        .eq('status', 'published');

      const { count: completedLessons } = await supabase
        .from('lesson_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('course_id', course.id)
        .eq('completed', true);

      setProgress({
        completed: completedLessons || 0,
        total: totalLessons || 0,
      });
    };

    fetchProgress();
  }, [course?.id, userId]);

  const progressPercent = progress.total > 0 
    ? (progress.completed / progress.total) * 100 
    : 0;

  return (
    <Card 
      className="bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden shrink-0">
            {course?.featured_image ? (
              <img 
                src={course.featured_image} 
                alt={course?.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <BookOpen className="h-8 w-8 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-foreground truncate">{course?.name}</h4>
            <Progress value={progressPercent} className="h-2 mt-2" />
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">Total Progress</span>
              <span className="text-sm font-medium">
                <span className="text-foreground">{progress.completed}</span>
                <span className="text-muted-foreground"> / {progress.total}</span>
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// FeaturedCourseCard component for the learnings section
const FeaturedCourseCard = ({ 
  course, 
  gradient,
  onClick 
}: { 
  course: any;
  gradient: string;
  onClick: () => void;
}) => {
  const [lessonCount, setLessonCount] = useState(0);

  useEffect(() => {
    const fetchLessonCount = async () => {
      if (!course?.id) return;

      const { count } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', course.id)
        .eq('status', 'published');

      setLessonCount(count || 0);
    };

    fetchLessonCount();
  }, [course?.id]);

  // Estimate hours (avg 15 min per lesson)
  const estimatedHours = Math.max(1, Math.round((lessonCount * 15) / 60));

  return (
    <Card 
      className={`bg-gradient-to-br ${gradient} border-0 text-white cursor-pointer hover:scale-[1.02] transition-transform`}
      onClick={onClick}
    >
      <CardContent className="p-5 h-44 flex flex-col justify-between">
        <div>
          <h4 className="font-bold text-lg">{course.name}</h4>
          <div className="flex items-center gap-4 mt-2 text-sm text-white/80">
            <span className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              {lessonCount} Lessons
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {estimatedHours}h
            </span>
          </div>
        </div>
        <div className="flex justify-end">
          <BookOpen className="h-12 w-12 text-white/30" />
        </div>
      </CardContent>
    </Card>
  );
};

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
  const [selectedCareer, setSelectedCareer] = useState<string>('data-science');
  const [careerDialogOpen, setCareerDialogOpen] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [streakFreezesAvailable, setStreakFreezesAvailable] = useState(2);
  const [isFreezingStreak, setIsFreezingStreak] = useState(false);
  const [weeklyActivityData, setWeeklyActivityData] = useState<{totalMinutes: number, activeDays: number, dailyData: Record<string, number>}>({totalMinutes: 0, activeDays: 0, dailyData: {}});
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { bookmarks, loading: bookmarksLoading, toggleBookmark } = useBookmarks();
  const { getCareerBySlug, getCareerCourseSlugs, getCareerSkills } = useCareers();

  useEffect(() => {
    const tab = searchParams.get('tab') as TabType;
    if (tab && sidebarItems.some(item => item.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    checkUser();
  }, []);

  // Fetch weekly activity data
  useEffect(() => {
    const fetchWeeklyActivity = async () => {
      if (!userId) return;
      
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      
      const { data: timeData } = await supabase
        .from('lesson_time_tracking')
        .select('tracked_date, duration_seconds')
        .eq('user_id', userId)
        .gte('tracked_date', weekStart.toISOString().split('T')[0]);
        
      if (timeData) {
        const dailyTotals = new Map<string, number>();
        timeData.forEach(record => {
          const existing = dailyTotals.get(record.tracked_date) || 0;
          dailyTotals.set(record.tracked_date, existing + record.duration_seconds);
        });
        
        let total = 0;
        const dailyData: Record<string, number> = {};
        dailyTotals.forEach((seconds, date) => {
          const minutes = Math.floor(seconds / 60);
          total += minutes;
          dailyData[date] = minutes;
        });
        
        setWeeklyActivityData({
          totalMinutes: total,
          activeDays: dailyTotals.size,
          dailyData
        });
      }
    };
    
    fetchWeeklyActivity();
  }, [userId]);

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
          setSelectedCareer((profile as any).selected_career as string);
        }
        // Load streak data
        setCurrentStreak((profile as any).current_streak || 0);
        setMaxStreak((profile as any).max_streak || 0);
        setStreakFreezesAvailable((profile as any).streak_freezes_available ?? 2);
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

      // Fetch lesson counts per course (only published lessons count)
      const { data: courseLessons } = await supabase
        .from("posts")
        .select("id, category_id")
        .eq("status", "published");

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

  const useStreakFreeze = async () => {
    if (!userId || streakFreezesAvailable <= 0 || isFreezingStreak) return;

    setIsFreezingStreak(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('profiles')
        .update({
          streak_freezes_available: streakFreezesAvailable - 1,
          streak_freezes_used: (await supabase.from('profiles').select('streak_freezes_used').eq('id', userId).single()).data?.streak_freezes_used + 1 || 1,
          last_freeze_date: today,
          last_activity_date: today, // Counts as activity to preserve streak
        })
        .eq('id', userId);

      if (error) throw error;

      setStreakFreezesAvailable(prev => prev - 1);
      toast({
        title: "Streak Frozen! ❄️",
        description: "Your streak is protected for today. You won't lose your progress!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to use streak freeze",
        variant: "destructive",
      });
    } finally {
      setIsFreezingStreak(false);
    }
  };

  const handleCareerSelect = async (careerSlug: string) => {
    setSelectedCareer(careerSlug);
    
    // Save to database
    if (userId) {
      const { error } = await supabase
        .from("profiles")
        .update({ selected_career: careerSlug } as any)
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
          description: `Your career path has been updated`,
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

  // Get career course slugs from database
  const career = getCareerBySlug(selectedCareer);
  const careerRelatedSlugs = career ? getCareerCourseSlugs(career.id) : [];
  
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
  const avgMinutesPerDay = weeklyActivityData.activeDays > 0 
    ? Math.round(weeklyActivityData.totalMinutes / weeklyActivityData.activeDays) 
    : 0;

  // Get skills and readiness percentage for the career
  const skills = career ? getCareerSkills(career.id) : [];
  const readinessPercentage = careerRelatedSlugs.length > 0 
    ? Math.round((completedInCareer / careerRelatedSlugs.length) * 100) 
    : 0;

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Top Header Card - Welcome + Career + Streak + Stats */}
      <Card className="bg-card border">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-8">
            {/* Welcome Section */}
            <div className="flex items-center gap-4 flex-1">
              <Avatar className="h-16 w-16 border-4 border-primary/20">
                <AvatarImage src={avatarUrl} alt={fullName} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                  {fullName?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm text-muted-foreground">Welcome back!</p>
                <h2 className="text-2xl font-bold text-foreground">{fullName || 'Learner'}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground">
                    Aspiring {career?.name || 'Data Analyst'}
                  </span>
                </div>
              </div>
            </div>

            {/* Streak Badge */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/50 border">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Flame className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Streak</p>
                <p className="text-lg font-bold">{currentStreak} Day{currentStreak !== 1 ? 's' : ''}</p>
              </div>
            </div>

            {/* Divider */}
            <Separator orientation="vertical" className="h-16 hidden lg:block" />

            {/* Quick Stats */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center">
                  <Flame className="h-5 w-5 text-rose-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Streak</p>
                  <p className="text-lg font-bold">{currentStreak} Day{currentStreak !== 1 ? 's' : ''}</p>
                </div>
              </div>

              <div className="text-center">
                <p className="text-lg font-bold">{avgMinutesPerDay}</p>
                <p className="text-xs text-muted-foreground">min/day</p>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary">
                <Target className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {readinessPercentage >= 80 ? 'Job Ready' : 'Learning'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Career Readiness - Takes 2 columns */}
        <Card className="lg:col-span-2 bg-card border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold">Career Readiness</h3>
                <p className="text-sm text-muted-foreground">Your progress toward becoming job-ready</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-1 text-primary"
                onClick={() => setCareerDialogOpen(true)}
              >
                <Zap className="h-4 w-4" />
                {readinessPercentage >= 80 ? 'Job Ready' : readinessPercentage >= 50 ? 'Intermediate' : 'Beginner'}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Skill Progress Bars */}
              <div className="space-y-5">
                {skills.slice(0, 4).map((skill, index) => {
                  // Calculate skill progress based on completed courses
                  const skillProgress = Math.min(Math.round((completedInCareer / Math.max(careerRelatedSlugs.length, 1)) * 100 * (1 - index * 0.2)), 100);
                  
                  const skillIcons = [
                    { icon: '🐍', color: 'bg-green-500' },
                    { icon: '💾', color: 'bg-blue-500' },
                    { icon: '📊', color: 'bg-yellow-500' },
                    { icon: '📁', color: 'bg-purple-500' },
                  ];
                  
                  return (
                    <div key={skill.id} className="group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{skillIcons[index]?.icon || '📚'}</span>
                          <span className="font-medium">{skill.skill_name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-semibold">{skillProgress}%</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                      <Progress 
                        value={skillProgress} 
                        className="h-2.5"
                      />
                    </div>
                  );
                })}
                
                {skills.length === 0 && (
                  <>
                    {['Python', 'SQL', 'Statistics', 'Projects'].map((name, index) => (
                      <div key={name} className="group">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{'🐍💾📊📁'.split('')[index] || '📚'}</span>
                            <span className="font-medium">{name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-semibold">{(4 - index) * 20}%</span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                        <Progress value={(4 - index) * 20} className="h-2.5" />
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Circular Progress Gauge */}
              <div className="flex flex-col items-center justify-center">
                <div className="relative">
                  <svg className="w-48 h-48 transform -rotate-90">
                    {/* Background circle */}
                    <circle
                      cx="96"
                      cy="96"
                      r="80"
                      stroke="hsl(var(--muted))"
                      strokeWidth="16"
                      fill="none"
                    />
                    {/* Progress circle */}
                    <circle
                      cx="96"
                      cy="96"
                      r="80"
                      stroke="hsl(var(--primary))"
                      strokeWidth="16"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${(readinessPercentage / 100) * 502.65} 502.65`}
                      className="transition-all duration-1000 ease-out"
                    />
                    {/* Accent arc */}
                    <circle
                      cx="96"
                      cy="96"
                      r="80"
                      stroke="hsl(45 93% 47%)"
                      strokeWidth="16"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${Math.min(readinessPercentage * 0.3, 30) / 100 * 502.65} 502.65`}
                      strokeDashoffset={`${-(readinessPercentage / 100) * 502.65}`}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold">{readinessPercentage}%</span>
                    <span className="text-sm text-muted-foreground">Career Ready</span>
                  </div>
                </div>

                <Button 
                  className="mt-6 gap-2"
                  onClick={() => navigate('/courses')}
                >
                  Improve Career Readiness
                  <ChevronRight className="h-4 w-4" />
                </Button>
                
                <button 
                  className="mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => handleTabChange('achievements')}
                >
                  View skill gaps
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Column - Weekly Activity + AI Mentor */}
        <div className="space-y-6">
          {/* Weekly Activity - Compact Version */}
          <Card className="bg-card border">
            <CardContent className="p-5">
              <h3 className="text-lg font-bold mb-4">Weekly Activity</h3>
              
              {/* Mini Bar Chart */}
              <div className="flex items-end justify-between gap-1.5 h-20 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => {
                  // Get the date for this day of the week
                  const today = new Date();
                  const currentDay = today.getDay(); // 0 = Sunday
                  const dayDiff = index - currentDay;
                  const targetDate = new Date(today);
                  targetDate.setDate(today.getDate() + dayDiff);
                  const dateStr = targetDate.toISOString().split('T')[0];
                  
                  const dayMinutes = weeklyActivityData.dailyData[dateStr] || 0;
                  const maxMinutes = Math.max(...Object.values(weeklyActivityData.dailyData), 60);
                  const heightPercent = maxMinutes > 0 ? (dayMinutes / maxMinutes) * 100 : 0;
                  const isToday = index === currentDay;
                  
                  return (
                    <div key={day} className="flex-1 flex flex-col items-center gap-1">
                      <div 
                        className={`w-full rounded-t transition-all ${isToday ? 'bg-primary' : dayMinutes > 0 ? 'bg-primary/60' : 'bg-muted'}`}
                        style={{ height: `${Math.max(heightPercent, 5)}%` }}
                      />
                      <span className={`text-[10px] ${isToday ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                        {day.slice(0, 1)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Stats */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Time</span>
                  <span className="font-bold">{weeklyActivityData.totalMinutes} min</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Active Days</span>
                  <span className="font-bold">{weeklyActivityData.activeDays} / 7</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Mentor Card */}
          <Card className="bg-card border">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold">AI Mentor</h3>
              </div>
              
              <p className="text-sm text-muted-foreground mb-4">
                Your personal AI guide to becoming job-ready.
              </p>
              
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-xs text-muted-foreground mb-1">Recommended:</p>
                <p className="text-sm font-medium">
                  {completedInCareer < careerRelatedSlugs.length 
                    ? `Complete your ${career?.name || 'career'} courses to improve readiness`
                    : 'Great job! Explore advanced topics next'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Continue Learning Section */}
      <ContinueLearningCard />

      {/* Career Selection Dialog */}
      <CareerSelectionDialog
        open={careerDialogOpen}
        onOpenChange={setCareerDialogOpen}
        selectedCareerSlug={selectedCareer}
        onCareerSelect={handleCareerSelect}
      />
    </div>
  );


  const renderLearnings = () => {
    // Get featured courses (not enrolled)
    const enrolledCourseIds = enrolledCourses.map(e => e.courses?.id);
    const featuredCourses = allCourses.filter(c => !enrolledCourseIds.includes(c.id)).slice(0, 4);

    // Color gradients for featured cards
    const gradients = [
      'from-blue-600 to-blue-800',
      'from-teal-600 to-teal-800', 
      'from-purple-600 to-purple-800',
      'from-cyan-600 to-cyan-800',
    ];

    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Study Plan</h2>
          <Button variant="ghost" onClick={() => navigate('/courses')} className="gap-1">
            My Study Plan <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Ongoing Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Ongoing</h3>
          {enrolledCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {enrolledCourses.map((enrollment) => (
                <OngoingCourseCard 
                  key={enrollment.id}
                  course={enrollment.courses}
                  userId={userId}
                  onClick={() => navigate(`/course/${enrollment.courses?.slug}`)}
                />
              ))}
            </div>
          ) : (
            <Card className="bg-muted/30">
              <CardContent className="text-center py-8">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No ongoing courses. Start learning today!</p>
                <Button className="mt-4" size="sm" onClick={() => navigate('/courses')}>
                  Browse Courses
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Featured Section */}
        {featuredCourses.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Featured</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {featuredCourses.map((course, index) => (
                <FeaturedCourseCard 
                  key={course.id}
                  course={course}
                  gradient={gradients[index % gradients.length]}
                  onClick={() => navigate(`/course/${course.slug}`)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

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

  const renderAchievements = () => {
    const readinessPercentage = careerRelatedSlugs.length > 0 
      ? Math.round((completedInCareer / careerRelatedSlugs.length) * 100) 
      : 0;

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Achievements</h2>
        
        {/* Skill Milestones - Full View */}
        <SkillMilestones 
          completedCourses={completedInCareer}
          readinessPercentage={readinessPercentage}
          compact={false}
        />

        {/* Additional Achievements */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Learning Badges
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: 'First Lesson', desc: 'Complete your first lesson', locked: true },
                { name: 'Enrolled', desc: 'Enroll in your first course', locked: enrolledCourses.length === 0 },
                { name: 'Bookworm', desc: 'Complete 5 courses', locked: completedCourseSlugs.length < 5 },
                { name: 'Discussion Star', desc: 'Leave 10 comments', locked: true },
              ].map((achievement, index) => (
                <div 
                  key={index} 
                  className={`p-4 rounded-lg border text-center transition-all ${
                    achievement.locked 
                      ? 'opacity-50 bg-muted/30 border-dashed' 
                      : 'bg-primary/5 border-primary/20'
                  }`}
                >
                  <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2 ${
                    achievement.locked ? 'bg-muted' : 'bg-primary/10'
                  }`}>
                    <Award className={`h-6 w-6 ${achievement.locked ? 'text-muted-foreground' : 'text-primary'}`} />
                  </div>
                  <h4 className="font-medium text-sm">{achievement.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{achievement.desc}</p>
                  {!achievement.locked && <Badge className="mt-2" variant="secondary">Unlocked</Badge>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

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
