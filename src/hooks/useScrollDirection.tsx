import { useState, useEffect, useCallback, useRef } from "react";

type ScrollDirection = "up" | "down" | null;

interface UseScrollDirectionOptions {
  /** Minimum scroll delta to trigger direction change (default: 10) */
  threshold?: number;
  /** Whether the hook is active (default: true) */
  enabled?: boolean;
}

interface UseScrollDirectionResult {
  /** Current scroll direction */
  direction: ScrollDirection;
  /** Whether the user is at the top of the page */
  isAtTop: boolean;
  /** Whether the header should be visible */
  isHeaderVisible: boolean;
}

/**
 * Hook to detect scroll direction with threshold support
 * Returns direction, isAtTop, and computed isHeaderVisible
 */
export const useScrollDirection = ({
  threshold = 10,
  enabled = true,
}: UseScrollDirectionOptions = {}): UseScrollDirectionResult => {
  const [direction, setDirection] = useState<ScrollDirection>(null);
  const [isAtTop, setIsAtTop] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  const updateScrollDirection = useCallback(() => {
    const scrollY = window.scrollY;

    // Check if at top
    const atTop = scrollY < 10;
    setIsAtTop(atTop);

    // Calculate delta
    const delta = scrollY - lastScrollY.current;

    // Only update direction if scroll exceeds threshold
    if (Math.abs(delta) >= threshold) {
      const newDirection: ScrollDirection = delta > 0 ? "down" : "up";
      setDirection(newDirection);
      lastScrollY.current = scrollY;
    }

    ticking.current = false;
  }, [threshold]);

  const onScroll = useCallback(() => {
    if (!ticking.current) {
      window.requestAnimationFrame(updateScrollDirection);
      ticking.current = true;
    }
  }, [updateScrollDirection]);

  useEffect(() => {
    if (!enabled) {
      // Reset state when disabled
      setDirection(null);
      setIsAtTop(true);
      return;
    }

    // Initialize
    lastScrollY.current = window.scrollY;
    setIsAtTop(window.scrollY < 10);

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [enabled, onScroll]);

  // Header is visible if at top OR scrolling up
  const isHeaderVisible = !enabled || isAtTop || direction === "up";

  return { direction, isAtTop, isHeaderVisible };
};

export default useScrollDirection;
