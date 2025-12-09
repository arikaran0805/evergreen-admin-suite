import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DayActivity {
  day: string;
  shortDay: string;
  completed: boolean;
  lessonsCompleted: number;
}

interface WeeklyActivityTrackerProps {
  className?: string;
}

export const WeeklyActivityTracker = ({ className }: WeeklyActivityTrackerProps) => {
  // Get current week's days
  const today = new Date();
  const currentDayIndex = today.getDay();
  
  const weekDays: DayActivity[] = [
    { day: 'Sunday', shortDay: 'S', completed: false, lessonsCompleted: 0 },
    { day: 'Monday', shortDay: 'M', completed: false, lessonsCompleted: 0 },
    { day: 'Tuesday', shortDay: 'T', completed: false, lessonsCompleted: 0 },
    { day: 'Wednesday', shortDay: 'W', completed: false, lessonsCompleted: 0 },
    { day: 'Thursday', shortDay: 'T', completed: false, lessonsCompleted: 0 },
    { day: 'Friday', shortDay: 'F', completed: false, lessonsCompleted: 0 },
    { day: 'Saturday', shortDay: 'S', completed: false, lessonsCompleted: 0 },
  ];

  // Calculate streak
  const streak = 0;
  const completedDays = weekDays.filter(d => d.completed).length;

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
