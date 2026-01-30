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
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr_auto] gap-5 md:gap-6 items-center">
          {/* Left Section — User Identity */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-14 w-14 md:h-16 md:w-16 ring-2 ring-primary/20 ring-offset-2 ring-offset-background shadow-md">
                <AvatarImage src={avatarUrl} alt={fullName} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-lg font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] text-muted-foreground font-medium tracking-wide uppercase">
                Welcome back
              </span>
              <h2 className="text-lg md:text-xl font-bold text-foreground leading-tight">
                {fullName || "Learner"}
              </h2>
              <p className="text-sm text-muted-foreground">
                Aspiring <span className="text-primary font-medium">{careerName}</span>
              </p>
              {/* State indicator */}
              <p className="text-xs text-muted-foreground/80 mt-0.5 flex items-center gap-1.5">
                {isOnTrack ? (
                  <>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Status: On track</span>
                  </>
                ) : (
                  <>
                    <BookOpen className="h-3 w-3" />
                    <span>Status: Ready to learn</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Center Section — Contextual Focus (Primary Action) */}
          <div className="flex justify-center">
            <div className="relative flex flex-col items-center text-center px-8 py-5 rounded-2xl bg-background/80 backdrop-blur-sm border border-primary/10 shadow-lg shadow-primary/8 w-full max-w-sm transition-all duration-200 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/20 hover:-translate-y-0.5">
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

          {/* Right Section — Streak Summary (De-emphasized) */}
          <div className="flex justify-center md:justify-end">
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400/80 to-orange-500/80 flex items-center justify-center shadow-sm">
                <Flame className="h-4 w-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-medium text-muted-foreground leading-tight">
                  Streak · max {maxStreak}
                </span>
                <p className="text-lg font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent leading-tight">
                  {currentStreak} Day{currentStreak !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
