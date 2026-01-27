import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCourseNavigation } from "@/hooks/useCourseNavigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { useUserRole } from "@/hooks/useUserRole";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { z } from "zod";
import { icons, RotateCcw, Code2, Play, CheckCircle2, AlertCircle, Mail } from "lucide-react";
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
  Zap,
  Library,
  Gamepad2,
  FlaskConical,
  LayoutGrid
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Helper to get a dynamic icon from lucide-react's icons map
const ICONS = icons as unknown as Record<string, LucideIcon>;
const getIcon = (iconName: string | null | undefined, fallback: LucideIcon): LucideIcon => {
  if (!iconName) return fallback;
  return ICONS[iconName] ?? fallback;
};

const stripHtml = (value: string | null | undefined) => {
  if (!value) return "";
  return value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
};

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

type TabType = 'dashboard' | 'learnings' | 'bookmarks' | 'discussions' | 'achievements' | 'notifications' | 'settings' | 'practice';

const sidebarItems = [
  { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'learnings' as TabType, label: 'My Learnings', icon: BookOpen },
  { id: 'bookmarks' as TabType, label: 'Bookmarks', icon: Bookmark },
  { id: 'discussions' as TabType, label: 'Discussions', icon: MessageSquare },
];

const exploreItems = [
  { id: 'practice' as TabType, label: 'Practice Lab', icon: FlaskConical },
  { id: 'achievements' as TabType, label: 'Achievements', icon: Award },
];

const accountItems = [
  { id: 'notifications' as TabType, label: 'Notifications', icon: Bell },
  { id: 'settings' as TabType, label: 'Settings', icon: Settings },
];

