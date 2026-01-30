import { useState, useEffect, useCallback, useRef } from "react";

interface DelayedStickyConfig {
  /** Distance to scroll before sticky kicks in (default: 100px) */
  threshold?: number;
  /** Top offset when sticky (default: 112px to clear header) */
  stickyTopOffset?: number;
}

interface DelayedStickyResult {
  /** Whether the element should be in sticky mode */
  isSticky: boolean;
  /** Smooth transition progress (0-1) for animations */
  progress: number;
  /** Current scroll position */
  scrollY: number;
  /** Ref to attach to the sidebar container for bottom boundary detection */
  containerRef: React.RefObject<HTMLElement>;
  /** Dynamic styles to apply */
  stickyStyles: {
    position: "relative" | "sticky";
    top: string;
    transition: string;
  };
}

/**
 * Hook for implementing delayed sticky sidebar behavior.
 * The sidebar scrolls naturally with the page initially,
 * then becomes sticky after crossing a threshold.
 */
export function useDelayedSticky({
  threshold = 100,
  stickyTopOffset = 112,
}: DelayedStickyConfig = {}): DelayedStickyResult {
  const [scrollY, setScrollY] = useState(0);
  const [isSticky, setIsSticky] = useState(false);
  const containerRef = useRef<HTMLElement>(null);
  const rafRef = useRef<number | null>(null);

  // Throttled scroll handler using requestAnimationFrame
  const handleScroll = useCallback(() => {
    if (rafRef.current) return;
    
    rafRef.current = requestAnimationFrame(() => {
      const currentScroll = window.scrollY;
      setScrollY(currentScroll);
      setIsSticky(currentScroll > threshold);
      rafRef.current = null;
    });
  }, [threshold]);

  useEffect(() => {
    // Set initial values
    const initialScroll = window.scrollY;
    setScrollY(initialScroll);
    setIsSticky(initialScroll > threshold);

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [handleScroll, threshold]);

  // Calculate smooth progress (0-1) for transition animations
  // 0 = not scrolled at all, 1 = fully past threshold
  const progress = Math.min(Math.max(scrollY / threshold, 0), 1);

  // Generate dynamic styles
  const stickyStyles = {
    position: isSticky ? ("sticky" as const) : ("relative" as const),
    top: isSticky ? `${stickyTopOffset}px` : "0px",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  };

  return {
    isSticky,
    progress,
    scrollY,
    containerRef,
    stickyStyles,
  };
}
