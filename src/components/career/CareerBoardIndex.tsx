/**
 * Career Board Index - Redirect Component
 * 
 * Redirects users to the first course in their career path.
 * This component is rendered at /career-board/:careerId (index route).
 */
import { Navigate } from "react-router-dom";
import { useCareerBoard } from "@/contexts/CareerBoardContext";
import { useCareers } from "@/hooks/useCareers";
import { Skeleton } from "@/components/ui/skeleton";

const CareerBoardIndex = () => {
  const { career, isLoading } = useCareerBoard();
  const { getCareerCourseSlugs } = useCareers();

  // Get career course slugs
  const careerCourseSlugs = career ? getCareerCourseSlugs(career.id) : [];
  const firstCourseSlug = careerCourseSlugs[0];

  // Show loading while career data is being fetched
  if (isLoading || !career) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Redirect to first course if available
  if (firstCourseSlug) {
    return <Navigate to={`/career-board/${career.slug}/course/${firstCourseSlug}`} replace />;
  }

  // No courses in career - redirect to arcade
  return <Navigate to="/arcade" replace />;
};

export default CareerBoardIndex;
