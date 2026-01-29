import { useState, useEffect, useCallback, useRef } from "react";

export interface LessonFlowSection {
  id: string;
  label: string;
  exists: boolean;
}

interface UseLessonFlowNavigationOptions {
  /** Offset from top of viewport for scroll-to (header height) */
  scrollOffset?: number;
  /** Hysteresis delay before changing active section (ms) */
  hysteresisMs?: number;
}

/**
 * Hook for Lesson Flow navigation - Single IntersectionObserver based scroll-spy
 * 
 * Features:
 * - Uses ONE IntersectionObserver for all [data-flow] sections
 * - Tracks section with highest intersectionRatio
 * - Reading zone: 25% from top to 35% from bottom (center focus)
 * - Hysteresis prevents flicker during fast scrolling
 * - No scroll listeners - pure IntersectionObserver
 */
export function useLessonFlowNavigation(
  sectionConfig: Array<{ id: string; label: string }>,
  options: UseLessonFlowNavigationOptions = {}
) {
  const { scrollOffset = 140, hysteresisMs = 80 } = options;
  
  const [activeFlow, setActiveFlow] = useState<string | null>(null);
  const [sectionStates, setSectionStates] = useState<Record<string, boolean>>({});
  
  // Track intersection ratios for all sections - single source of truth
  const ratioMap = useRef<Map<string, number>>(new Map());
  const hysteresisTimer = useRef<number | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const observedElements = useRef<Set<Element>>(new Set());

  // Resolve dominant section by highest ratio
  const resolveDominant = useCallback((): string | null => {
    let maxRatio = 0;
    let dominantId: string | null = null;
    
    ratioMap.current.forEach((ratio, id) => {
      if (ratio > maxRatio) {
        maxRatio = ratio;
        dominantId = id;
      }
    });
    
    // Require minimum 15% visibility to avoid switching on edges
    return maxRatio >= 0.15 ? dominantId : null;
  }, []);

  // Update active flow with hysteresis to prevent flicker
  const scheduleUpdate = useCallback(() => {
    if (hysteresisTimer.current) {
      clearTimeout(hysteresisTimer.current);
    }
    
    hysteresisTimer.current = window.setTimeout(() => {
      const newActive = resolveDominant();
      if (newActive !== null && newActive !== activeFlow) {
        setActiveFlow(newActive);
      }
    }, hysteresisMs);
  }, [resolveDominant, hysteresisMs, activeFlow]);

  // Single IntersectionObserver setup
  useEffect(() => {
    // Cleanup existing observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    ratioMap.current.clear();
    observedElements.current.clear();

    // Create single observer with center focus zone
    // rootMargin: "-25% 0px -35% 0px" = reading zone from 25% to 65% of viewport
    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Update ratios for all observed entries
        entries.forEach((entry) => {
          const flowId = entry.target.getAttribute("data-flow");
          if (flowId) {
            ratioMap.current.set(
              flowId, 
              entry.isIntersecting ? entry.intersectionRatio : 0
            );
          }
        });
        
        // Schedule dominant section resolution
        scheduleUpdate();
      },
      {
        root: null, // viewport
        rootMargin: "-25% 0px -35% 0px", // Center focus zone
        threshold: [0, 0.15, 0.25, 0.5, 0.75, 1], // Multiple thresholds for smooth tracking
      }
    );

    // Find and observe all [data-flow] elements
    const observeFlowElements = () => {
      const elements = document.querySelectorAll("[data-flow]");
      const foundStates: Record<string, boolean> = {};
      
      // Initialize all sections as not found
      sectionConfig.forEach((s) => {
        foundStates[s.id] = false;
      });
      
      elements.forEach((el) => {
        const flowId = el.getAttribute("data-flow");
        if (flowId && !observedElements.current.has(el)) {
          observerRef.current?.observe(el);
          observedElements.current.add(el);
          foundStates[flowId] = true;
        } else if (flowId) {
          foundStates[flowId] = true;
        }
      });
      
      setSectionStates(foundStates);
      
      // Set initial active if none set and sections exist
      if (!activeFlow && elements.length > 0) {
        const firstFlow = elements[0].getAttribute("data-flow");
        if (firstFlow) {
          setActiveFlow(firstFlow);
        }
      }
    };

    // Initial observation
    observeFlowElements();
    
    // Re-observe after delays for dynamically rendered content
    const t1 = setTimeout(observeFlowElements, 150);
    const t2 = setTimeout(observeFlowElements, 500);

    // Watch for DOM changes (new sections added)
    const mutationObserver = new MutationObserver(() => {
      observeFlowElements();
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-flow"],
    });

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (hysteresisTimer.current) {
        clearTimeout(hysteresisTimer.current);
      }
      observerRef.current?.disconnect();
      mutationObserver.disconnect();
      ratioMap.current.clear();
      observedElements.current.clear();
    };
  }, [sectionConfig, scheduleUpdate, activeFlow]);

  // Build enriched sections with existence state
  const sections: LessonFlowSection[] = sectionConfig.map((section) => ({
    id: section.id,
    label: section.label,
    exists: sectionStates[section.id] ?? false,
  }));

  // Scroll to section with offset
  const scrollToSection = useCallback(
    (flowId: string) => {
      const element = document.querySelector(`[data-flow="${flowId}"]`);
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      // Check if already visible in the reading zone
      const isVisible = rect.top >= scrollOffset && rect.bottom <= viewportHeight;
      
      if (!isVisible) {
        const absoluteTop = window.scrollY + rect.top;
        window.scrollTo({
          top: absoluteTop - scrollOffset,
          behavior: "smooth",
        });
      }

      // Immediately set active for responsiveness
      setActiveFlow(flowId);
    },
    [scrollOffset]
  );

  return {
    activeSection: activeFlow,
    sections,
    scrollToSection,
  };
}

export default useLessonFlowNavigation;
