/**
 * Career Board Routes
 * 
 * ARCHITECTURAL GUARANTEE:
 * - All routes under /career-board/:careerId/* use CareerBoardLayout
 * - CareerBoardLayout ALWAYS renders CareerScopedHeader
 * - No conditional header logic anywhere in this route tree
 * 
 * ROUTE STRUCTURE:
 * /career-board/:careerId → Career overview (redirects to first course)
 * /career-board/:careerId/course/:courseSlug → Course detail within career context
 * /career-board/:careerId/course/:courseSlug/completed → Course completion within career context
 */
import { Routes, Route, Navigate } from "react-router-dom";
import { CareerBoardProvider, useCareerBoard } from "@/contexts/CareerBoardContext";
import CareerBoardLayout from "@/components/layouts/CareerBoardLayout";
import CareerCourseDetail from "@/pages/CareerCourseDetail";
import CareerCourseCompleted from "@/pages/CareerCourseCompleted";

/**
 * Career Board Index - Redirects to Arcade (career overview)
 * Users should always enter via a specific course or the Arcade page
 */
const CareerBoardIndex = () => {
  const { career, careerCourses, isLoading, isReady } = useCareerBoard();

  // While the shell/context is still resolving, render nothing.
  // CareerBoardLayout will show the skeleton.
  if (isLoading || !isReady) return null;

  // Redirect to the first course in the career (stays inside the shell)
  if (career && careerCourses.length > 0) {
    return <Navigate to={`course/${careerCourses[0].slug}`} replace />;
  }

  // If the career has no courses or can't be resolved, fall back to Arcade.
  return <Navigate to="/arcade" replace />;
};

/**
 * Career Board Routes Component
 * 
 * Wraps all career board routes with:
 * 1. CareerBoardProvider - Career context for all children
 * 2. CareerBoardLayout - Shell with guaranteed CareerScopedHeader
 */
const CareerBoardRoutes = () => {
  return (
    <CareerBoardProvider>
      <Routes>
        <Route element={<CareerBoardLayout />}>
          {/* Career index - redirect to arcade */}
          <Route index element={<CareerBoardIndex />} />
          
          {/* Course detail within career context */}
          <Route path="course/:courseSlug" element={<CareerCourseDetail />} />
          
          {/* Course completion within career context */}
          <Route path="course/:courseSlug/completed" element={<CareerCourseCompleted />} />
          
          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/arcade" replace />} />
        </Route>
      </Routes>
    </CareerBoardProvider>
  );
};

export default CareerBoardRoutes;
