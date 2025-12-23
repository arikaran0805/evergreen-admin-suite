import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, endOfWeek, eachDayOfInterval, subDays } from "date-fns";

const toDayKey = (d: Date) => {
  const safe = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
  return safe.toISOString().slice(0, 10);
};

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
  const [maxMinutes, setMaxMinutes] = useState(30); // Default max for scaling

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
        .gte('tracked_date', toDayKey(weekStart))
        .lte('tracked_date', toDayKey(weekEnd));

      // Create week days with activity data
      const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const shortDayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

      let weekTotal = 0;
      let maxDayMinutes = 30; // Lower minimum scale for better visibility

      const activityDays: DayActivity[] = daysOfWeek.map((date, index) => {
        const dateStr = toDayKey(date);
        const dayTimeRecords = timeData?.filter(t => t.tracked_date === dateStr) || [];
        const totalSeconds = dayTimeRecords.reduce((sum, t) => sum + t.duration_seconds, 0);
        const totalMinutes = Math.floor(totalSeconds / 60);
        weekTotal += totalMinutes;
        if (totalMinutes > maxDayMinutes) maxDayMinutes = totalMinutes;

        return {
          day: dayNames[index],
          shortDay: shortDayNames[index],
          date,
          hasActivity: totalSeconds > 0, // Show activity even for < 1 minute
          totalMinutes,
        };
      });

      setWeekDays(activityDays);
      setTotalWeekMinutes(weekTotal);
      setMaxMinutes(Math.max(maxDayMinutes, 30)); // At least 30 min scale

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

      const todayStr = toDayKey(today);
      const todaySeconds = dailyTotals.get(todayStr) || 0;
      const hasActivityToday = todaySeconds > 0;

      // Get and update max streak from profile (including freeze info)
      const { data: profile } = await supabase
        .from('profiles')
        .select('max_streak, current_streak, last_activity_date, last_freeze_date')
        .eq('id', user.id)
        .single();

      const storedMaxStreak = (profile as any)?.max_streak || 0;
      const lastFreezeDate = (profile as any)?.last_freeze_date;

      // Recalculate streak - count consecutive days with activity (including today)
      let recalculatedStreak = 0;
      let checkDate = today;
      
      // If no activity today and not frozen, start checking from yesterday
      const todayFrozen = lastFreezeDate === todayStr;
      if (!hasActivityToday && !todayFrozen) {
        checkDate = subDays(today, 1);
      }

      // Count consecutive days with activity going backwards
      for (let i = 0; i < 365; i++) {
        const dateStr = toDayKey(checkDate);
        const daySeconds = dailyTotals.get(dateStr) || 0;
        const wasFrozen = lastFreezeDate === dateStr;

        if (daySeconds > 0 || wasFrozen) {
          recalculatedStreak++;
          checkDate = subDays(checkDate, 1);
        } else {
          break;
        }
      }

      const newMaxStreak = Math.max(recalculatedStreak, storedMaxStreak);

      // Always update profile with current streak
      await supabase
        .from('profiles')
        .update({ 
          max_streak: newMaxStreak,
          current_streak: recalculatedStreak,
          last_activity_date: hasActivityToday ? todayStr : (profile as any)?.last_activity_date
        } as any)
        .eq('id', user.id);

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
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg font-bold">Weekly Activity</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bar Chart */}
        <div className="flex items-end justify-between gap-3 h-36 px-2">
          {weekDays.map((day, index) => {
            const isToday = index === currentDayIndex;
            const heightPercent = maxMinutes > 0 ? (day.totalMinutes / maxMinutes) * 100 : 0;
            
            return (
              <div
                key={day.day + index}
                className="flex-1 flex flex-col items-center gap-2"
              >
                <div 
                  className="w-full relative flex items-end justify-center"
                  style={{ height: '90px' }}
                >
                  <div
                    className={cn(
                      "w-full max-w-8 rounded-lg transition-all duration-500",
                      isToday 
                        ? "bg-primary shadow-lg shadow-primary/30" 
                        : day.hasActivity 
                          ? "bg-primary/70" 
                          : "bg-muted/50"
                    )}
                    style={{ 
                      height: day.hasActivity ? `${Math.max(heightPercent, 15)}%` : '6px',
                      minHeight: day.hasActivity ? '12px' : '6px'
                    }}
                  />
                </div>
                <span className={cn(
                  "text-xs font-semibold",
                  isToday ? "text-primary" : "text-muted-foreground"
                )}>
                  {day.shortDay}
                </span>
              </div>
            );
          })}
        </div>

        {/* Stats Row */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs">Total Time</span>
            <span className="font-bold text-lg">{totalWeekMinutes > 0 ? formatDuration(totalWeekMinutes) : '0 min'}</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-muted-foreground text-xs">Active Days</span>
            <span className="font-bold text-lg">{activeDays} / 7</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
