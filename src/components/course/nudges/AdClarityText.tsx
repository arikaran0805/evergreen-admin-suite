/**
 * AdClarityText
 * 
 * Subtle helper text shown near ads for Pro learners viewing non-career courses.
 * Clarifies that ads are only shown outside their paid career track.
 * 
 * - Muted, non-interactive
 * - Non-dismissable (always present when conditions are met)
 */
import { cn } from "@/lib/utils";

interface AdClarityTextProps {
  className?: string;
}

export const AdClarityText = ({ className }: AdClarityTextProps) => {
  return (
    <p
      className={cn(
        "text-[10px] text-muted-foreground/60 text-center leading-relaxed select-none",
        className
      )}
    >
      Sponsored content — not shown inside your career track
    </p>
  );
};

export default AdClarityText;
