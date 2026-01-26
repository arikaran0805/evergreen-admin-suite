/**
 * useGuestBannerVisibility Hook
 * 
 * Shared state for tracking guest banner visibility.
 * Ensures mutual exclusion between GuestContextBanner and ProgressTeaser.
 * 
 * Rules:
 * - Guest banner is the primary source of truth
 * - ProgressTeaser only shows when banner is dismissed
 * - Logged-in users see neither
 */
import { useState, useCallback, useMemo } from "react";

const SESSION_KEY = "guest_banner_dismissed";

interface UseGuestBannerVisibilityReturn {
  /** Whether the guest banner has been dismissed this session */
  isDismissed: boolean;
  /** Dismiss the guest banner for this session */
  dismiss: () => void;
  /** Whether the guest banner should be visible (not dismissed) */
  isBannerVisible: boolean;
  /** Whether the progress teaser should be visible (banner dismissed) */
  shouldShowProgressTeaser: boolean;
}

/**
 * Hook to manage guest banner visibility state
 * Provides mutual exclusion logic between banner and teaser
 */
export const useGuestBannerVisibility = (isGuest: boolean): UseGuestBannerVisibilityReturn => {
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(SESSION_KEY) === "true";
  });

  const dismiss = useCallback(() => {
    sessionStorage.setItem(SESSION_KEY, "true");
    setIsDismissed(true);
  }, []);

  // Mutual exclusion logic
  const isBannerVisible = useMemo(() => {
    return isGuest && !isDismissed;
  }, [isGuest, isDismissed]);

  const shouldShowProgressTeaser = useMemo(() => {
    // Only show teaser if guest AND banner has been dismissed
    return isGuest && isDismissed;
  }, [isGuest, isDismissed]);

  return {
    isDismissed,
    dismiss,
    isBannerVisible,
    shouldShowProgressTeaser,
  };
};

export default useGuestBannerVisibility;
