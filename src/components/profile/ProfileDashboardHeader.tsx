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
            <div className="flex flex-col items-center gap-1.5 px-6 py-4 rounded-2xl bg-gradient-to-br from-stone-800 to-stone-900">
              {/* Flame + Count - Flame behind */}
              <div className="relative flex items-center justify-center">
                {/* Flame SVG behind */}
                <svg
                  viewBox="0 0 64 80"
                  className="absolute w-16 h-20 -top-2 opacity-90"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Outer flame - dark orange */}
                  <path
                    d="M32 4C32 4 12 24 12 44C12 60 20 76 32 76C44 76 52 60 52 44C52 24 32 4 32 4Z"
                    fill="#D97706"
                  />
                  {/* Middle flame - orange */}
                  <path
                    d="M32 18C32 18 18 34 18 48C18 60 24 68 32 68C40 68 46 60 46 48C46 34 32 18 32 18Z"
                    fill="#F59E0B"
                  />
                  {/* Inner flame - yellow */}
                  <path
                    d="M32 34C32 34 24 44 24 52C24 58 27 62 32 62C37 62 40 58 40 52C40 44 32 34 32 34Z"
                    fill="#FCD34D"
                  />
                </svg>
                {/* Count */}
                <span className="relative z-10 text-4xl font-bold text-white drop-shadow-lg">
                  {currentStreak}
                </span>
              </div>
              {/* Label */}
              <span className="text-xs font-medium text-amber-400">
                day streak!
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
