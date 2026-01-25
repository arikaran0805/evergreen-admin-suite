import { Route, Navigate } from "react-router-dom";

// Public Pages
import Index from "@/pages/Index";
import Courses from "@/pages/Courses";
import CourseDetail from "@/pages/CourseDetail";
import CourseNotes from "@/pages/CourseNotes";
import Library from "@/pages/Library";
import Arcade from "@/pages/Arcade";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import Profile from "@/pages/Profile";
import TagPosts from "@/pages/TagPosts";
import Tags from "@/pages/Tags";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import AccessDenied from "@/pages/AccessDenied";
import NotFound from "@/pages/NotFound";

/**
 * Public Routes - No authentication required
 * Returns an array of Route elements to be spread in the main router
 */
export const publicRoutes = [
  <Route key="home" path="/" element={<Index />} />,
  <Route key="courses" path="/courses" element={<Courses />} />,
  <Route key="course-detail" path="/course/:slug" element={<CourseDetail />} />,
  <Route key="course-notes" path="/courses/:courseId/notes" element={<CourseNotes />} />,
  <Route key="library" path="/library" element={<Library />} />,
  <Route key="arcade" path="/arcade" element={<Arcade />} />,
  <Route key="practice-lab" path="/practice-lab" element={<Navigate to="/profile?tab=practice" replace />} />,
  <Route key="tag-posts" path="/tag/:slug" element={<TagPosts />} />,
  <Route key="tags" path="/tags" element={<Tags />} />,
  <Route key="about" path="/about" element={<About />} />,
  <Route key="contact" path="/contact" element={<Contact />} />,
  <Route key="terms" path="/terms" element={<Terms />} />,
  <Route key="privacy" path="/privacy" element={<Privacy />} />,
  <Route key="auth" path="/auth" element={<Auth />} />,
  <Route key="reset-password" path="/reset-password" element={<ResetPassword />} />,
  <Route key="profile" path="/profile" element={<Profile />} />,
  <Route key="access-denied" path="/access-denied" element={<AccessDenied />} />,
  <Route key="unauthorized" path="/unauthorized" element={<AccessDenied />} />,
  <Route key="not-found" path="*" element={<NotFound />} />,
];

export default publicRoutes;
