import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, endOfWeek, format, eachDayOfInterval, isSameDay, subDays } from "date-fns";

interface DayActivity {
  day: string;
  shortDay: string;
  date: Date;
  completed: boolean;
  lessonsCompleted: number;
}

interface WeeklyActivityTrackerProps {
  className?: string;
}

export const WeeklyActivityTracker = ({ className }: WeeklyActivityTrackerProps) => {
  const [weekDays, setWeekDays] = useState<DayActivity[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivityData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 0 });

      // Get lesson completions for this week
      const { data: completions } = await supabase
        .from('lesson_progress')
        .select('viewed_at, completed')
        .eq('user_id', user.id)
        .eq('completed', true)
        .gte('viewed_at', weekStart.toISOString())
        .lte('viewed_at', weekEnd.toISOString());

      // Create week days with activity data
      const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const shortDayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

      const activityDays: DayActivity[] = daysOfWeek.map((date, index) => {
        const dayCompletions = completions?.filter(c => 
          isSameDay(new Date(c.viewed_at), date)
        ) || [];

        return {
          day: dayNames[index],
          shortDay: shortDayNames[index],
          date,
          completed: dayCompletions.length > 0,
          lessonsCompleted: dayCompletions.length,
        };
      });

      setWeekDays(activityDays);

      // Calculate streak (consecutive days with completions ending today or yesterday)
      const { data: allCompletions } = await supabase
        .from('lesson_progress')
        .select('viewed_at')
        .eq('user_id', user.id)
        .eq('completed', true)
        .order('viewed_at', { ascending: false });

      let currentStreak = 0;
      let checkDate = today;
      
      // Check if user completed something today, if not start from yesterday
      const todayCompletions = allCompletions?.filter(c => 
        isSameDay(new Date(c.viewed_at), today)
      ) || [];
      
      if (todayCompletions.length === 0) {
        checkDate = subDays(today, 1);
      }

      // Count consecutive days
      for (let i = 0; i < 365; i++) {
        const dayCompletions = allCompletions?.filter(c => 
          isSameDay(new Date(c.viewed_at), checkDate)
        ) || [];

        if (dayCompletions.length > 0) {
          currentStreak++;
          checkDate = subDays(checkDate, 1);
        } else {
          break;
        }
      }

      setStreak(currentStreak);
      setLoading(false);
    };

    fetchActivityData();
  }, []);

  const today = new Date();
  const currentDayIndex = today.getDay();
  const completedDays = weekDays.filter(d => d.completed).length;

  if (loading) {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Weekly Activity</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
            Loading activity...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Weekly Activity</CardTitle>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <span className="font-bold text-primary">{streak}</span>
            <span className="text-muted-foreground">day streak</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-2">
          {weekDays.map((day, index) => {
            const isToday = index === currentDayIndex;
            const isPast = index < currentDayIndex;
            
            return (
              <div
                key={day.day}
                className="flex flex-col items-center gap-1.5"
                title={day.completed ? `${day.lessonsCompleted} lesson${day.lessonsCompleted > 1 ? 's' : ''} completed` : ''}
              >
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center transition-all",
                    day.completed 
                      ? "bg-primary text-primary-foreground" 
                      : isToday
                        ? "border-2 border-primary bg-primary/10"
                        : isPast
                          ? "bg-muted text-muted-foreground"
                          : "border border-border bg-background"
                  )}
                >
                  {day.completed ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <span className="text-xs font-medium">{day.shortDay}</span>
                  )}
                </div>
                <span className={cn(
                  "text-xs",
                  isToday ? "font-semibold text-primary" : "text-muted-foreground"
                )}>
                  {isToday ? 'Today' : day.shortDay}
                </span>
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
          <span className="text-muted-foreground">This week</span>
          <span className="font-medium">{completedDays}/7 days active</span>
        </div>
      </CardContent>
    </Card>
  );
};
