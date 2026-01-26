import { Link } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProgressTeaserProps {
  className?: string;
}

/**
 * Inline teaser shown to guests where progress bar would appear
 * Encourages sign-in to track progress
 */
export const ProgressTeaser = ({ className = "" }: ProgressTeaserProps) => {
  return (
    <div className={`bg-muted/40 border border-border/40 rounded-lg px-4 py-3 ${className}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <p className="text-sm text-muted-foreground">
            Progress tracking is available for logged-in learners
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="flex-shrink-0">
          <Link to="/login">Sign in to track progress</Link>
        </Button>
      </div>
    </div>
  );
};

export default ProgressTeaser;
