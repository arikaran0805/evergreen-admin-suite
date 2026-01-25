import { useState, useEffect, useCallback, useMemo } from "react";

export interface LessonFlowSection {
  id: string;
  label: string;
  selector: string;
  exists: boolean;
}

interface UseLessonFlowNavigationOptions {
  /** Offset from top of viewport for scroll position (header height) */
  scrollOffset?: number;
  /** Debounce delay for scroll events */
  debounceMs?: number;
}

/**
 * Hook for Lesson Flow navigation - scroll-to and scroll-spy functionality
 * 
 * Features:
 * - Detects which sections exist in the DOM
 * - Tracks active section based on scroll position
 * - Provides scroll-to function with header offset
 * - Disables non-existent sections
 */
export function useLessonFlowNavigation(
  sections: Array<{ id: string; label: string; selector: string }>,
  options: UseLessonFlowNavigationOptions = {}
) {
  const { scrollOffset = 140, debounceMs = 50 } = options;
  
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [sectionStates, setSectionStates] = useState<Record<string, boolean>>({});

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

  // Check section existence on mount and when sections change
  useEffect(() => {
    // Initial check
    checkSectionExistence();

    // Re-check after a short delay to catch dynamically rendered content
    const timeoutId = setTimeout(checkSectionExistence, 500);

    // Also observe DOM changes for dynamic content
    const observer = new MutationObserver(() => {
      checkSectionExistence();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [checkSectionExistence]);

  // Scroll spy - detect active section
  useEffect(() => {
    let timeoutId: number | null = null;

    const handleScroll = () => {
      if (timeoutId) return;

      timeoutId = window.setTimeout(() => {
        timeoutId = null;

        // Find the section that's currently in the reading zone
        // Strategy: Find the deepest section whose top is above the activation line
        // When scrolling up, as a section's top drops below the line, we switch to previous
        let foundActive: string | null = null;
        const activationLine = scrollOffset + 100; // Line where content is being read
        
        // Iterate forward to find the last section that has passed the activation line
        for (let i = 0; i < sections.length; i++) {
          const section = sections[i];
          const element = document.querySelector(section.selector);
          if (element) {
            const rect = element.getBoundingClientRect();
            
            // Section is active if its top is at or above the activation line
            if (rect.top <= activationLine) {
              foundActive = section.id;
              // Continue to check if deeper sections are also active
            } else {
              // This section hasn't reached the activation line yet
              // If we already found an active section, stop here
              if (foundActive) break;
            }
          }
        }
        
        // Fallback: if nothing found and we're at the top, use first section
        if (!foundActive && sections.length > 0) {
          const firstElement = document.querySelector(sections[0].selector);
          if (firstElement) {
            const rect = firstElement.getBoundingClientRect();
            if (rect.top <= window.innerHeight) {
              foundActive = sections[0].id;
            }
          }
        }

        setActiveSection(foundActive);
      }, debounceMs);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    
    // Initial check
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [sections, scrollOffset, debounceMs]);

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
