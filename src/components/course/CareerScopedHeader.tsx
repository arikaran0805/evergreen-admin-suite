/**
 * Career-Scoped Secondary Header for Course Detail Page
 * 
 * Pro-only header that shows:
 * - LEFT: Current course name (prominent) with career path context
 * - RIGHT: Career-scoped course tabs for navigation
 * 
 * Reinforces: "You're learning THIS course as part of YOUR career path"
 * 
 * When in career flow mode, this is the ONLY header shown (global header hidden)
 */
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Target, ChevronLeft } from "lucide-react";

// Session storage key for career flow tracking
const ENTRY_FLOW_KEY = "lovable_entry_flow";

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
  /** Current course being viewed */
  currentCourse: {
    id: string;
    name: string;
    slug: string;
  };
  /** User's selected career */
  career: Career | null;
  /** Courses mapped to the user's career */
  careerCourses: CareerCourse[];
  /** Whether primary header is visible (for positioning) */
  isHeaderVisible: boolean;
  /** Whether announcement bar is visible (for positioning) */
  announcementVisible?: boolean;
  /** Loading state */
  isLoading?: boolean;
}

/**
 * Mark navigation as career flow (preserves immersive mode)
 */
const markAsCareerFlow = () => {
  sessionStorage.setItem(ENTRY_FLOW_KEY, "career_flow");
};

/**
 * Clear career flow (exits immersive mode)
 */
const clearCareerFlow = () => {
  sessionStorage.removeItem(ENTRY_FLOW_KEY);
};

export const CareerScopedHeader = ({
  currentCourse,
  career,
  careerCourses,
  isHeaderVisible,
  announcementVisible = false,
  isLoading = false,
}: CareerScopedHeaderProps) => {
  const navigate = useNavigate();

  // Determine top position based on header visibility
  const getTopPosition = () => {
    if (isHeaderVisible) {
      return announcementVisible ? 'top-[6.25rem]' : 'top-16';
    }
    return announcementVisible ? 'top-9' : 'top-0';
  };

  // Handle course navigation - preserves career flow
  const handleCourseClick = (courseSlug: string) => {
    // Mark as career flow before navigating to preserve immersive mode
    markAsCareerFlow();
    navigate(`/course/${courseSlug}`);
  };

  // Handle exit from career flow - return to profile
  const handleExitCareerFlow = () => {
    clearCareerFlow();
    navigate('/profile');
  };

  if (isLoading) {
    return (
      <div 
        className={cn(
          "hidden lg:block fixed left-0 right-0 z-40 bg-muted/95 backdrop-blur-sm border-b border-border transition-all duration-200 ease-out",
          getTopPosition()
        )}
      >
        <div className="container mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-12">
            <div className="h-5 w-48 bg-muted-foreground/10 rounded animate-pulse" />
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 w-24 bg-muted-foreground/10 rounded-full animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "hidden lg:block fixed left-0 right-0 z-40 bg-muted/95 backdrop-blur-sm border-b border-border transition-all duration-200 ease-out",
        getTopPosition()
      )}
    >
      <div className="container mx-auto px-6 lg:px-12">
        <div className="flex items-center justify-between h-12 gap-8">
          {/* LEFT SIDE - Career Context + Course Name */}
          <div className="flex items-center gap-3 flex-shrink-0 min-w-0">
            {/* Back to Profile button - exits career flow */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground hover:text-foreground"
              onClick={handleExitCareerFlow}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Exit Career Board</span>
            </Button>

            {/* Current Course Name - Prominent, Not Clickable */}
            <div className="flex flex-col min-w-0">
              <h2 className="text-base font-semibold text-foreground truncate">
                {currentCourse.name}
              </h2>
              {career && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  {career.name} Path
                </span>
              )}
            </div>
          </div>

          {/* RIGHT SIDE - Career-Scoped Course Navigation */}
          <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide flex-1 justify-end">
            {careerCourses.length > 0 ? (
              careerCourses.map((course) => {
                const isActive = course.slug === currentCourse.slug;
                return (
                  <button
                    key={course.id}
                    onClick={() => handleCourseClick(course.slug)}
                    className={cn(
                      "relative px-4 py-1.5 text-xs font-medium whitespace-nowrap rounded-full transition-all duration-200 flex-shrink-0",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10"
                    )}
                  >
                    {course.name}
                  </button>
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
    </div>
  );
};

export default CareerScopedHeader;
