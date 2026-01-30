import { Flame } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStreak: number;
  onContinue: () => void;
};

const getMilestone = (streak: number): number => {
  const milestones = [7, 14, 30, 60, 90, 180, 365];
  return milestones.find((m) => m > streak) ?? streak + 30;
};

const getMessage = (streak: number): string => {
  if (streak >= 365) return "A year of dedication. You've built something remarkable.";
  if (streak >= 90) return "Three months of consistency. This is how careers are built.";
  if (streak >= 30) return "A full month. Your commitment is showing real results.";
  if (streak >= 14) return "Two weeks strong. You're building a lasting habit.";
  if (streak >= 7) return "One week down. Consistency compounds over time.";
  if (streak >= 3) return "You're finding your rhythm. Keep showing up.";
  return "Every day counts. You're on the right path.";
};

export const StreakCelebrationModal = ({
  open,
  onOpenChange,
  currentStreak,
  onContinue,
}: Props) => {
  const nextMilestone = getMilestone(currentStreak);
  const progressToMilestone = Math.round((currentStreak / nextMilestone) * 100);
  const daysToMilestone = nextMilestone - currentStreak;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-0 bg-gradient-to-b from-background to-muted/30 shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Streak Celebration</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center text-center py-6 px-2">
          {/* Flame Icon with Glow */}
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-400/20 to-orange-500/20 rounded-full blur-2xl scale-150" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Flame className="h-10 w-10 text-white" />
            </div>
          </div>

          {/* Day Count */}
          <div className="mb-4">
            <span className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
              {currentStreak}
            </span>
            <span className="block text-sm text-muted-foreground mt-1 font-medium tracking-wide">
              {currentStreak === 1 ? "Day" : "Days"} of Learning
            </span>
          </div>

          {/* Motivational Message */}
          <p className="text-base text-foreground/90 max-w-xs leading-relaxed mb-8">
            {getMessage(currentStreak)}
          </p>

          {/* Subtle Progress Indicator */}
          <div className="w-full max-w-xs mb-8">
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>Today</span>
              <span>{nextMilestone} day milestone</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
                style={{ width: `${progressToMilestone}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {daysToMilestone} {daysToMilestone === 1 ? "day" : "days"} to go
            </p>
          </div>

          {/* Primary CTA */}
          <Button
            onClick={() => {
              onContinue();
              onOpenChange(false);
            }}
            className={cn(
              "w-full max-w-xs h-12 text-base font-medium",
              "bg-gradient-to-r from-primary to-primary/90",
              "hover:from-primary/90 hover:to-primary/80",
              "shadow-lg shadow-primary/20 transition-all duration-200"
            )}
          >
            Continue Today's Focus
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
