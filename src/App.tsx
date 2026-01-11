import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Navigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import { usePageTracking } from "@/hooks/usePageTracking";
import { ThemeProvider } from "next-themes";

// Route Compositions
import { AdminRoutes, SeniorModeratorRoutes, ModeratorRoutes, publicRoutes } from "@/routes";

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
        {publicRoutes}

        {/* Admin Routes - /admin/* */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/*" element={<AdminRoutes />} />

        {/* Senior Moderator Routes - /senior-moderator/* */}
        <Route path="/senior-moderator" element={<Navigate to="/senior-moderator/dashboard" replace />} />
        <Route path="/senior-moderator/*" element={<SeniorModeratorRoutes />} />

        {/* Moderator Routes - /moderator/* */}
        <Route path="/moderator" element={<Navigate to="/moderator/dashboard" replace />} />
        <Route path="/moderator/*" element={<ModeratorRoutes />} />
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
