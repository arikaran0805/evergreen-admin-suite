/**
 * Career Board Layout
 * 
 * ARCHITECTURAL GUARANTEE:
 * - ALWAYS renders CareerScopedHeader
 * - NEVER renders NormalHeader
 * - NEVER shows Google AdSense
 * - NEVER shows upgrade nudges
 * 
 * This is a premium, distraction-free shell for career-mapped learning.
 * Children inherit career context and are header-agnostic.
 */
import { useState, useCallback } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useCareerBoard } from "@/contexts/CareerBoardContext";
import { useUserState } from "@/hooks/useUserState";
import { CareerScopedHeader } from "@/components/course/CareerScopedHeader";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import Header from "@/components/Header";
import BackToTop from "@/components/BackToTop";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Loading skeleton that matches CareerScopedHeader dimensions
 * Prevents layout shift during initial load
 */
const CareerBoardSkeleton = () => (
  <div className="min-h-screen bg-background">
    {/* Primary header skeleton */}
    <div className="h-16 bg-background border-b" />
    {/* Secondary header skeleton */}
    <div className="h-12 bg-muted/50 border-b animate-pulse" />
    {/* Content skeleton */}
    <div className="container mx-auto px-6 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  </div>
);

export const CareerBoardLayout = () => {
  const { career, careerCourses, isLoading, isReady, currentCourseSlug, setCurrentCourseSlug } = useCareerBoard();
  const { isPro, isLoading: userStateLoading } = useUserState();
  
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  
  // Track header visibility for sticky positioning
  const { isHeaderVisible } = useScrollDirection({
    threshold: 10,
    showOnlyAtTop: true,
    enabled: true,
  });

  const handleAnnouncementVisibility = useCallback((visible: boolean) => {
    setShowAnnouncement(visible);
  }, []);

  // While loading, show skeleton to prevent any flicker
  if (isLoading || userStateLoading) {
    return <CareerBoardSkeleton />;
  }

  // Non-Pro redirect (safety net - context also handles this)
  if (!isPro) {
    return <Navigate to="/courses" replace />;
  }

  // Career not found
  if (isReady && !career) {
    return <Navigate to="/arcade" replace />;
  }

  // Build current course object for header highlighting
  const currentCourse = currentCourseSlug
    ? careerCourses.find(c => c.slug === currentCourseSlug) || null
    : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Announcement Bar - Sticky at very top */}
      <div className="fixed top-0 left-0 right-0 z-[60]">
        <AnnouncementBar onVisibilityChange={handleAnnouncementVisibility} />
      </div>

      {/* Primary Header - Auto-hides on scroll (same as CourseDetail) */}
      <Header 
        announcementVisible={showAnnouncement}
        autoHideOnScroll={true}
        showCourseSecondaryHeader={false} // NEVER show normal secondary header
      />

      {/* CareerScopedHeader - ALWAYS RENDERED (Architecture Guarantee) */}
      <CareerScopedHeader
        currentCourse={currentCourse || undefined}
        career={career}
        careerCourses={careerCourses}
        isHeaderVisible={isHeaderVisible}
        announcementVisible={showAnnouncement}
        isLoading={false} // Never show loading state - we already handled it above
      />

      {/* Main Content Area */}
      <main 
        className={cn(
          "flex-1 transition-[padding-top] duration-200 ease-out",
          // Dynamic padding based on header visibility (matches CourseDetail pattern)
          // Header visible: Primary (64px) + CareerScoped (48px) + optional Announcement (36px)
          // Header hidden: CareerScoped (48px) + optional Announcement (36px)
          isHeaderVisible
            ? (showAnnouncement ? 'pt-[9.25rem]' : 'pt-28')   // 148px / 112px
            : (showAnnouncement ? 'pt-[5.25rem]' : 'pt-12')   // 84px / 48px
        )}
      >
        <Outlet context={{ setCurrentCourseSlug, isHeaderVisible, showAnnouncement }} />
      </main>

      {/* Back to top button */}
      <BackToTop />
    </div>
  );
};

export default CareerBoardLayout;
