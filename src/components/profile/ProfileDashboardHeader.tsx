import { Card, CardContent } from "@/components/ui/card";
import { Target, BookOpen, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  fullName: string;
  careerName: string;
  currentStreak: number;
  maxStreak: number;
  currentCourse?: string;
  focusMessage?: string;
  focusSubtext?: string;
};

export const ProfileDashboardHeader = ({
  className,
  fullName,
  careerName,
  currentStreak,
  maxStreak,
  focusMessage = "Continue your learning",
  focusSubtext = "Pick up where you left off",
}: Props) => {
  const isOnTrack = currentStreak > 0;

  return (
    <Card
      className={cn(
        "relative overflow-hidden rounded-2xl border-0",
        "bg-gradient-to-r from-primary/8 via-primary/5 to-accent/8",
        "shadow-lg shadow-primary/5",
        className
      )}
    >
      {/* Subtle background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 opacity-50" />
      <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl translate-x-1/4 translate-y-1/4" />

      <CardContent className="relative p-3 md:p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
          {/* Left Section — Identity Block */}
          <div className="flex flex-col gap-1">
            <h2 className="text-xl md:text-2xl font-bold text-foreground leading-tight tracking-tight">
              {fullName || "Learner"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Aspiring <span className="text-primary font-medium">{careerName}</span>
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1 flex items-center gap-1.5">
              {isOnTrack ? (
                <>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>On track</span>
                </>
              ) : (
                <>
                  <BookOpen className="h-3 w-3" />
                  <span>Ready to learn</span>
                </>
              )}
            </p>
          </div>

          {/* Right Section — Focus + Streak grouped */}
          <div className="flex items-center gap-3 md:ml-auto">
            {/* Today's Focus Card - clean style matching Weekly Activity */}
            <div className="flex flex-col items-center text-center px-5 py-3 rounded-xl bg-card border border-border shadow-sm max-w-sm">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                  Today's Focus
                </span>
              </div>
              <p className="text-base md:text-lg font-semibold text-foreground leading-snug">
                {focusMessage}
              </p>
              <p className="text-xs text-muted-foreground mt-1.5">
                {focusSubtext}
              </p>
            </div>

            {/* Streak Display */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-background/80 backdrop-blur-sm border border-primary/10 h-full">
              {/* Orange gradient circle with flame */}
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
                <Flame className="w-6 h-6 text-white" />
              </div>
              {/* Text section */}
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">
                  Streak · max {maxStreak}
                </span>
                <span className="text-xl font-bold text-primary">
                  {currentStreak} Days
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};