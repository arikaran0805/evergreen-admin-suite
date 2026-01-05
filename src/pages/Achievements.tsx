import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useCareers } from "@/hooks/useCareers";
import { 
  CheckCircle2, 
  Target, 
  Flame, 
  Star, 
  Crown, 
  Trophy,
  BookOpen,
  GraduationCap,
  MessageSquare,
  Users,
  Lock
} from "lucide-react";

interface MilestoneData {
  id: string;
  title: string;
  status: "locked" | "unlocked" | "on-track";
  icon: React.ReactNode;
}

interface BadgeData {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  progress?: { current: number; total: number };
}

const Achievements = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [completedCourses, setCompletedCourses] = useState(0);
  const [enrolledCourses, setEnrolledCourses] = useState(0);
  const [completedLessons, setCompletedLessons] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const navigate = useNavigate();
  const { allCourses } = useCareers();

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      
      setUserId(session.user.id);

      // Fetch enrollments
      const { data: enrollments } = await supabase
        .from("course_enrollments")
        .select("course_id")
        .eq("user_id", session.user.id);

      if (enrollments) {
        setEnrolledCourses(enrollments.length);
      }

      // Fetch completed lessons
      const { data: lessonProgress } = await supabase
        .from("lesson_progress")
        .select("course_id, completed")
        .eq("user_id", session.user.id)
        .eq("completed", true);

      if (lessonProgress) {
        setCompletedLessons(lessonProgress.length);
        
        // Calculate completed courses
        const completedByCourse: Record<string, number> = {};
        lessonProgress.forEach(progress => {
          completedByCourse[progress.course_id] = (completedByCourse[progress.course_id] || 0) + 1;
        });
        
        // Fetch lesson counts per course
        const { data: lessons } = await supabase
          .from("posts")
          .select("id, category_id")
          .eq("status", "published");

        if (lessons) {
          const lessonCountByCourse: Record<string, number> = {};
          lessons.forEach(lesson => {
            if (lesson.category_id) {
              lessonCountByCourse[lesson.category_id] = (lessonCountByCourse[lesson.category_id] || 0) + 1;
            }
          });

          let completed = 0;
          Object.keys(completedByCourse).forEach(courseId => {
            const totalLessons = lessonCountByCourse[courseId] || 0;
            if (totalLessons > 0 && completedByCourse[courseId] >= totalLessons) {
              completed++;
            }
          });
          setCompletedCourses(completed);
        }
      }

      // Fetch comments count
      const { data: comments } = await supabase
        .from("comments")
        .select("id")
        .eq("user_id", session.user.id);

      if (comments) {
        setCommentsCount(comments.length);
      }
    };

    fetchUserData();
  }, [navigate]);

  // Define milestones based on progress
  const milestones: MilestoneData[] = [
    {
      id: "first-lesson",
      title: "First Lesson",
      status: completedLessons >= 1 ? "unlocked" : "locked",
      icon: <CheckCircle2 className="h-8 w-8" />,
    },
    {
      id: "on-track",
      title: "On Track",
      status: completedCourses >= 1 ? "on-track" : "locked",
      icon: <Target className="h-8 w-8" />,
    },
    {
      id: "rising-star",
      title: "Rising Star",
      status: completedCourses >= 3 ? "unlocked" : "locked",
      icon: <Star className="h-8 w-8" />,
    },
    {
      id: "streak-master",
      title: "Streak Master",
      status: "locked",
      icon: <Flame className="h-8 w-8" />,
    },
    {
      id: "achiever",
      title: "Achiever",
      status: completedCourses >= 5 ? "unlocked" : "locked",
      icon: <Crown className="h-8 w-8" />,
    },
    {
      id: "champion",
      title: "Champion",
      status: completedCourses >= 10 ? "unlocked" : "locked",
      icon: <Trophy className="h-8 w-8" />,
    },
  ];

  const unlockedMilestones = milestones.filter(m => m.status !== "locked").length;
  const milestoneProgress = Math.round((unlockedMilestones / milestones.length) * 100);

  // Define badges
  const badges: BadgeData[] = [
    {
      id: "first-lesson",
      title: "First Lesson",
      description: "Complete your first lesson",
      icon: <BookOpen className="h-10 w-10" />,
      unlocked: completedLessons >= 1,
    },
    {
      id: "enrolled",
      title: "Enrolled",
      description: "Enroll in your first course",
      icon: <GraduationCap className="h-10 w-10" />,
      unlocked: enrolledCourses >= 1,
    },
    {
      id: "bookworm",
      title: "Bookworm",
      description: "Complete 5 courses",
      icon: <BookOpen className="h-10 w-10" />,
      unlocked: completedCourses >= 5,
      progress: { current: Math.min(completedCourses, 5), total: 5 },
    },
    {
      id: "discussion-star",
      title: "Discussion Star",
      description: "Leave 10 comments",
      icon: <MessageSquare className="h-10 w-10" />,
      unlocked: commentsCount >= 10,
      progress: { current: Math.min(commentsCount, 10), total: 10 },
    },
  ];

  const getMilestoneColors = (status: string) => {
    switch (status) {
      case "unlocked":
        return {
          shield: "from-emerald-400 to-emerald-600",
          ribbon: "from-amber-400 to-amber-600",
          icon: "text-white",
          label: "bg-emerald-500",
        };
      case "on-track":
        return {
          shield: "from-emerald-400 to-emerald-600",
          ribbon: "from-amber-400 to-amber-600",
          icon: "text-white",
          label: "bg-emerald-500",
        };
      default:
        return {
          shield: "from-gray-300 to-gray-400",
          ribbon: "from-gray-400 to-gray-500",
          icon: "text-gray-500",
          label: "bg-gray-400",
        };
    }
  };

  return (
    <Layout>
      <SEOHead
        title="Achievements | Track Your Progress"
        description="Track your learning milestones and earn badges as you progress through your courses."
      />

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Achievements</h1>
          <p className="text-muted-foreground">
            Track your learning milestones and earn badges.
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="milestones" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="milestones" className="data-[state=active]:bg-background">
                Milestones
              </TabsTrigger>
              <TabsTrigger value="badges" className="data-[state=active]:bg-background">
                Badges
              </TabsTrigger>
            </TabsList>
            <span className="text-sm text-muted-foreground">
              {unlockedMilestones} / {milestones.length} Milestones
            </span>
          </div>

          {/* Milestones Tab */}
          <TabsContent value="milestones" className="space-y-6">
            <Card className="bg-gradient-to-br from-background via-muted/20 to-background border shadow-lg overflow-hidden">
              <CardContent className="p-6">
                {/* Milestone Shields Row */}
                <div className="flex justify-between items-end mb-6 gap-2">
                  {milestones.map((milestone, index) => {
                    const colors = getMilestoneColors(milestone.status);
                    const isLast = index === milestones.length - 1;
                    
                    return (
                      <div 
                        key={milestone.id} 
                        className={`flex flex-col items-center transition-all ${
                          milestone.status === "locked" ? "opacity-50 grayscale" : ""
                        } ${isLast ? "scale-110" : ""}`}
                      >
                        {/* Shield Badge */}
                        <div className={`relative ${isLast ? "w-20 h-24" : "w-14 h-16 md:w-16 md:h-20"}`}>
                          {/* Shield Shape */}
                          <div className={`absolute inset-0 bg-gradient-to-b ${colors.shield} rounded-t-lg`} 
                               style={{ 
                                 clipPath: "polygon(50% 0%, 100% 0%, 100% 70%, 50% 100%, 0% 70%, 0% 0%)" 
                               }}>
                            {/* Inner shield highlight */}
                            <div className="absolute inset-1 bg-gradient-to-b from-white/30 to-transparent rounded-t-lg"
                                 style={{ 
                                   clipPath: "polygon(50% 0%, 100% 0%, 100% 70%, 50% 100%, 0% 70%, 0% 0%)" 
                                 }} />
                            {/* Icon */}
                            <div className={`absolute inset-0 flex items-center justify-center ${colors.icon}`}>
                              {milestone.icon}
                            </div>
                          </div>
                          
                          {/* Ribbon */}
                          {milestone.status !== "locked" && (
                            <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-sm text-xs font-medium text-white bg-gradient-to-r ${colors.ribbon} shadow-md whitespace-nowrap`}>
                              {milestone.status === "on-track" ? "On Track" : "Unlocked"}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Progress Bar */}
                <div className="relative">
                  <Progress value={milestoneProgress} className="h-6 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500 flex items-center justify-center"
                      style={{ width: `${milestoneProgress}%` }}
                    >
                      <span className="text-xs font-bold text-white drop-shadow-sm">
                        {milestoneProgress}%
                      </span>
                    </div>
                  </Progress>
                </div>

                {/* Bottom label */}
                <div className="flex justify-end mt-3">
                  <span className="text-sm text-muted-foreground">
                    {unlockedMilestones} / {milestones.length} Milestones
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Your Badges Section */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Your Badges</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {badges.map((badge) => (
                  <Card 
                    key={badge.id} 
                    className={`relative overflow-hidden transition-all hover:shadow-lg ${
                      badge.unlocked ? "bg-gradient-to-br from-background to-muted/30" : "bg-muted/30"
                    }`}
                  >
                    <CardContent className="p-4 flex flex-col items-center text-center">
                      {/* Badge Shield */}
                      <div className={`relative w-20 h-24 mb-3 ${!badge.unlocked ? "opacity-50 grayscale" : ""}`}>
                        {/* Shield Shape */}
                        <div 
                          className={`absolute inset-0 bg-gradient-to-b ${
                            badge.unlocked 
                              ? "from-emerald-400 to-emerald-600" 
                              : "from-gray-300 to-gray-400"
                          }`}
                          style={{ 
                            clipPath: "polygon(50% 0%, 100% 0%, 100% 70%, 50% 100%, 0% 70%, 0% 0%)" 
                          }}
                        >
                          {/* Inner highlight */}
                          <div 
                            className="absolute inset-1 bg-gradient-to-b from-white/30 to-transparent"
                            style={{ 
                              clipPath: "polygon(50% 0%, 100% 0%, 100% 70%, 50% 100%, 0% 70%, 0% 0%)" 
                            }} 
                          />
                          {/* Icon */}
                          <div className="absolute inset-0 flex items-center justify-center text-white">
                            {badge.unlocked ? badge.icon : <Lock className="h-8 w-8" />}
                          </div>
                        </div>
                        
                        {/* Ribbon */}
                        <div 
                          className={`absolute -bottom-1 left-1/2 -translate-x-1/2 px-3 py-1 rounded-sm text-xs font-medium text-white shadow-md whitespace-nowrap ${
                            badge.unlocked 
                              ? "bg-gradient-to-r from-amber-400 to-amber-500" 
                              : "bg-gradient-to-r from-gray-400 to-gray-500"
                          }`}
                        >
                          {badge.title}
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="font-semibold text-sm mb-1">{badge.title}</h3>
                      
                      {/* Description */}
                      <p className="text-xs text-muted-foreground mb-2">{badge.description}</p>
                      
                      {/* Status */}
                      {badge.unlocked ? (
                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                          Unlocked
                        </Badge>
                      ) : badge.progress ? (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Lock className="h-3 w-3" />
                          <span>{badge.progress.current} / {badge.progress.total}</span>
                        </div>
                      ) : (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground">
                          Locked
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Badges Tab */}
          <TabsContent value="badges" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {badges.map((badge) => (
                <Card 
                  key={badge.id} 
                  className={`relative overflow-hidden transition-all hover:shadow-lg ${
                    badge.unlocked ? "bg-gradient-to-br from-background to-muted/30" : "bg-muted/30"
                  }`}
                >
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    {/* Badge Shield */}
                    <div className={`relative w-20 h-24 mb-3 ${!badge.unlocked ? "opacity-50 grayscale" : ""}`}>
                      {/* Shield Shape */}
                      <div 
                        className={`absolute inset-0 bg-gradient-to-b ${
                          badge.unlocked 
                            ? "from-emerald-400 to-emerald-600" 
                            : "from-gray-300 to-gray-400"
                        }`}
                        style={{ 
                          clipPath: "polygon(50% 0%, 100% 0%, 100% 70%, 50% 100%, 0% 70%, 0% 0%)" 
                        }}
                      >
                        {/* Inner highlight */}
                        <div 
                          className="absolute inset-1 bg-gradient-to-b from-white/30 to-transparent"
                          style={{ 
                            clipPath: "polygon(50% 0%, 100% 0%, 100% 70%, 50% 100%, 0% 70%, 0% 0%)" 
                          }} 
                        />
                        {/* Icon */}
                        <div className="absolute inset-0 flex items-center justify-center text-white">
                          {badge.unlocked ? badge.icon : <Lock className="h-8 w-8" />}
                        </div>
                      </div>
                      
                      {/* Ribbon */}
                      <div 
                        className={`absolute -bottom-1 left-1/2 -translate-x-1/2 px-3 py-1 rounded-sm text-xs font-medium text-white shadow-md whitespace-nowrap ${
                          badge.unlocked 
                            ? "bg-gradient-to-r from-amber-400 to-amber-500" 
                            : "bg-gradient-to-r from-gray-400 to-gray-500"
                        }`}
                      >
                        {badge.title}
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="font-semibold text-sm mb-1">{badge.title}</h3>
                    
                    {/* Description */}
                    <p className="text-xs text-muted-foreground mb-2">{badge.description}</p>
                    
                    {/* Status */}
                    {badge.unlocked ? (
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                        Unlocked
                      </Badge>
                    ) : badge.progress ? (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Lock className="h-3 w-3" />
                        <span>{badge.progress.current} / {badge.progress.total}</span>
                      </div>
                    ) : (
                      <Badge variant="secondary" className="bg-muted text-muted-foreground">
                        Locked
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Achievements;
