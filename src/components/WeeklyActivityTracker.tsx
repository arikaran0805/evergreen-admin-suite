import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Clock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, endOfWeek, eachDayOfInterval, subDays, format } from "date-fns";

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
  const [totalWeekMinutes, setTotalWeekMinutes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [maxMinutes, setMaxMinutes] = useState(60); // Default max for scaling

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
      const shortDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      let weekTotal = 0;
      let maxDayMinutes = 60; // Minimum scale

      const activityDays: DayActivity[] = daysOfWeek.map((date, index) => {
        const dateStr = date.toISOString().split('T')[0];
        const dayTimeRecords = timeData?.filter(t => t.tracked_date === dateStr) || [];
        const totalSeconds = dayTimeRecords.reduce((sum, t) => sum + t.duration_seconds, 0);
        const totalMinutes = Math.floor(totalSeconds / 60);
        weekTotal += totalMinutes;
        if (totalMinutes > maxDayMinutes) maxDayMinutes = totalMinutes;

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
      setMaxMinutes(Math.max(maxDayMinutes, 60)); // At least 60 min scale

      // Calculate streak for profile update
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

      const todayStr = today.toISOString().split('T')[0];
      const todayMinutes = Math.floor((dailyTotals.get(todayStr) || 0) / 60);

      // Get and update max streak from profile (including freeze info)
      const { data: profile } = await supabase
        .from('profiles')
        .select('max_streak, current_streak, last_activity_date, last_freeze_date')
        .eq('id', user.id)
        .single();

      const storedMaxStreak = (profile as any)?.max_streak || 0;
      const lastActivityDate = (profile as any)?.last_activity_date;
      const lastFreezeDate = (profile as any)?.last_freeze_date;

      // Recalculate streak accounting for freeze dates
      let recalculatedStreak = 0;
      let streakCheckDate = today;
      
      const todayFrozen = lastFreezeDate === todayStr;
      
      if (todayMinutes === 0 && !todayFrozen) {
        streakCheckDate = subDays(today, 1);
      }

      for (let i = 0; i < 365; i++) {
        const dateStr = streakCheckDate.toISOString().split('T')[0];
        const dayMinutes = Math.floor((dailyTotals.get(dateStr) || 0) / 60);
        const wasFrozen = lastFreezeDate === dateStr;

        if (dayMinutes > 0 || wasFrozen) {
          recalculatedStreak++;
          streakCheckDate = subDays(streakCheckDate, 1);
        } else {
          break;
        }
      }

      const newMaxStreak = Math.max(recalculatedStreak, storedMaxStreak);

      // Update profile with current streak and max streak if needed
      if (recalculatedStreak > storedMaxStreak) {
        await supabase
          .from('profiles')
          .update({ 
            max_streak: recalculatedStreak,
            current_streak: recalculatedStreak,
            last_activity_date: todayStr
          } as any)
          .eq('id', user.id);
      } else {
        await supabase
          .from('profiles')
          .update({ 
            current_streak: recalculatedStreak,
            last_activity_date: todayMinutes > 0 ? todayStr : lastActivityDate
          } as any)
          .eq('id', user.id);
      }

      setLoading(false);
    };

    fetchActivityData();
  }, []);

  const today = new Date();
  const currentDayIndex = today.getDay();
  const activeDays = weekDays.filter(d => d.hasActivity).length;
  const avgMinutes = activeDays > 0 ? Math.round(totalWeekMinutes / activeDays) : 0;

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
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Loading activity...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Weekly Activity</CardTitle>
          </div>
          <span className="text-2xl font-bold text-primary">{formatDuration(totalWeekMinutes)}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bar Chart */}
        <div className="flex items-end justify-between gap-2 h-32">
          {weekDays.map((day, index) => {
            const isToday = index === currentDayIndex;
            const heightPercent = maxMinutes > 0 ? (day.totalMinutes / maxMinutes) * 100 : 0;
            
            return (
              <div
                key={day.day}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <span className="text-xs text-muted-foreground mb-1">
                  {day.totalMinutes > 0 ? formatDuration(day.totalMinutes) : ''}
                </span>
                <div 
                  className="w-full relative flex items-end justify-center"
                  style={{ height: '80px' }}
                >
                  <div
                    className={cn(
                      "w-full rounded-t-md transition-all duration-500",
                      isToday 
                        ? "bg-primary" 
                        : day.hasActivity 
                          ? "bg-primary/60" 
                          : "bg-muted"
                    )}
                    style={{ 
                      height: day.hasActivity ? `${Math.max(heightPercent, 8)}%` : '4px',
                      minHeight: day.hasActivity ? '8px' : '4px'
                    }}
                  />
                </div>
                <span className={cn(
                  "text-xs font-medium",
                  isToday ? "text-primary" : "text-muted-foreground"
                )}>
                  {day.shortDay}
                </span>
              </div>
            );
          })}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t">
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-xs">Total</span>
            </div>
            <span className="font-semibold text-sm">{formatDuration(totalWeekMinutes)}</span>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-xs">Avg/Day</span>
            </div>
            <span className="font-semibold text-sm">{formatDuration(avgMinutes)}</span>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <Activity className="h-3.5 w-3.5" />
              <span className="text-xs">Active</span>
            </div>
            <span className="font-semibold text-sm">{activeDays}/7 days</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
