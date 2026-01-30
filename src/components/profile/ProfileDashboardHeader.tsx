import { Card, CardContent } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  fullName: string;
  careerName: string;
  currentStreak: number;
};

export const ProfileDashboardHeader = ({
  className,
  fullName,
  careerName,
  currentStreak,
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

      <CardContent className="relative p-4 md:p-5">
        {/* Identity Block */}
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
      </CardContent>
    </Card>
  );
};