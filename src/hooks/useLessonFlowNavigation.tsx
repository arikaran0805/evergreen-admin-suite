import { useState, useEffect, useCallback, useMemo, useRef } from "react";

export interface LessonFlowSection {
  id: string;
  label: string;
  selector: string;
  exists: boolean;
}

interface UseLessonFlowNavigationOptions {
  /** Offset from top of viewport for scroll-to (header height) */
  scrollOffset?: number;
  /** Hysteresis delay before changing active section (ms) */
  hysteresisMs?: number;
}

/**
 * Hook for Lesson Flow navigation - IntersectionObserver-based scroll-spy
 * 
 * Features:
 * - Uses IntersectionObserver for stable, viewport-relative detection
 * - Reading zone: 30% from top to 60% from top of viewport
 * - Tracks dominant section by intersection ratio
 * - Hysteresis delay prevents flicker during fast scrolling
 * - No dependency on header/banner heights
 */
export function useLessonFlowNavigation(
  sections: Array<{ id: string; label: string; selector: string }>,
  options: UseLessonFlowNavigationOptions = {}
) {
  const { scrollOffset = 140, hysteresisMs = 100 } = options;
  
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [sectionStates, setSectionStates] = useState<Record<string, boolean>>({});
  
  // Track intersection ratios for all sections
  const intersectionRatios = useRef<Map<string, number>>(new Map());
  const hysteresisTimeout = useRef<number | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Check which sections exist in the DOM
  const checkSectionExistence = useCallback(() => {
    const states: Record<string, boolean> = {};
    sections.forEach((section) => {
      const element = document.querySelector(section.selector);
      states[section.id] = !!element;
    });
    setSectionStates(states);
  }, [sections]);

  // Build enriched section list with existence state
  const enrichedSections: LessonFlowSection[] = useMemo(() => {
    return sections.map((section) => ({
      ...section,
      exists: sectionStates[section.id] ?? false,
    }));
  }, [sections, sectionStates]);

  // Determine the dominant active section from intersection ratios
  const resolveDominantSection = useCallback(() => {
    let maxRatio = 0;
    let dominantId: string | null = null;
    
    // Find section with highest intersection ratio
    intersectionRatios.current.forEach((ratio, id) => {
      if (ratio > maxRatio) {
        maxRatio = ratio;
        dominantId = id;
      }
    });
    
    // Only update if we have a clear dominant section (ratio > 0.1)
    // This prevents switching when nothing is really in the reading zone
    if (dominantId && maxRatio > 0.1) {
      return dominantId;
    }
    
    // Fallback: if nothing intersects well, keep current or use first visible
    if (!dominantId && sections.length > 0) {
      // Check if first section is at least partially visible
      const firstSection = sections[0];
      const element = document.querySelector(firstSection.selector);
      if (element) {
        const rect = element.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          return firstSection.id;
        }
      }
    }
    
    return dominantId;
  }, [sections]);

  // Update active section with hysteresis
  const updateActiveSection = useCallback(() => {
    if (hysteresisTimeout.current) {
      clearTimeout(hysteresisTimeout.current);
    }
    
    hysteresisTimeout.current = window.setTimeout(() => {
      const newActive = resolveDominantSection();
      if (newActive !== null) {
        setActiveSection(newActive);
      }
    }, hysteresisMs);
  }, [resolveDominantSection, hysteresisMs]);

  // Set up IntersectionObserver
  useEffect(() => {
    // Initial existence check
    checkSectionExistence();

    // Create observer with viewport-relative reading zone
    // rootMargin: "-30% 0px -40% 0px" creates a reading band from 30% to 60% of viewport
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const sectionId = entry.target.getAttribute("data-section-id");
          if (sectionId) {
            if (entry.isIntersecting) {
              intersectionRatios.current.set(sectionId, entry.intersectionRatio);
            } else {
              intersectionRatios.current.set(sectionId, 0);
            }
          }
        });
        
        updateActiveSection();
      },
      {
        root: null, // viewport
        rootMargin: "-30% 0px -40% 0px", // Reading zone: 30% from top, 40% from bottom
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1], // Multiple thresholds for smooth tracking
      }
    );

    // Observe all section elements
    const observeElements = () => {
      sections.forEach((section) => {
        const element = document.querySelector(section.selector);
        if (element) {
          // Add data attribute for identification in observer callback
          element.setAttribute("data-section-id", section.id);
          observerRef.current?.observe(element);
        }
      });
    };

    // Initial observation
    observeElements();
    
    // Re-observe after delays to catch dynamically rendered content
    const timeout1 = setTimeout(() => {
      checkSectionExistence();
      observeElements();
    }, 100);
    
    const timeout2 = setTimeout(() => {
      checkSectionExistence();
      observeElements();
    }, 500);

    // Also observe DOM changes for dynamic content
    const mutationObserver = new MutationObserver(() => {
      checkSectionExistence();
      observeElements();
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      if (hysteresisTimeout.current) {
        clearTimeout(hysteresisTimeout.current);
      }
      observerRef.current?.disconnect();
      mutationObserver.disconnect();
      intersectionRatios.current.clear();
    };
  }, [sections, checkSectionExistence, updateActiveSection]);

  // Scroll to a specific section with offset
  const scrollToSection = useCallback(
    (sectionId: string) => {
      const section = sections.find((s) => s.id === sectionId);
      if (!section) return;

      // Check if section exists
      if (!sectionStates[sectionId]) return;

      const element = document.querySelector(section.selector);
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const absoluteTop = window.scrollY + rect.top;
      
      // Check if already fully visible (within viewport minus offset)
      const viewportHeight = window.innerHeight;
      const isFullyVisible = 
        rect.top >= scrollOffset && 
        rect.bottom <= viewportHeight;

      if (isFullyVisible) {
        // Already visible, just set active state
        setActiveSection(sectionId);
        return;
      }

      // Scroll with offset
      window.scrollTo({
        top: absoluteTop - scrollOffset,
        behavior: "smooth",
      });

      // Set active immediately for responsiveness
      setActiveSection(sectionId);
    },
    [sections, sectionStates, scrollOffset]
  );

  return {
    activeSection,
    sections: enrichedSections,
    scrollToSection,
    refreshSections: checkSectionExistence,
  };
}

export default useLessonFlowNavigation;
