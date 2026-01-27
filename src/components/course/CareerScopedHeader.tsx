/**
 * Career-Scoped Primary Header for Course Detail Page
 * 
 * This is the PRIMARY header in career flow - NOT secondary.
 * It REPLACES the Global Header entirely when user enters via:
 * - Career Readiness CTA
 * - Career Board CTA
 * - Skill row click inside Career Readiness
 * - Course click from inside Career Board
 * 
 * RESPONSIBILITIES (Primary Header):
 * - Brand anchor (app identity)
 * - User orientation (where I am)
 * - Contextual navigation relevant to career flow
 * - Exit action to return to global flow
 * 
 * PERSISTENCE:
 * - Persists across page refresh (sessionStorage)
 * - Only cleared on explicit exit (Home click, Exit Career Board)
 */
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Target, Home, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface CareerCourse {
  id: string;
  name: string;
  slug: string;
}

interface Career {
  id: string;
  name: string;
  slug: string;
}

interface CareerScopedHeaderProps {
  /** Current course being viewed (optional during loading) */
  currentCourse?: {
    id: string;
    name: string;
    slug: string;
  };
  /** User's selected career */
  career: Career | null;
  /** Courses mapped to the user's career */
  careerCourses: CareerCourse[];
  /** Whether primary header is visible (for positioning) - NOT used in career flow */
  isHeaderVisible?: boolean;
  /** Whether announcement bar is visible (for positioning) */
  announcementVisible?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Callback to clear career flow and exit to global mode */
  onExitCareerFlow?: () => void;
}

// Session storage key for career flow
const ENTRY_FLOW_KEY = "lovable_entry_flow";

export const CareerScopedHeader = ({
  currentCourse,
  career,
  careerCourses,
  isHeaderVisible = false,
  announcementVisible = false,
  isLoading = false,
  onExitCareerFlow,
}: CareerScopedHeaderProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  // In career flow, this header IS the primary header - positioned at top
  // No Global Header exists, so we always position at top (only announcement bar affects offset)
  const getTopPosition = () => {
    return announcementVisible ? 'top-9' : 'top-0';
  };

  // Handle exit from career flow - clear state and navigate home
  const handleExitCareerFlow = () => {
    sessionStorage.removeItem(ENTRY_FLOW_KEY);
    onExitCareerFlow?.();
    navigate("/profile");
  };

  // Show loading skeleton while data loads (but header structure is always present)
  if (isLoading || !currentCourse) {
    return (
      <header 
        className={cn(
          "hidden lg:block fixed left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border transition-all duration-200 ease-out",
          getTopPosition()
        )}
      >
        <div className="container mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-14">
            {/* Brand anchor placeholder */}
            <div className="flex items-center gap-4">
              <div className="h-5 w-5 bg-primary/20 rounded animate-pulse" />
              <div className="h-5 w-32 bg-muted-foreground/10 rounded animate-pulse" />
            </div>
            {/* Course tabs placeholder */}
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 w-24 bg-muted-foreground/10 rounded-full animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header 
      className={cn(
        "hidden lg:block fixed left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border transition-all duration-200 ease-out",
        getTopPosition()
      )}
    >
      <div className="container mx-auto px-6 lg:px-12">
        <div className="flex items-center justify-between h-14 gap-6">
          {/* LEFT SIDE - Brand + Career Context (Primary Orientation) */}
          <div className="flex items-center gap-4 flex-shrink-0 min-w-0">
            {/* Exit Career Flow / Home Action */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleExitCareerFlow}
                  className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <Home className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Exit Career Board</p>
              </TooltipContent>
            </Tooltip>

            {/* Career Badge + Current Course */}
            <div className="flex items-center gap-3 min-w-0">
              {career && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 rounded-full">
                  <Target className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium text-primary whitespace-nowrap">
                    {career.name}
                  </span>
                </div>
              )}
              
              {/* Current Course Name - Primary Context */}
              <div className="flex flex-col min-w-0">
                <h1 className="text-sm font-semibold text-foreground truncate max-w-[200px]">
                  {currentCourse.name}
                </h1>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE - Career-Scoped Course Navigation */}
          <nav className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide flex-1 justify-end">
            {careerCourses.length > 0 ? (
              careerCourses.map((course) => {
                const isActive = course.slug === currentCourse.slug;
                return (
                  <Link
                    key={course.id}
                    to={`/course/${course.slug}`}
                    className={cn(
                      "relative px-3.5 py-1.5 text-xs font-medium whitespace-nowrap rounded-full transition-all duration-200 flex-shrink-0",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    {course.name}
                  </Link>
                );
              })
            ) : (
              <span className="text-xs text-muted-foreground italic">
                No courses mapped to your career
              </span>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default CareerScopedHeader;
