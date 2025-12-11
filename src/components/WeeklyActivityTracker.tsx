import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, CheckCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, endOfWeek, eachDayOfInterval, subDays } from "date-fns";

interface DayActivity {
  day: string;
  shortDay: string;
  date: Date;
  hasActivity: boolean;
  totalMinutes: number;
}

interface WeeklyActivityTrackerProps {
  className?: string;
}

const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

export const WeeklyActivityTracker = ({ className }: WeeklyActivityTrackerProps) => {
  const [weekDays, setWeekDays] = useState<DayActivity[]>([]);
  const [streak, setStreak] = useState(0);
  const [totalWeekMinutes, setTotalWeekMinutes] = useState(0);
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

      // Get time tracking data for this week
      const { data: timeData } = await supabase
        .from('lesson_time_tracking')
        .select('tracked_date, duration_seconds')
        .eq('user_id', user.id)
        .gte('tracked_date', weekStart.toISOString().split('T')[0])
        .lte('tracked_date', weekEnd.toISOString().split('T')[0]);

      // Create week days with activity data
      const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const shortDayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

      let weekTotal = 0;

      const activityDays: DayActivity[] = daysOfWeek.map((date, index) => {
        const dateStr = date.toISOString().split('T')[0];
        const dayTimeRecords = timeData?.filter(t => t.tracked_date === dateStr) || [];
        const totalSeconds = dayTimeRecords.reduce((sum, t) => sum + t.duration_seconds, 0);
        const totalMinutes = Math.floor(totalSeconds / 60);
        weekTotal += totalMinutes;

        return {
          day: dayNames[index],
          shortDay: shortDayNames[index],
          date,
          hasActivity: totalMinutes > 0,
          totalMinutes,
        };
      });

      setWeekDays(activityDays);
      setTotalWeekMinutes(weekTotal);

      // Calculate streak (consecutive days with activity)
      const { data: allTimeData } = await supabase
        .from('lesson_time_tracking')
        .select('tracked_date, duration_seconds')
        .eq('user_id', user.id)
        .order('tracked_date', { ascending: false });

      // Group by date and sum durations
      const dailyTotals = new Map<string, number>();
      allTimeData?.forEach(record => {
        const existing = dailyTotals.get(record.tracked_date) || 0;
        dailyTotals.set(record.tracked_date, existing + record.duration_seconds);
      });

      let currentStreak = 0;
      let checkDate = today;
      
      // Check if user has activity today
      const todayStr = today.toISOString().split('T')[0];
      const todayMinutes = Math.floor((dailyTotals.get(todayStr) || 0) / 60);
      
      if (todayMinutes === 0) {
        checkDate = subDays(today, 1);
      }

      // Count consecutive days
      for (let i = 0; i < 365; i++) {
        const dateStr = checkDate.toISOString().split('T')[0];
        const dayMinutes = Math.floor((dailyTotals.get(dateStr) || 0) / 60);

        if (dayMinutes > 0) {
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
  const activeDays = weekDays.filter(d => d.hasActivity).length;

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
                title={day.hasActivity ? `${formatDuration(day.totalMinutes)} reading` : 'No activity'}
              >
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center transition-all",
                    day.hasActivity 
                      ? "bg-primary text-primary-foreground" 
                      : isToday
                        ? "border-2 border-primary bg-primary/10"
                        : isPast
                          ? "bg-muted text-muted-foreground"
                          : "border border-border bg-background"
                  )}
                >
                  {day.hasActivity ? (
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
        
        <div className="mt-4 pt-4 border-t space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>This week</span>
            </div>
            <span className="font-semibold text-primary">{formatDuration(totalWeekMinutes)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Active days</span>
            <span className="font-medium">{activeDays}/7</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
