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
                {/* Emoji-style Flame SVG behind */}
                <svg
                  viewBox="0 0 100 120"
                  className="absolute w-20 h-24 -top-3 opacity-95"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Left small flame tip - red */}
                  <path
                    d="M25 70C20 55 22 40 30 30C28 45 32 55 35 65C30 68 26 70 25 70Z"
                    fill="#EF4444"
                  />
                  {/* Right small flame tip - red-orange */}
                  <path
                    d="M75 70C80 55 78 40 70 30C72 45 68 55 65 65C70 68 74 70 75 70Z"
                    fill="#F97316"
                  />
                  {/* Main outer flame - red to orange gradient */}
                  <path
                    d="M50 8C50 8 20 45 20 75C20 98 33 112 50 112C67 112 80 98 80 75C80 45 50 8 50 8Z"
                    fill="url(#outerGradient)"
                  />
                  {/* Middle flame - orange to yellow */}
                  <path
                    d="M50 28C50 28 28 55 28 78C28 94 37 104 50 104C63 104 72 94 72 78C72 55 50 28 50 28Z"
                    fill="url(#middleGradient)"
                  />
                  {/* Inner flame - yellow */}
                  <path
                    d="M50 50C50 50 36 68 36 82C36 92 42 98 50 98C58 98 64 92 64 82C64 68 50 50 50 50Z"
                    fill="url(#innerGradient)"
                  />
                  {/* Core glow - white/cream */}
                  <ellipse
                    cx="50"
                    cy="88"
                    rx="10"
                    ry="12"
                    fill="url(#coreGradient)"
                  />
                  {/* Gradients */}
                  <defs>
                    <linearGradient id="outerGradient" x1="50" y1="8" x2="50" y2="112" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#DC2626" />
                      <stop offset="50%" stopColor="#F97316" />
                      <stop offset="100%" stopColor="#FB923C" />
                    </linearGradient>
                    <linearGradient id="middleGradient" x1="50" y1="28" x2="50" y2="104" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#F97316" />
                      <stop offset="60%" stopColor="#FBBF24" />
                      <stop offset="100%" stopColor="#FDE047" />
                    </linearGradient>
                    <linearGradient id="innerGradient" x1="50" y1="50" x2="50" y2="98" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#FBBF24" />
                      <stop offset="100%" stopColor="#FEF3C7" />
                    </linearGradient>
                    <radialGradient id="coreGradient" cx="50" cy="88" r="12" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#FFFBEB" />
                      <stop offset="100%" stopColor="#FEF3C7" stopOpacity="0.6" />
                    </radialGradient>
                  </defs>
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
