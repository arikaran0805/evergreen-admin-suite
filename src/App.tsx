import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Navigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import { usePageTracking } from "@/hooks/usePageTracking";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import Library from "./pages/Library";
import Arcade from "./pages/Arcade";

import PracticeLab from "./pages/PracticeLab";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import AdminPosts from "./pages/AdminPosts";
import AdminPostEditor from "./pages/AdminPostEditor";
import AdminPages from "./pages/AdminPages";
import AdminCoursesPanel from "./pages/AdminCoursesPanel";
import AdminCourseEditor from "./pages/AdminCourseEditor";
import AdminCareers from "./pages/AdminCareers";
import AdminCareerEditor from "./pages/AdminCareerEditor";
import AdminComments from "./pages/AdminComments";
import AdminUsers from "./pages/AdminUsers";
import AdminPlaceholder from "./pages/AdminPlaceholder";
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
import TagPosts from "./pages/TagPosts";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";

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


  
  // Prevent scroll to top when navigating between admin pages
  useEffect(() => {
    const prevPath = prevLocationRef.current;
    const currentPath = location.pathname;
    
    // Only scroll to top if:
    // 1. Moving from non-admin to non-admin page
    // 2. Moving from admin to non-admin page
    // Don't scroll if both previous and current are admin pages
    const bothAreAdmin = prevPath.startsWith('/admin') && currentPath.startsWith('/admin');
    
    if (!bothAreAdmin && !currentPath.startsWith('/admin')) {
      window.scrollTo(0, 0);
    }
    
    prevLocationRef.current = currentPath;
  }, [location.pathname]);
  
  return (
    <>
      <Toaster />
      <Sonner />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/course/:slug" element={<CourseDetail />} />
        <Route path="/library" element={<Library />} />
        <Route path="/arcade" element={<Arcade />} />
        
        <Route path="/practice-lab" element={<PracticeLab />} />
        <Route path="/tag/:slug" element={<TagPosts />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/approvals" element={<AdminApprovals />} />
        <Route path="/admin/delete-requests" element={<AdminDeleteRequests />} />
        <Route path="/admin/posts" element={<AdminPosts />} />
        <Route path="/admin/posts/new" element={<AdminPostEditor />} />
        <Route path="/admin/posts/edit/:id" element={<AdminPostEditor />} />
        <Route path="/admin/posts/:id/versions" element={<AdminPostVersions />} />
        <Route path="/admin/pages" element={<AdminPages />} />
        <Route path="/admin/courses" element={<AdminCoursesPanel />} />
        <Route path="/admin/courses/new" element={<AdminCourseEditor />} />
        <Route path="/admin/courses/:id" element={<AdminCourseEditor />} />
        <Route path="/admin/careers" element={<AdminCareers />} />
        <Route path="/admin/careers/new" element={<AdminCareerEditor />} />
        <Route path="/admin/careers/:id" element={<AdminCareerEditor />} />
        <Route path="/admin/comments" element={<AdminComments />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/tags" element={<AdminTags />} />
        <Route path="/admin/authors" element={<AdminAuthors />} />
        <Route path="/admin/media" element={<AdminMedia />} />
        <Route path="/admin/monetization" element={<AdminMonetization />} />
        <Route path="/admin/redirects" element={<AdminRedirects />} />
        <Route path="/admin/api" element={<AdminAPI />} />
        <Route path="/admin/analytics" element={<AdminAnalytics />} />
        <Route path="/admin/social-analytics" element={<AdminSocialAnalytics />} />
        <Route path="/admin/activity" element={<AdminModeratorActivity />} />
        <Route path="/admin/reports" element={<AdminReports />} />
        <Route path="/admin/seo" element={<Navigate to="/admin/settings" replace />} />
        <Route path="/admin/ad-settings" element={<Navigate to="/admin/api" replace />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
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
