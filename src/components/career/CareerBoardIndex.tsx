/**
 * Career Board Index - Redirect Component
 * 
 * Redirects users to the first course in their career path.
 * This component is rendered at /career-board/:careerId (index route).
 * 
 * LOADING CONTRACT:
 * - getCareerCourseSlugs returns null while loading → show skeleton
 * - getCareerCourseSlugs returns [] when confirmed empty → redirect to arcade
 * - getCareerCourseSlugs returns string[] when ready → redirect to first course
 */
import { Navigate, useParams } from "react-router-dom";
import { useCareerBoard } from "@/contexts/CareerBoardContext";
import { useCareers } from "@/hooks/useCareers";
import { Skeleton } from "@/components/ui/skeleton";

const CareerBoardIndex = () => {
  const { careerId } = useParams<{ careerId: string }>();
  const { career, isLoading: careerLoading } = useCareerBoard();
  const { getCareerCourseSlugs, loading: careersLoading } = useCareers();

  // Get career course slugs - returns null if still loading
  const careerCourseSlugs = career ? getCareerCourseSlugs(career.id) : null;
  
  // Determine if we're still waiting for data
  const isDataReady = !careerLoading && !careersLoading && career && careerCourseSlugs !== null;

  // Show skeleton while career context or course data is loading
  if (!isDataReady) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Data is ready - redirect based on course availability
  const firstCourseSlug = careerCourseSlugs[0];
  
  if (firstCourseSlug) {
    // Use careerId from URL params (the slug) consistently
    return <Navigate to={`/career-board/${careerId}/course/${firstCourseSlug}`} replace />;
  }

  // Career has 0 courses (confirmed) - redirect to Arcade
  return <Navigate to="/arcade" replace />;
};

export default CareerBoardIndex;
