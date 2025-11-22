import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '@/lib/analytics';

/**
 * Hook to automatically track page views when route changes
 */
export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    // Track page view whenever location changes
    const pagePath = location.pathname;
    const pageTitle = document.title;

    // Small delay to ensure page title is updated
    const timeoutId = setTimeout(() => {
      trackPageView(pagePath, pageTitle);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [location]);
};
