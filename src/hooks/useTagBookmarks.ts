import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface TagBookmark {
  id: string;
  tag_id: string;
  created_at: string;
}

interface BookmarkedTag {
  id: string;
  name: string;
  slug: string;
  bookmarkedAt: string;
}

/**
 * Hook to manage tag bookmarks/favorites
 */
export function useTagBookmarks() {
  const { user } = useAuth();
  const [bookmarkedTags, setBookmarkedTags] = useState<BookmarkedTag[]>([]);
  const [bookmarkedTagIds, setBookmarkedTagIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Fetch bookmarked tags
  const fetchBookmarks = useCallback(async () => {
    if (!user) {
      setBookmarkedTags([]);
      setBookmarkedTagIds(new Set());
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("tag_bookmarks")
        .select(`
          id,
          tag_id,
          created_at,
          tags:tag_id (id, name, slug)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const tags: BookmarkedTag[] = (data || [])
        .filter(bookmark => bookmark.tags)
        .map(bookmark => {
          const tag = bookmark.tags as unknown as { id: string; name: string; slug: string };
          return {
            id: tag.id,
            name: tag.name,
            slug: tag.slug,
            bookmarkedAt: bookmark.created_at
          };
        });

      setBookmarkedTags(tags);
      setBookmarkedTagIds(new Set(tags.map(t => t.id)));
    } catch (error) {
      console.error("Error fetching tag bookmarks:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  // Check if a tag is bookmarked
  const isBookmarked = useCallback((tagId: string) => {
    return bookmarkedTagIds.has(tagId);
  }, [bookmarkedTagIds]);

  // Toggle bookmark for a tag
  const toggleBookmark = useCallback(async (tag: { id: string; name: string; slug: string }) => {
    if (!user) {
      return { success: false, error: "Must be logged in to bookmark tags" };
    }

    const isCurrentlyBookmarked = bookmarkedTagIds.has(tag.id);

    try {
      if (isCurrentlyBookmarked) {
        // Remove bookmark
        const { error } = await supabase
          .from("tag_bookmarks")
          .delete()
          .eq("user_id", user.id)
          .eq("tag_id", tag.id);

        if (error) throw error;

        setBookmarkedTags(prev => prev.filter(t => t.id !== tag.id));
        setBookmarkedTagIds(prev => {
          const next = new Set(prev);
          next.delete(tag.id);
          return next;
        });
      } else {
        // Add bookmark
        const { error } = await supabase
          .from("tag_bookmarks")
          .insert({
            user_id: user.id,
            tag_id: tag.id
          });

        if (error) throw error;

        const newBookmark: BookmarkedTag = {
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
          bookmarkedAt: new Date().toISOString()
        };

        setBookmarkedTags(prev => [newBookmark, ...prev]);
        setBookmarkedTagIds(prev => new Set([...prev, tag.id]));
      }

      return { success: true };
    } catch (error) {
      console.error("Error toggling tag bookmark:", error);
      return { success: false, error: "Failed to update bookmark" };
    }
  }, [user, bookmarkedTagIds]);

  return {
    bookmarkedTags,
    bookmarkedTagIds,
    loading,
    isBookmarked,
    toggleBookmark,
    refetch: fetchBookmarks
  };
}

export default useTagBookmarks;
