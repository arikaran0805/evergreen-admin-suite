import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import { usePageTracking } from "@/hooks/usePageTracking";
import Index from "./pages/Index";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import AdminPosts from "./pages/AdminPosts";
import AdminPostEditor from "./pages/AdminPostEditor";
import AdminPages from "./pages/AdminPages";
import AdminCourses from "./pages/AdminCourses";
import AdminCourseEditor from "./pages/AdminCourseEditor";
import AdminDifficultyLevels from "./pages/AdminDifficultyLevels";
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
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  usePageTracking();
  const location = useLocation();
  const prevLocationRef = useRef(location.pathname);
  
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
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/posts" element={<AdminPosts />} />
        <Route path="/admin/posts/new" element={<AdminPostEditor />} />
        <Route path="/admin/posts/edit/:id" element={<AdminPostEditor />} />
        <Route path="/admin/pages" element={<AdminPages />} />
        <Route path="/admin/courses" element={<AdminCourses />} />
        <Route path="/admin/courses/new" element={<AdminCourseEditor />} />
        <Route path="/admin/courses/:id" element={<AdminCourseEditor />} />
        <Route path="/admin/difficulty-levels" element={<AdminDifficultyLevels />} />
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
    <TooltipProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
