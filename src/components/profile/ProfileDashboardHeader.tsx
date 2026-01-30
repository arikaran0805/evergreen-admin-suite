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
              <div className="relative flex items-center justify-center min-h-[80px]">
                {/* Emoji-style Flame SVG behind */}
                <svg
                  viewBox="0 0 120 140"
                  className="absolute w-24 h-28 -top-4"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="flameOuter" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#DC2626" />
                      <stop offset="40%" stopColor="#EA580C" />
                      <stop offset="100%" stopColor="#F97316" />
                    </linearGradient>
                    <linearGradient id="flameMiddle" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#F97316" />
                      <stop offset="50%" stopColor="#FB923C" />
                      <stop offset="100%" stopColor="#FBBF24" />
                    </linearGradient>
                    <linearGradient id="flameInner" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#FBBF24" />
                      <stop offset="60%" stopColor="#FDE047" />
                      <stop offset="100%" stopColor="#FEF9C3" />
                    </linearGradient>
                    <radialGradient id="flameCore" cx="50%" cy="70%" r="50%">
                      <stop offset="0%" stopColor="#FFFBEB" />
                      <stop offset="100%" stopColor="#FEF3C7" />
                    </radialGradient>
                  </defs>
                  
                  {/* Left flame tip */}
                  <path d="M30 85 Q15 50 35 20 Q30 50 40 70 Q35 80 30 85Z" fill="#DC2626" />
                  {/* Right flame tip */}
                  <path d="M90 85 Q105 50 85 20 Q90 50 80 70 Q85 80 90 85Z" fill="#EA580C" />
                  
                  {/* Main outer flame */}
                  <path d="M60 5 Q25 50 25 85 Q25 120 60 125 Q95 120 95 85 Q95 50 60 5Z" fill="url(#flameOuter)" />
                  
                  {/* Middle flame layer */}
                  <path d="M60 25 Q35 60 35 88 Q35 112 60 115 Q85 112 85 88 Q85 60 60 25Z" fill="url(#flameMiddle)" />
                  
                  {/* Inner flame layer */}
                  <path d="M60 45 Q42 72 42 92 Q42 108 60 110 Q78 108 78 92 Q78 72 60 45Z" fill="url(#flameInner)" />
                  
                  {/* Core glow */}
                  <ellipse cx="60" cy="98" rx="14" ry="16" fill="url(#flameCore)" />
                </svg>
                
                {/* Count */}
                <span className="relative z-10 text-4xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
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
