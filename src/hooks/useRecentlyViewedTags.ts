import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "recently-viewed-tags";
const MAX_RECENT_TAGS = 8;

export interface RecentTag {
  id: string;
  name: string;
  slug: string;
  viewedAt: number;
}

/**
 * Hook to manage recently viewed tags in localStorage
 */
export function useRecentlyViewedTags() {
  const [recentTags, setRecentTags] = useState<RecentTag[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as RecentTag[];
        // Sort by most recent first
        setRecentTags(parsed.sort((a, b) => b.viewedAt - a.viewedAt));
      }
    } catch (error) {
      console.warn("Failed to load recently viewed tags:", error);
    }
  }, []);

  // Add a tag to recently viewed
  const addRecentTag = useCallback((tag: { id: string; name: string; slug: string }) => {
    setRecentTags(prev => {
      // Remove existing entry for this tag (if any)
      const filtered = prev.filter(t => t.id !== tag.id);
      
      // Add to front with current timestamp
      const updated = [
        { ...tag, viewedAt: Date.now() },
        ...filtered
      ].slice(0, MAX_RECENT_TAGS);

      // Persist to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.warn("Failed to save recently viewed tags:", error);
      }

      return updated;
    });
  }, []);

  // Remove a tag from recently viewed
  const removeRecentTag = useCallback((tagId: string) => {
    setRecentTags(prev => {
      const updated = prev.filter(t => t.id !== tagId);
      
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.warn("Failed to update recently viewed tags:", error);
      }

      return updated;
    });
  }, []);

  // Clear all recently viewed tags
  const clearRecentTags = useCallback(() => {
    setRecentTags([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("Failed to clear recently viewed tags:", error);
    }
  }, []);

  return {
    recentTags,
    addRecentTag,
    removeRecentTag,
    clearRecentTags
  };
}

export default useRecentlyViewedTags;
