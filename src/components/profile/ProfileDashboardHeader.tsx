import { Flame, Target, BookOpen } from "lucide-react";
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
    <div
      className={cn(
        "relative py-6 md:py-8",
        className
      )}
    >
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.03] via-transparent to-accent/[0.03] rounded-2xl" />

      <div className="relative grid grid-cols-1 md:grid-cols-[1fr_1.5fr_auto] gap-6 md:gap-8 items-center">
        {/* Left — Identity Anchor (Quiet) */}
        <div className="flex flex-col gap-0.5">
          <h2 className="text-lg font-semibold text-foreground/90 tracking-tight">
            {fullName || "Learner"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Aspiring <span className="text-primary/80 font-medium">{careerName}</span>
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1 flex items-center gap-1.5">
            {isOnTrack ? (
              <>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
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

        {/* Center — Today's Focus (Visual Gravity) */}
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-primary/70" />
            <span className="text-[11px] font-semibold text-primary/70 uppercase tracking-widest">
              Today's Focus
            </span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-foreground leading-snug tracking-tight">
            {focusMessage}
          </p>
          <p className="text-sm text-muted-foreground/70 mt-1.5 max-w-sm">
            {focusSubtext}
          </p>
        </div>

        {/* Right — Streak Badge (Minimal Inline) */}
        <div className="flex justify-center md:justify-end">
          <div className="inline-flex items-center gap-2 text-sm">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400/90 to-orange-500/90 flex items-center justify-center">
              <Flame className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-base font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                {currentStreak}
              </span>
              <span className="text-[10px] text-muted-foreground/60">
                day{currentStreak !== 1 ? "s" : ""} · max {maxStreak}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
