import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Navigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import { usePageTracking } from "@/hooks/usePageTracking";
import { ThemeProvider } from "next-themes";

// Public Pages
import Index from "./pages/Index";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import Library from "./pages/Library";
import Arcade from "./pages/Arcade";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import TagPosts from "./pages/TagPosts";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";
import AccessDenied from "./pages/AccessDenied";

// Layouts
import { AdminLayout, SeniorModeratorLayout, ModeratorLayout } from "./components/layouts";
import ProtectedRoute from "./components/routing/ProtectedRoute";

// Admin Pages
import AdminDashboard from "./pages/AdminDashboard";
import AdminPosts from "./pages/AdminPosts";
import AdminPostEditor from "./pages/AdminPostEditor";
import AdminPages from "./pages/AdminPages";
import AdminCoursesPanel from "./pages/AdminCoursesPanel";
import AdminCourseEditor from "./pages/AdminCourseEditor";
import AdminCareers from "./pages/AdminCareers";
import AdminCareerEditor from "./pages/AdminCareerEditor";
import AdminComments from "./pages/AdminComments";
import AdminUsers from "./pages/AdminUsers";
import AdminAuthors from "./pages/AdminAuthors";
import AdminMedia from "./pages/AdminMedia";
import AdminMonetization from "./pages/AdminMonetization";
import AdminRedirects from "./pages/AdminRedirects";
import AdminAPI from "./pages/AdminAPI";
import AdminSettings from "./pages/AdminSettings";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminSocialAnalytics from "./pages/AdminSocialAnalytics";
import AdminTags from "./pages/AdminTags";
import AdminApprovals from "./pages/AdminApprovals";
import AdminDeleteRequests from "./pages/AdminDeleteRequests";
import AdminModeratorActivity from "./pages/AdminModeratorActivity";
import AdminReports from "./pages/AdminReports";
import AdminPostVersions from "./pages/AdminPostVersions";
import AdminAnnotations from "./pages/AdminAnnotations";

// Role-specific Dashboards
import SeniorModeratorDashboard from "./pages/SeniorModeratorDashboard";
import ModeratorDashboard from "./pages/ModeratorDashboard";

const queryClient = new QueryClient();