// OngoingCourseCard component for the learnings section
const OngoingCourseCard = ({ 
  course, 
  userId, 
  onClick,
  onResetProgress
}: { 
  course: any; 
  userId: string | null;
  onClick: () => void;
  onResetProgress?: () => void;
}) => {
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchProgress = async () => {
      if (!course?.id || !userId) return;

      // Count all lessons regardless of status on public pages
      const { count: totalLessons } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', course.id);

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

  const handleResetProgress = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!course?.id || !userId || isResetting) return;
    
    setIsResetting(true);
    try {
      // Delete all lesson progress for this course
      const { error } = await supabase
        .from('lesson_progress')
        .delete()
        .eq('user_id', userId)
        .eq('course_id', course.id);

      if (error) throw error;

      setProgress({ completed: 0, total: progress.total });
      toast({
        title: "Progress Reset",
        description: `Your progress for ${course.name} has been reset.`,
      });
      onResetProgress?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to reset progress",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Card 
      className="card-premium hover:scale-[1.02] cursor-pointer relative group"
      onClick={onClick}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onClick={handleResetProgress}
        disabled={isResetting}
        title="Reset Progress"
      >
        <RotateCcw className={`h-4 w-4 ${isResetting ? 'animate-spin' : ''}`} />
      </Button>
      
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
            {(() => {
              const IconComponent = getIcon(course?.icon, BookOpen);
              return <IconComponent className="h-8 w-8 text-primary" />;
            })()}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-foreground truncate">{course?.name}</h4>
            {/* Display learning hours - use course value or estimate from lessons */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Clock className="h-3 w-3" />
              <span>
                {course?.learning_hours > 0 
                  ? `${course.learning_hours}h` 
                  : `${Math.max(1, Math.round((progress.total * 15) / 60))}h`}
              </span>
            </div>
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

      // Count all lessons regardless of status on public pages
      const { count } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', course.id);

      setLessonCount(count || 0);
    };

    fetchLessonCount();
  }, [course?.id]);

  // Use course learning_hours if available, otherwise estimate (avg 15 min per lesson)
  const displayHours = course.learning_hours > 0 
    ? course.learning_hours 
    : Math.max(1, Math.round((lessonCount * 15) / 60));

  // Get the icon component
  const iconName = course?.icon || 'BookOpen';
  const IconComponent = getIcon(iconName, BookOpen);

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
              {displayHours}h
            </span>
          </div>
        </div>
        <div className="flex justify-end">
          <IconComponent className="h-12 w-12 text-white/30" />
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
  const [courseProgressMap, setCourseProgressMap] = useState<Record<string, { completed: number; total: number }>>({});
  const [selectedCareer, setSelectedCareer] = useState<string>('data-science');
  const [careerDialogOpen, setCareerDialogOpen] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [streakFreezesAvailable, setStreakFreezesAvailable] = useState(2);
  const [isFreezingStreak, setIsFreezingStreak] = useState(false);
  const [weeklyActivityData, setWeeklyActivityData] = useState<{ totalSeconds: number; activeDays: number; dailySeconds: Record<string, number> }>({ totalSeconds: 0, activeDays: 0, dailySeconds: {} });
  const [achievements, setAchievements] = useState<any[]>([]);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { bookmarks, loading: bookmarksLoading, toggleBookmark } = useBookmarks();
  const { getCareerBySlug, getCareerCourseSlugs, getCareerSkills, getSkillContributionsForCourse, getCourseForSkill } = useCareers();
  const { isAdmin, isModerator } = useUserRole();
  const { navigateToCourse, handleResume } = useCourseNavigation();

  // Handle skill click - navigate to course that teaches this skill
  const handleSkillClick = async (skillName: string) => {
    if (!career) return;
    
    const courseInfo = getCourseForSkill(career.id, skillName);
    if (courseInfo) {
      // Use role-aware navigation (not auto-resume)
      await navigateToCourse(courseInfo.courseSlug, courseInfo.courseId);
    }
  };

  useEffect(() => {
    const tab = searchParams.get('tab') as TabType;
    if (tab && sidebarItems.some(item => item.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    checkUser();
  }, []);

  const toDayKey = (d: Date) => {
    const safe = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
    return safe.toISOString().slice(0, 10);
  };

  const formatDurationFromSeconds = (seconds: number) => {
    if (!seconds) return "0 min";
    const minutes = Math.floor(seconds / 60);
    if (minutes === 0) return "<1 min";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Fetch weekly activity data (seconds-based so short sessions still show)
  useEffect(() => {
    const fetchWeeklyActivity = async () => {
      if (!userId) return;

      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const { data: timeData, error } = await supabase
        .from('lesson_time_tracking')
        .select('tracked_date, duration_seconds')
        .eq('user_id', userId)
        .gte('tracked_date', toDayKey(weekStart))
        .lte('tracked_date', toDayKey(weekEnd));

      if (error) return;

      const dailySeconds: Record<string, number> = {};
      (timeData || []).forEach((record: any) => {
        dailySeconds[record.tracked_date] = (dailySeconds[record.tracked_date] || 0) + (record.duration_seconds || 0);
      });

      const totalSeconds = Object.values(dailySeconds).reduce((sum, s) => sum + s, 0);
      const activeDays = Object.values(dailySeconds).filter((s) => s > 0).length;

      setWeeklyActivityData({ totalSeconds, activeDays, dailySeconds });

      // Refresh streak from activity + stored max streak
      const { data: allTimeData } = await supabase
        .from('lesson_time_tracking')
        .select('tracked_date, duration_seconds')
        .eq('user_id', userId)
        .order('tracked_date', { ascending: false })
        .limit(500);

      const dailyTotals = new Map<string, number>();
      allTimeData?.forEach((record: any) => {
        dailyTotals.set(record.tracked_date, (dailyTotals.get(record.tracked_date) || 0) + (record.duration_seconds || 0));
      });

      const { data: profile } = await supabase
        .from('profiles')
        .select('max_streak, last_freeze_date, last_activity_date')
        .eq('id', userId)
        .maybeSingle();

      const storedMaxStreak = (profile as any)?.max_streak || 0;
      const lastFreezeDate = (profile as any)?.last_freeze_date;
      const todayKey = toDayKey(today);
      const todaySeconds = dailyTotals.get(todayKey) || 0;
      const todayFrozen = lastFreezeDate === todayKey;

      let recalculatedStreak = 0;
      let checkDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
      if (todaySeconds === 0 && !todayFrozen) {
        checkDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 12);
      }

      for (let i = 0; i < 365; i++) {
        const dateKey = toDayKey(checkDate);
        const daySeconds = dailyTotals.get(dateKey) || 0;
        const wasFrozen = lastFreezeDate === dateKey;

        if (daySeconds > 0 || wasFrozen) {
          recalculatedStreak++;
          checkDate = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate() - 1, 12);
        } else {
          break;
        }
      }

      const newMax = Math.max(recalculatedStreak, storedMaxStreak);
      setCurrentStreak(recalculatedStreak);
      setMaxStreak(newMax);

      await supabase
        .from('profiles')
        .update({
          current_streak: recalculatedStreak,
          max_streak: newMax,
          last_activity_date: todaySeconds > 0 ? todayKey : (profile as any)?.last_activity_date,
        } as any)
        .eq('id', userId);
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

      // Check email verification status from session
      setEmailVerified(session.user.email_confirmed_at !== null);

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
            level,
            icon,
            learning_hours
          )
        `)
        .eq("user_id", session.user.id);

      if (enrollments) {
        setEnrolledCourses(enrollments);
      }

      // Fetch all courses for recommendations
      const { data: courses } = await supabase
        .from("courses")
        .select("id, name, slug, description, featured_image, level, icon, learning_hours");

      if (courses) {
        setAllCourses(courses);
      }

      // Fetch lesson progress to determine completed courses
      const { data: lessonProgress } = await supabase
        .from("lesson_progress")
        .select("course_id, completed")
        .eq("user_id", session.user.id)
        .eq("completed", true);

      // Fetch lesson counts per course (all lessons regardless of status)
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

        // Build course progress map (by slug for easy lookup)
        const progressMap: Record<string, { completed: number; total: number }> = {};
        courses.forEach(course => {
          const total = lessonCountByCourse[course.id] || 0;
          const done = completedByCourse[course.id] || 0;
          progressMap[course.slug] = { completed: done, total };
        });
        setCourseProgressMap(progressMap);

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

      // Fetch achievements from database
      const { data: userAchievements } = await supabase
        .from("achievements")
        .select("*")
        .eq("user_id", session.user.id)
        .order("earned_at", { ascending: false })
        .limit(5);

      if (userAchievements) {
        setAchievements(userAchievements);
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

  const handleResendVerification = async () => {
    if (resendingVerification || !email) return;
    
    setResendingVerification(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      toast({
        title: "Verification email sent!",
        description: "Please check your inbox and spam folder.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resend verification email.",
        variant: "destructive",
      });
    } finally {
      setResendingVerification(false);
    }
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
    ? Math.round((weeklyActivityData.totalSeconds / 60) / weeklyActivityData.activeDays) 
    : 0;

  // Get skills and calculate actual skill values from database
  const skills = career ? getCareerSkills(career.id) : [];
  
  // Calculate skill values based on lesson completion within courses
  const calculateSkillValues = () => {
    if (!career || skills.length === 0) return {};
    
    const skillValues: Record<string, number> = {};
    
    skills.forEach(skill => {
      let skillValue = 0;
      
      // For each course in this career path, calculate partial contribution based on lesson progress
      careerRelatedSlugs.forEach(courseSlug => {
        const contributions = getSkillContributionsForCourse(career.id, courseSlug);
        const contribution = contributions.find(c => c.skill_name === skill.skill_name);
        
        if (contribution) {
          // Get the course's lesson progress
          const progress = courseProgressMap[courseSlug];
          if (progress && progress.total > 0) {
            // Calculate partial contribution based on % of lessons completed
            const completionRatio = progress.completed / progress.total;
            skillValue += contribution.contribution * completionRatio;
          }
        }
      });
      
      // Cap at 100
      skillValues[skill.skill_name] = Math.min(Math.round(skillValue), 100);
    });
    
    return skillValues;
  };
  
  const skillValues = calculateSkillValues();
  
  // Calculate weighted career readiness percentage
  const calculateWeightedReadiness = () => {
    if (!skills.length) return 0;
    
    let weightedSum = 0;
    let totalWeight = 0;
    
    skills.forEach(skill => {
      const value = skillValues[skill.skill_name] || 0;
      const weight = skill.weight || 25; // Default to 25 if no weight set
      weightedSum += value * weight;
      totalWeight += weight;
    });
    
    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  };
  
  const readinessPercentage = calculateWeightedReadiness();

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Top Header Card - Welcome + Career + Streak + Stats */}
      <Card className="card-premium rounded-xl animate-stagger-1">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-8">
            {/* Welcome Section */}
            <div className="flex items-center gap-4 flex-1">
              <div className="avatar-premium">
                <Avatar className="h-16 w-16 ring-2 ring-primary/30 ring-offset-2 ring-offset-background">
                  <AvatarImage src={avatarUrl} alt={fullName} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xl font-bold">
                    {fullName?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Welcome back!</p>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">{fullName || 'Learner'}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Aspiring <span className="text-primary font-medium">{career?.name || 'Data Analyst'}</span>
                </p>
              </div>
            </div>

            {/* Divider */}
            <Separator orientation="vertical" className="h-16 hidden lg:block" />

            {/* Streak Badge with Animation */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4">
                {/* Combined Streak Card */}
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 shadow-sm shadow-amber-500/10">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                      <Flame className="h-6 w-6 text-white drop-shadow-lg" />
                    </div>
                    {currentStreak > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[10px] font-bold text-primary-foreground shadow-lg">
                        🔥
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-baseline gap-1.5">
                      <p className="text-xs text-muted-foreground font-medium">Streak</p>
                      <span className="text-[10px] text-muted-foreground/70">/ max {maxStreak}</span>
                    </div>
                    <p className="text-xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                      {currentStreak} Day{currentStreak !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Career Readiness + Recommended Labs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Career Readiness */}
          <Card className="card-premium rounded-xl animate-stagger-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">Career Readiness</h3>
                  <p className="text-sm text-muted-foreground">Your progress toward becoming job-ready</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="gap-1.5"
                    onClick={() => {
                      // Navigate to first course in career path
                      if (skills.length > 0) {
                        handleSkillClick(skills[0].skill_name);
                      }
                    }}
                  >
                    <LayoutGrid className="h-4 w-4" />
                    <span className="font-medium">Course Board</span>
                  </Button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="gap-1.5 text-primary hover:bg-primary/10 border border-primary/20"
                        onClick={() => setCareerDialogOpen(true)}
                      >
                        <Zap className="h-4 w-4" />
                        <span className="font-semibold">{readinessPercentage >= 80 ? 'Job Ready' : readinessPercentage >= 50 ? 'Intermediate' : 'Beginner'}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Based on your overall career readiness</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Skill Progress Bars */}
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {skills.map((skill, index) => {
                    // Get actual skill value from our calculation
                    const skillProgress = skillValues[skill.skill_name] || 0;
                    
                    // Get icon from database
                    const renderSkillIcon = (iconName: string) => {
                      const IconComp = getIcon(iconName, Code2);
                      return <IconComp className="h-5 w-5" />;
                    };
                    
                      return (
                        <div 
                          key={skill.id} 
                          className="group cursor-pointer hover:bg-primary/5 rounded-lg p-3 -m-1 transition-all duration-150 border border-transparent hover:border-primary/20 hover:shadow-sm hover:translate-y-[-1px]"
                          onClick={() => handleSkillClick(skill.skill_name)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className="text-primary">
                                {renderSkillIcon(skill.icon)}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{skill.skill_name}</span>
                                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  {skill.weight}% weight
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{skillProgress}%</span>
                              {/* Secondary contextual CTA - visible on hover */}
                              <span className="hidden group-hover:inline-flex items-center gap-1 text-[11px] font-medium text-primary/80 border border-primary/30 bg-transparent px-2 py-0.5 rounded-full transition-all">
                                View Courses
                                <ChevronRight className="h-3 w-3" />
                              </span>
                              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:hidden transition-opacity duration-150" />
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
                    <div className="text-center text-muted-foreground py-4">
                      <p>No skills defined for this career path.</p>
                      <p className="text-sm">Select a career to see required skills.</p>
                    </div>
                  )}
                </div>

                {/* Circular Progress Gauge - Modern Design */}
                {/* Check if close to next level threshold (within 5%) */}
                {(() => {
                  const isCloseToNextLevel = 
                    (readinessPercentage >= 15 && readinessPercentage < 20) ||
                    (readinessPercentage >= 45 && readinessPercentage < 50) ||
                    (readinessPercentage >= 75 && readinessPercentage < 80);
                  
                  return (
                <div className="flex flex-col items-center justify-center">
                  <div className={`relative w-44 h-44 ${isCloseToNextLevel ? 'animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]' : ''}`}>
                    {/* Outer glow ring */}
                    <div 
                      className={`absolute inset-0 rounded-full opacity-20 blur-xl ${isCloseToNextLevel ? 'opacity-40' : ''}`}
                      style={{
                        background: `conic-gradient(from 0deg, hsl(var(--primary)) ${readinessPercentage}%, transparent ${readinessPercentage}%)`
                      }}
                    />
                    
                    <svg className="w-44 h-44 transform -rotate-90" viewBox="0 0 208 208">
                      {/* Background track with segments */}
                      <circle
                        cx="104"
                        cy="104"
                        r="88"
                        stroke="hsl(var(--muted))"
                        strokeWidth="12"
                        fill="none"
                        opacity="0.3"
                      />
                      
                      {/* Inner background circle */}
                      <circle
                        cx="104"
                        cy="104"
                        r="76"
                        stroke="hsl(var(--muted))"
                        strokeWidth="4"
                        fill="none"
                        opacity="0.2"
                      />
                      
                      {/* Progress gradient arc */}
                      <defs>
                        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="hsl(var(--primary))" />
                          <stop offset="50%" stopColor="hsl(280 80% 60%)" />
                          <stop offset="100%" stopColor="hsl(45 93% 47%)" />
                        </linearGradient>
                      </defs>
                      
                      {/* Glow filter for active arc */}
                      <filter id="arcGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                      
                      {/* Main progress arc with glow */}
                      <circle
                        cx="104"
                        cy="104"
                        r="88"
                        stroke="url(#progressGradient)"
                        strokeWidth="12"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={`${(readinessPercentage / 100) * 553.07} 553.07`}
                        className="transition-all duration-1000 ease-out"
                        filter="url(#arcGlow)"
                      />
                      
                      {/* Current progress indicator dot */}
                      {(() => {
                        const progressAngle = (readinessPercentage / 100) * 360 - 90;
                        const progressRad = (progressAngle * Math.PI) / 180;
                        const dotX = 104 + 88 * Math.cos(progressRad);
                        const dotY = 104 + 88 * Math.sin(progressRad);
                        return (
                          <circle
                            cx={dotX}
                            cy={dotY}
                            r="7"
                            fill="hsl(var(--background))"
                            stroke="url(#progressGradient)"
                            strokeWidth="3"
                            className="transition-all duration-1000 ease-out"
                            style={{
                              filter: 'drop-shadow(0 0 4px hsl(var(--primary) / 0.6))'
                            }}
                          />
                        );
                      })()}
                      
                      {/* Decorative milestone dots on the track */}
                      {[0, 25, 50, 75, 100].map((percent, i) => {
                        const angle = (percent / 100) * 360 - 90;
                        const rad = (angle * Math.PI) / 180;
                        const x = 104 + 88 * Math.cos(rad);
                        const y = 104 + 88 * Math.sin(rad);
                        const isAchieved = readinessPercentage >= percent;
                        return (
                          <circle
                            key={i}
                            cx={x}
                            cy={y}
                            r="4"
                            fill={isAchieved ? "hsl(var(--primary))" : "hsl(var(--muted))"}
                            className="transition-all duration-500"
                          />
                        );
                      })}
                    </svg>
                    
                    {/* Center content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="relative">
                        <span className="text-5xl font-bold bg-gradient-to-br from-primary via-purple-500 to-amber-500 bg-clip-text text-transparent">
                          {readinessPercentage}
                        </span>
                        <span className="text-2xl font-bold text-muted-foreground">%</span>
                      </div>
                      <span className="text-sm text-muted-foreground mt-1">Career Ready</span>
                    </div>
                  </div>

                  {/* Micro guidance - Silent Coach */}
                  {readinessPercentage < 100 && skills.length > 0 && (() => {
                    // Find the lowest skill to suggest focus
                    const lowestSkill = skills.reduce((min, skill) => {
                      const currentValue = skillValues[skill.skill_name] || 0;
                      const minValue = skillValues[min.skill_name] || 0;
                      return currentValue < minValue ? skill : min;
                    }, skills[0]);
                    const nextThreshold = readinessPercentage < 20 ? 20 : 
                                         readinessPercentage < 50 ? 50 : 
                                         readinessPercentage < 80 ? 80 : 100;
                    return (
                      <p className="text-xs text-primary/70 mt-3 text-center max-w-[180px]">
                        Next focus: {lowestSkill.skill_name} to reach {nextThreshold}% readiness
                      </p>
                    );
                  })()}

                  <div className="flex flex-col items-center mt-4 group/cta">
                    <Button 
                      className="gap-2"
                      onClick={() => navigate('/arcade')}
                    >
                      Improve Career Readiness
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    {/* Contextual subtext - visible on hover */}
                    {readinessPercentage < 100 && skills.length >= 2 && (
                      <p className="text-[11px] text-muted-foreground mt-2 opacity-0 group-hover/cta:opacity-100 transition-opacity duration-150">
                        Complete {skills.slice(0, 2).map(s => s.skill_name).join(' & ')} courses
                      </p>
                    )}
                  </div>
                  
                </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Recommended Labs Section - Directly below Career Readiness */}
          <Card className="card-premium rounded-xl animate-stagger-3">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                    <FlaskConical className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Recommended Labs</CardTitle>
                    <CardDescription>Practice exercises based on your enrolled courses</CardDescription>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setActiveTab('practice')} className="gap-1">
                  View All <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {enrolledCourses.slice(0, 3).map((enrollment, index) => {
                  const course = enrollment.courses;
                  if (!course) return null;
                  
                  const labTypes = ['Coding Challenge', 'Quiz', 'Project'];
                  const labIcons = [<Zap className="h-4 w-4" />, <Target className="h-4 w-4" />, <Award className="h-4 w-4" />];
                  const labColors = ['from-emerald-500 to-teal-600', 'from-blue-500 to-indigo-600', 'from-purple-500 to-pink-600'];
                  
                  return (
                    <Card 
                      key={enrollment.id} 
                      className="bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer border"
                      onClick={() => setActiveTab('practice')}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${labColors[index % 3]} flex items-center justify-center shrink-0`}>
                            {labIcons[index % 3]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{course.name} {labTypes[index % 3]}</p>
                            <p className="text-xs text-muted-foreground mt-1">Practice your skills</p>
                            <Badge variant="secondary" className="mt-2 text-xs">
                              {labTypes[index % 3]}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {enrolledCourses.length === 0 && (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    <FlaskConical className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Enroll in courses to unlock practice labs</p>
                    <Button variant="link" onClick={() => navigate('/courses')} className="mt-2">
                      Browse Courses
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Weekly Activity + AI Mentor + Achievements */}
        <div className="flex flex-col space-y-6 h-full">
          {/* Weekly Activity - Compact Version */}
          <Card className="card-premium rounded-xl animate-stagger-2">
            <CardContent className="p-5">
              <h3 className="text-lg font-bold mb-4">Weekly Activity</h3>
              
              <TooltipProvider>
                <div className="flex items-end justify-between gap-1.5 h-24 mb-4">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayLabel, index) => {
                    const today = new Date();
                    const weekStart = new Date(today);
                    weekStart.setDate(today.getDate() - today.getDay());

                    const targetDate = new Date(weekStart);
                    targetDate.setDate(weekStart.getDate() + index);

                    const dateStr = toDayKey(targetDate);
                    const daySeconds = weeklyActivityData.dailySeconds[dateStr] || 0;
                    const isToday = index === today.getDay();
                    const hasActivity = daySeconds > 0;

                    // Safely calculate max with fallback
                    const allValues = Object.values(weeklyActivityData.dailySeconds);
                    const maxSeconds = allValues.length > 0 
                      ? Math.max(...allValues, 60 * 5)
                      : 60 * 5;

                    const heightPercent = maxSeconds > 0 ? (daySeconds / maxSeconds) * 100 : 0;

                    return (
                      <Tooltip key={dayLabel + index}>
                        <TooltipTrigger asChild>
                          <div className="flex-1 flex flex-col items-center gap-1.5 cursor-pointer">
                            <div 
                              className="w-full flex items-end justify-center"
                              style={{ height: '60px' }}
                            >
                              <div
                                className={`w-full max-w-6 rounded-lg transition-all duration-300 hover:opacity-80 ${
                                  isToday
                                    ? 'bg-primary shadow-lg shadow-primary/30'
                                    : hasActivity
                                      ? 'bg-primary/60'
                                      : 'bg-muted/50'
                                }`}
                                style={{ 
                                  height: hasActivity ? `${Math.max(heightPercent, 15)}%` : '6px',
                                  minHeight: hasActivity ? '8px' : '6px'
                                }}
                              />
                            </div>
                            <span className={`text-[10px] font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                              {dayLabel}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-center">
                          <p className="font-semibold">{targetDate.toLocaleDateString(undefined, { weekday: 'long' })}</p>
                          <p className="text-sm text-muted-foreground">
                            {hasActivity ? formatDurationFromSeconds(daySeconds) : 'No activity'}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </TooltipProvider>

              {/* Stats */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Time</span>
                  <span className="font-bold">{formatDurationFromSeconds(weeklyActivityData.totalSeconds)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Active Days</span>
                  <span className="font-bold">{weeklyActivityData.activeDays} / 7</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Mentor Card */}
          <Card className="card-premium rounded-xl animate-stagger-3">
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

          {/* Recent Achievements */}
          <Card className="card-premium rounded-xl animate-stagger-4 flex-1">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold">Recent Achievements</h3>
              </div>
              
              <div className="space-y-3">
                {achievements.length > 0 ? (
                  achievements.slice(0, 3).map((achievement) => {
                    const IconComponent = getIcon(achievement.icon || 'Award', Award);
                    const colorMap: Record<string, string> = {
                      amber: 'bg-amber-500/10 border-amber-500/20 text-amber-500',
                      green: 'bg-green-500/10 border-green-500/20 text-green-500',
                      blue: 'bg-blue-500/10 border-blue-500/20 text-blue-500',
                      purple: 'bg-purple-500/10 border-purple-500/20 text-purple-500',
                      primary: 'bg-primary/10 border-primary/20 text-primary',
                    };
                    const colors = colorMap[achievement.color] || colorMap.amber;
                    const [bgColor, borderColor, textColor] = colors.split(' ');
                    
                    return (
                      <div 
                        key={achievement.id} 
                        className={`flex items-center gap-3 p-3 rounded-lg ${bgColor} border ${borderColor}`}
                      >
                        <div className={`w-8 h-8 rounded-full ${bgColor} flex items-center justify-center`}>
                          <IconComponent className={`h-4 w-4 ${textColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{achievement.achievement_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{achievement.description}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <>
                    {currentStreak >= 7 && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                          <Flame className="h-4 w-4 text-amber-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Week Warrior</p>
                          <p className="text-xs text-muted-foreground">7-day learning streak</p>
                        </div>
                      </div>
                    )}
                    {completedInCareer > 0 && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <BookOpen className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Course Completed</p>
                          <p className="text-xs text-muted-foreground">{completedInCareer} course{completedInCareer !== 1 ? 's' : ''} finished</p>
                        </div>
                      </div>
                    )}
                    {readinessPercentage >= 25 && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                          <Target className="h-4 w-4 text-green-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Making Progress</p>
                          <p className="text-xs text-muted-foreground">{readinessPercentage}% career ready</p>
                        </div>
                      </div>
                    )}
                    {currentStreak < 7 && completedInCareer === 0 && readinessPercentage < 25 && (
                      <div className="text-center py-4 text-muted-foreground">
                        <Award className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Start learning to earn achievements!</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Arcade Section */}
      <Card className="card-premium rounded-xl animate-stagger-5">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Gamepad2 className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl font-bold mb-1">Arcade</h3>
              <p className="text-muted-foreground">
                Test your skills with interactive challenges, quizzes, and games to reinforce your learning.
              </p>
            </div>
            <Button 
              onClick={() => navigate('/arcade')} 
              className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-purple-500/20"
            >
              <Gamepad2 className="h-4 w-4" />
              Enter Arcade
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

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
        <div className="flex items-center justify-between animate-fade-in">
          <h2 className="text-2xl font-bold">Study Plan</h2>
          <Button variant="ghost" onClick={() => navigate('/courses')} className="gap-1">
            My Study Plan <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Ongoing Section */}
        <div className="space-y-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Ongoing
          </h3>
          {enrolledCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {enrolledCourses.map((enrollment) => (
                <OngoingCourseCard 
                  key={enrollment.id}
                  course={enrollment.courses}
                  userId={userId}
                  onClick={() => navigateToCourse(enrollment.courses?.slug, enrollment.courses?.id)}
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
          <div className="space-y-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Featured Courses
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredCourses.map((course, index) => (
                <FeaturedCourseCard 
                  key={course.id}
                  course={course}
                  gradient={gradients[index % gradients.length]}
                  onClick={() => navigateToCourse(course.slug, course.id)}
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
                      className="card-premium hover:scale-[1.01] transition-transform"
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <div 
                          className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden flex-shrink-0 cursor-pointer"
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
                              <BookOpen className="h-6 w-6 text-primary" />
                            </div>
                          )}
                        </div>
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => navigate(`/course/${bookmark.courses?.slug}`)}
                        >
                          <h4 className="font-semibold truncate">{bookmark.courses?.name}</h4>
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
                  <FileText className="h-5 w-5 text-primary" />
                  Lessons ({lessonBookmarks.length})
                </h3>
                <div className="grid gap-4">
                  {lessonBookmarks.map((bookmark) => (
                    <Card 
                      key={bookmark.id}
                      className="card-premium hover:scale-[1.01] transition-transform"
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <div 
                          className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 cursor-pointer"
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
                            {bookmark.posts?.excerpt 
                              ? bookmark.posts.excerpt.replace(/<[^>]*>/g, '').slice(0, 100) 
                              : 'No description'}
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
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-muted"
              />
              <div className="flex items-center gap-2 mt-2">
                {emailVerified === null ? (
                  <span className="text-xs text-muted-foreground">Checking verification status...</span>
                ) : emailVerified ? (
                  <div className="flex items-center gap-1.5 text-xs text-primary">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Email verified</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1.5 text-xs text-accent">
                      <AlertCircle className="h-4 w-4" />
                      <span>Email not verified</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleResendVerification}
                      disabled={resendingVerification}
                      className="h-7 text-xs"
                    >
                      <Mail className="h-3 w-3 mr-1" />
                      {resendingVerification ? "Sending..." : "Resend verification"}
                    </Button>
                  </div>
                )}
              </div>
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

      {/* Notification Preferences - Only show for admins/moderators */}
      {(isAdmin || isModerator) && (
        <NotificationPreferences 
          userId={userId} 
          isAdmin={isAdmin} 
          isModerator={isModerator} 
        />
      )}

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

  const renderPracticeLab = () => {
    const labCategories = [
      {
        id: "python",
        name: "Python Labs",
        description: "Practice Python programming with hands-on exercises and challenges",
        icon: Code2,
        tasks: 350,
        projects: 3,
        progress: 72,
        modules: { completed: 12, total: 16 },
        status: "in-progress" as const,
        bgColor: "bg-pink-100 dark:bg-pink-950/40",
        badgeType: "Student",
      },
      {
        id: "sql",
        name: "SQL Labs",
        description: "Master database queries with interactive SQL challenges",
        icon: Library,
        tasks: 622,
        projects: 4,
        progress: 0,
        startDate: "20 July",
        status: "coming-soon" as const,
        bgColor: "bg-cyan-100 dark:bg-cyan-950/40",
        badgeType: "Recommended",
      },
      {
        id: "cli",
        name: "Command Line Labs",
        description: "Learn terminal commands and shell scripting techniques",
        icon: Zap,
        tasks: 350,
        projects: 5,
        progress: 0,
        startDate: "20 July",
        status: "coming-soon" as const,
        bgColor: "bg-amber-100 dark:bg-amber-950/40",
        badgeType: "Popular",
      },
      {
        id: "projects",
        name: "Mini Projects",
        description: "Build real-world projects to solidify your skills",
        icon: Trophy,
        tasks: 350,
        projects: 3,
        progress: 0,
        startDate: "20 July",
        status: "coming-soon" as const,
        bgColor: "bg-green-100 dark:bg-green-950/40",
        badgeType: "Student",
      },
    ];

    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 mb-4">
            <FlaskConical className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Practice Lab</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Reinforce your learning with hands-on coding exercises, SQL challenges, and real-world projects.
          </p>
        </div>

        {/* Lab Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {labCategories.map((category) => {
            const Icon = category.icon;
            const isInProgress = category.status === "in-progress";

            return (
              <div key={category.id} className={`rounded-2xl p-6 ${category.bgColor} relative overflow-hidden`}>
                <Badge 
                  variant="secondary" 
                  className="bg-background/80 backdrop-blur-sm text-foreground border-0 mb-4"
                >
                  {category.badgeType}
                </Badge>

                <div className="absolute top-4 right-4 w-20 h-20 rounded-2xl bg-gradient-to-br from-background/20 to-background/10 flex items-center justify-center">
                  <Icon className="h-10 w-10 text-foreground/70" />
                </div>

                <div className="pr-20">
                  <h3 className="text-xl font-bold text-foreground mb-2">{category.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {category.description}
                  </p>

                  <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1.5">
                      <Target className="h-4 w-4" />
                      <span>{category.tasks} tasks</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1.5">
                      <Award className="h-4 w-4" />
                      <span>{category.projects} projects</span>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium text-foreground">{category.progress}%</span>
                  </div>
                  <Progress 
                    value={category.progress} 
                    className="h-2 bg-foreground/10" 
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-foreground/10">
                  {isInProgress && category.modules ? (
                    <span className="text-sm text-foreground">
                      Modules: <strong>{category.modules.completed}/{category.modules.total}</strong>
                    </span>
                  ) : (
                    <span className="text-sm text-foreground">
                      Start date: <strong>{category.startDate}</strong>
                    </span>
                  )}
                  <Button 
                    className="rounded-full px-6"
                    variant={isInProgress ? "default" : "secondary"}
                  >
                    {isInProgress ? "Continue" : "Apply"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Features Preview */}
        <div>
          <h2 className="text-xl font-bold mb-6 text-center">What to Expect</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { title: "Browser-based IDE", desc: "Code directly in your browser", icon: Code2 },
              { title: "Auto-grading", desc: "Instant feedback on your solutions", icon: Sparkles },
              { title: "Progress Tracking", desc: "Track your practice streak", icon: Target },
            ].map((feature, i) => (
              <div key={i} className="text-center p-6 rounded-2xl bg-muted/30">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h4 className="font-semibold mb-1">{feature.title}</h4>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return renderDashboard();
      case 'learnings': return renderLearnings();
      case 'practice': return renderPracticeLab();
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
        <div className="flex flex-col lg:flex-row gap-8 min-h-[calc(100vh-12rem)] -mx-4 px-4 py-6 rounded-2xl dashboard-bg">
          {/* Sidebar - hidden for Practice Lab */}
          {activeTab !== 'practice' && (
          <aside className="lg:w-64 flex-shrink-0 animate-sidebar">
            <Card className="sticky top-28 rounded-xl bg-card/80 backdrop-blur-sm border shadow-lg">
              <CardContent className="p-4">
                {/* Profile Summary */}
                <div className="text-center pb-4 mb-4 border-b border-border/50">
                  <div className="mx-auto w-fit">
                    <Avatar className="h-20 w-20 ring-4 ring-primary/20 ring-offset-2 ring-offset-background shadow-lg">
                      <AvatarImage src={avatarUrl} alt={fullName} />
                      <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                        {fullName?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <h3 className="font-semibold text-lg truncate mt-3 text-foreground">{fullName || 'User'}</h3>
                  <p className="text-sm text-muted-foreground truncate">{email}</p>
                </div>
                
                {/* Navigation */}
                <nav className="space-y-1">
                  {sidebarItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleTabChange(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all duration-200 ${
                        activeTab === item.id 
                          ? 'bg-primary text-primary-foreground font-medium shadow-md' 
                          : 'hover:bg-muted/70 text-foreground hover:translate-x-1'
                      }`}
                    >
                      <item.icon className={`h-5 w-5 ${activeTab === item.id ? '' : 'text-muted-foreground'}`} />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </nav>

                {/* Explore Section */}
                <div className="border-t mt-2 pt-2">
                  <p className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Explore
                  </p>
                  <nav className="space-y-1">
                    {exploreItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleTabChange(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all duration-200 ${
                          activeTab === item.id 
                            ? 'bg-primary text-primary-foreground font-medium shadow-md' 
                            : 'hover:bg-muted/70 text-foreground hover:translate-x-1'
                        }`}
                      >
                        <item.icon className={`h-5 w-5 ${activeTab === item.id ? '' : 'text-muted-foreground'}`} />
                        <span>{item.label}</span>
                      </button>
                    ))}
                    <button
                      onClick={() => navigate('/library')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-colors hover:bg-muted/70 text-foreground hover:translate-x-1"
                    >
                      <Library className="h-5 w-5 text-muted-foreground" />
                      <span>Library</span>
                    </button>
                    <button
                      onClick={() => navigate('/arcade')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-colors hover:bg-muted/70 text-foreground hover:translate-x-1"
                    >
                      <Gamepad2 className="h-5 w-5 text-muted-foreground" />
                      <span>Arcade</span>
                    </button>
                  </nav>
                </div>

                {/* Account Section */}
                <div className="border-t mt-2 pt-2">
                  <p className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Account
                  </p>
                  <nav className="space-y-1">
                    {accountItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleTabChange(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all duration-200 ${
                          activeTab === item.id 
                            ? 'bg-primary text-primary-foreground font-medium shadow-md' 
                            : 'hover:bg-muted/70 text-foreground hover:translate-x-1'
                        }`}
                      >
                        <item.icon className={`h-5 w-5 ${activeTab === item.id ? '' : 'text-muted-foreground'}`} />
                        <span>{item.label}</span>
                      </button>
                    ))}
                    {(isAdmin || isModerator) && (
                      <button
                        onClick={() => navigate('/admin')}
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-colors hover:bg-muted/70 text-foreground hover:translate-x-1"
                      >
                        <Shield className="h-5 w-5 text-muted-foreground" />
                        <span>Admin Panel</span>
                      </button>
                    )}
                  </nav>
                </div>
              </CardContent>
            </Card>
          </aside>
          )}

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
