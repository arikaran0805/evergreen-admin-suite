import { Info } from "lucide-react";
import { Link } from "react-router-dom";

interface GuestBannerProps {
  className?: string;
}

/**
 * Banner displayed to guest users viewing course content
 * Informs them that progress won't be saved
 */
export const GuestBanner = ({ className = "" }: GuestBannerProps) => {
  return (
    <div className={`bg-muted/50 border border-border/50 rounded-lg px-4 py-3 flex items-center gap-3 ${className}`}>
      <Info className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <p className="text-sm text-muted-foreground">
        You're viewing as a guest · Progress won't be saved ·{" "}
        <Link to="/login" className="text-primary hover:underline font-medium">
          Log in
        </Link>
        {" "}or{" "}
        <Link to="/signup" className="text-primary hover:underline font-medium">
          Sign up
        </Link>
      </p>
    </div>
  );
};

export default GuestBanner;
