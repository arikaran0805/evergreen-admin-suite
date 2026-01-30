import { Card, CardContent } from "@/components/ui/card";
import { Target, BookOpen } from "lucide-react";
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

      <CardContent className="relative p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr_auto] gap-4 md:gap-5 items-center">
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

          {/* Center Section — Contextual Focus (Primary Action) */}
          <div className="flex justify-center">
            <div className="relative flex flex-col items-center text-center px-6 py-4 rounded-2xl bg-background/80 backdrop-blur-sm border border-primary/10 shadow-lg shadow-primary/8 w-full max-w-sm transition-all duration-200 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/20 hover:-translate-y-0.5">
              {/* Subtle glow behind */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 rounded-2xl" />
              <div className="relative z-10">
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
            </div>
          </div>

          {/* Right Section — Streak Display */}
          <div className="flex justify-center md:justify-end">
            <div className="flex flex-col items-center gap-1 px-4 py-3 rounded-2xl bg-slate-900/90 dark:bg-slate-900">
              {/* Flame Icon */}
              <div className="relative">
                <svg
                  viewBox="0 0 48 56"
                  className="w-10 h-12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Outer flame */}
                  <path
                    d="M24 2C24 2 8 18 8 32C8 44 15 54 24 54C33 54 40 44 40 32C40 18 24 2 24 2Z"
                    fill="url(#flameGradient)"
                  />
                  {/* Inner flame (white) */}
                  <path
                    d="M24 22C24 22 18 30 18 38C18 44 20 48 24 48C28 48 30 44 30 38C30 30 24 22 24 22Z"
                    fill="white"
                  />
                  <defs>
                    <linearGradient id="flameGradient" x1="24" y1="2" x2="24" y2="54" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#F59E0B" />
                      <stop offset="1" stopColor="#EA580C" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              {/* Day Count */}
              <span className="text-2xl font-bold text-white leading-none">
                {currentStreak}
              </span>
              {/* Label */}
              <span className="text-xs font-medium text-amber-400 leading-tight">
                day streak!
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
