import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface VersionBookmark {
  id: string;
  version_id: string;
  user_id: string;
  created_at: string;
}

export const useVersionBookmarks = (postId: string | undefined) => {
  const [bookmarks, setBookmarks] = useState<VersionBookmark[]>([]);
  const [bookmarkedVersionIds, setBookmarkedVersionIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchBookmarks = useCallback(async () => {
    if (!postId) return;
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }

      // Get all version IDs for this post
      const { data: versions } = await supabase
        .from("post_versions")
        .select("id")
        .eq("post_id", postId);

      if (!versions || versions.length === 0) {
        setLoading(false);
        return;
      }

      const versionIds = versions.map(v => v.id);

      // Get bookmarks for these versions
      const { data, error } = await supabase
        .from("post_version_bookmarks")
        .select("*")
        .eq("user_id", session.user.id)
        .in("version_id", versionIds);

      if (error) throw error;

      setBookmarks(data || []);
      setBookmarkedVersionIds(new Set((data || []).map(b => b.version_id)));
    } catch (error: any) {
      console.error("Error fetching version bookmarks:", error);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  const toggleBookmark = async (versionId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({
          title: "Not authenticated",
          description: "Please sign in to bookmark versions",
          variant: "destructive",
        });
        return;
      }

      const isBookmarked = bookmarkedVersionIds.has(versionId);

      if (isBookmarked) {
        // Remove bookmark
        const { error } = await supabase
          .from("post_version_bookmarks")
          .delete()
          .eq("version_id", versionId)
          .eq("user_id", session.user.id);

        if (error) throw error;

        setBookmarkedVersionIds(prev => {
          const next = new Set(prev);
          next.delete(versionId);
          return next;
        });
        setBookmarks(prev => prev.filter(b => b.version_id !== versionId));

        toast({
          title: "Bookmark removed",
          description: "Version removed from bookmarks",
        });
      } else {
        // Add bookmark
        const { data, error } = await supabase
          .from("post_version_bookmarks")
          .insert({
            version_id: versionId,
            user_id: session.user.id,
          })
          .select()
          .single();

        if (error) throw error;

        setBookmarkedVersionIds(prev => new Set([...prev, versionId]));
        setBookmarks(prev => [...prev, data]);

        toast({
          title: "Bookmarked",
          description: "Version added to bookmarks",
        });
      }
    } catch (error: any) {
      console.error("Error toggling bookmark:", error);
      toast({
        title: "Error",
        description: "Failed to update bookmark",
        variant: "destructive",
      });
    }
  };

  const isBookmarked = (versionId: string) => bookmarkedVersionIds.has(versionId);

  return {
    bookmarks,
    bookmarkedVersionIds,
    loading,
    toggleBookmark,
    isBookmarked,
    fetchBookmarks,
  };
};
