import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Flame, Target, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  fullName: string;
  avatarUrl: string;
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
  avatarUrl,
  careerName,
  currentStreak,
  maxStreak,
  currentCourse,
  focusMessage = "Continue your learning",
  focusSubtext = "Pick up where you left off",
}: Props) => {
  const initials = fullName?.charAt(0)?.toUpperCase() || "U";
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

      <CardContent className="relative p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-center">
          {/* Left Section — User Identity */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16 md:h-18 md:w-18 ring-[3px] ring-primary/30 ring-offset-2 ring-offset-background shadow-lg">
                <AvatarImage src={avatarUrl} alt={fullName} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground font-medium tracking-wide uppercase">
                Welcome back!
              </span>
              <h2 className="text-xl md:text-2xl font-bold text-foreground leading-tight">
                {fullName || "Learner"}
              </h2>
              <p className="text-sm text-muted-foreground">
                Aspiring <span className="text-primary font-medium">{careerName}</span>
              </p>
              {/* State indicator */}
              <p className="text-xs text-muted-foreground/80 mt-1 flex items-center gap-1.5">
                {isOnTrack ? (
                  <>
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                    <span>On track</span>
                    {currentCourse && (
                      <>
                        <span className="text-muted-foreground/50">·</span>
                        <span>{currentCourse} in progress</span>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <BookOpen className="h-3 w-3" />
                    <span>Ready to learn</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Center Section — Contextual Focus */}
          <div className="flex justify-center">
            <div className="flex flex-col items-center text-center px-6 py-4 rounded-xl bg-background/60 backdrop-blur-sm border border-border/50 shadow-sm max-w-xs">
              <div className="flex items-center gap-2 mb-1.5">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Today's Focus
                </span>
              </div>
              <p className="text-base font-semibold text-foreground leading-snug">
                {focusMessage}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {focusSubtext}
              </p>
            </div>
          </div>

          {/* Right Section — Streak Summary */}
          <div className="flex justify-center md:justify-end">
            <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 border border-amber-500/25 shadow-md shadow-amber-500/10">
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/40">
                  <Flame className="h-7 w-7 text-white drop-shadow-md" />
                </div>
                {currentStreak > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 flex items-center justify-center text-[10px] shadow-sm">
                    🔥
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-medium text-foreground/70">Learning Streak</span>
                  <span className="text-[10px] text-muted-foreground">· max {maxStreak}</span>
                </div>
                <p className="text-2xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                  {currentStreak} Day{currentStreak !== 1 ? "s" : ""}{" "}
                  {currentStreak > 0 && <span className="text-amber-500">🔥</span>}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