const AppContent = () => {
  usePageTracking();
  const location = useLocation();
  const navigate = useNavigate();
  const prevLocationRef = useRef(location.pathname);

  // If user opens an email recovery link, redirect to the dedicated /reset-password page.
  useEffect(() => {
    const hashParams = new URLSearchParams(location.hash.replace(/^#/, ""));
    const searchParams = new URLSearchParams(location.search);

    const type = hashParams.get("type") ?? searchParams.get("type");
    const hasRecoveryTokens = hashParams.has("access_token") && hashParams.has("refresh_token");
    const hasRecoveryCode = searchParams.has("code");

    if (
      (type === "recovery" || (hasRecoveryTokens && !type) || (hasRecoveryCode && !type)) &&
      location.pathname !== "/reset-password"
    ) {
      navigate(`/reset-password${location.search}${location.hash}`, { replace: true });
    }
  }, [location.hash, location.search, location.pathname, navigate]);

  // Prevent scroll to top when navigating between admin/moderator pages
  useEffect(() => {
    const prevPath = prevLocationRef.current;
    const currentPath = location.pathname;
    
    const isAdminPath = (path: string) => 
      path.startsWith('/admin') || 
      path.startsWith('/senior-moderator') || 
      path.startsWith('/moderator');
    
    const bothAreAdminPaths = isAdminPath(prevPath) && isAdminPath(currentPath);
    
    if (!bothAreAdminPaths && !isAdminPath(currentPath)) {
      window.scrollTo(0, 0);
    }
    
    prevLocationRef.current = currentPath;
  }, [location.pathname]);
  
  return (
    <>
      <Toaster />
      <Sonner />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Index />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/course/:slug" element={<CourseDetail />} />
        <Route path="/library" element={<Library />} />
        <Route path="/arcade" element={<Arcade />} />
        <Route path="/practice-lab" element={<Navigate to="/profile?tab=practice" replace />} />
        <Route path="/tag/:slug" element={<TagPosts />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/access-denied" element={<AccessDenied />} />

        {/* Admin Routes - Admin ONLY */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/*" element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminLayout>
              <Routes>
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="approvals" element={<AdminApprovals />} />
                <Route path="delete-requests" element={<AdminDeleteRequests />} />
                <Route path="posts" element={<AdminPosts />} />
                <Route path="posts/new" element={<AdminPostEditor />} />
                <Route path="posts/edit/:id" element={<AdminPostEditor />} />
                <Route path="posts/:id/versions" element={<AdminPostVersions />} />
                <Route path="pages" element={<AdminPages />} />
                <Route path="courses" element={<AdminCoursesPanel />} />
                <Route path="courses/new" element={<AdminCourseEditor />} />
                <Route path="courses/:id" element={<AdminCourseEditor />} />
                <Route path="careers" element={<AdminCareers />} />
                <Route path="careers/new" element={<AdminCareerEditor />} />
                <Route path="careers/:id" element={<AdminCareerEditor />} />
                <Route path="comments" element={<AdminComments />} />
                <Route path="annotations" element={<AdminAnnotations />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="tags" element={<AdminTags />} />
                <Route path="authors" element={<AdminAuthors />} />
                <Route path="media" element={<AdminMedia />} />
                <Route path="monetization" element={<AdminMonetization />} />
                <Route path="redirects" element={<AdminRedirects />} />
                <Route path="api" element={<AdminAPI />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="social-analytics" element={<AdminSocialAnalytics />} />
                <Route path="activity" element={<AdminModeratorActivity />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="seo" element={<Navigate to="/admin/settings" replace />} />
                <Route path="ad-settings" element={<Navigate to="/admin/api" replace />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AdminLayout>
          </ProtectedRoute>
        } />

        {/* Senior Moderator Routes - Admin + Senior Moderator */}
        <Route path="/senior-moderator" element={<Navigate to="/senior-moderator/dashboard" replace />} />
        <Route path="/senior-moderator/*" element={
          <ProtectedRoute allowedRoles={["admin", "senior_moderator"]}>
            <SeniorModeratorLayout>
              <Routes>
                <Route path="dashboard" element={<SeniorModeratorDashboard />} />
                <Route path="approvals" element={<AdminApprovals />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="posts" element={<AdminPosts />} />
                <Route path="posts/new" element={<AdminPostEditor />} />
                <Route path="posts/edit/:id" element={<AdminPostEditor />} />
                <Route path="courses" element={<AdminCoursesPanel />} />
                <Route path="courses/new" element={<AdminCourseEditor />} />
                <Route path="courses/:id" element={<AdminCourseEditor />} />
                <Route path="tags" element={<AdminTags />} />
                <Route path="pages" element={<AdminPages />} />
                <Route path="comments" element={<AdminComments />} />
                <Route path="annotations" element={<AdminAnnotations />} />
                <Route path="media" element={<AdminMedia />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="activity" element={<AdminModeratorActivity />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </SeniorModeratorLayout>
          </ProtectedRoute>
        } />

        {/* Moderator Routes - Admin + Senior Moderator + Moderator */}
        <Route path="/moderator" element={<Navigate to="/moderator/dashboard" replace />} />
        <Route path="/moderator/*" element={
          <ProtectedRoute allowedRoles={["admin", "senior_moderator", "moderator"]}>
            <ModeratorLayout>
              <Routes>
                <Route path="dashboard" element={<ModeratorDashboard />} />
                <Route path="content" element={<AdminPosts />} />
                <Route path="posts/new" element={<AdminPostEditor />} />
                <Route path="posts/edit/:id" element={<AdminPostEditor />} />
                <Route path="review" element={<AdminApprovals />} />
                <Route path="comments" element={<AdminComments />} />
                <Route path="activity" element={<AdminModeratorActivity />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ModeratorLayout>
          </ProtectedRoute>
        } />

        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
