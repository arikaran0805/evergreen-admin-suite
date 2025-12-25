import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BadgeSeenCounts {
  [key: string]: number;
}

export const useAdminBadgeReads = (userId: string | null) => {
  const [seenCounts, setSeenCounts] = useState<BadgeSeenCounts>({});
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all seen counts for this user
  const fetchSeenCounts = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("admin_badge_reads")
        .select("badge_key, seen_count")
        .eq("user_id", userId);

      if (error) throw error;

      const counts: BadgeSeenCounts = {};
      data?.forEach((row) => {
        counts[row.badge_key] = row.seen_count;
      });
      setSeenCounts(counts);
    } catch (error) {
      console.error("Error fetching admin badge reads:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchSeenCounts();
  }, [fetchSeenCounts]);

  // Mark a badge as seen (upsert the current count)
  const markBadgeSeen = useCallback(
    async (badgeKey: string, currentCount: number) => {
      if (!userId || seenCounts[badgeKey] === currentCount) return;

      try {
        const { error } = await supabase
          .from("admin_badge_reads")
          .upsert(
            {
              user_id: userId,
              badge_key: badgeKey,
              seen_count: currentCount,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,badge_key" }
          );

        if (error) throw error;

        setSeenCounts((prev) => ({ ...prev, [badgeKey]: currentCount }));
      } catch (error) {
        console.error("Error updating admin badge read:", error);
      }
    },
    [userId, seenCounts]
  );

  // Calculate unread count (current - seen)
  const getUnreadCount = useCallback(
    (badgeKey: string, currentCount: number): number => {
      const seen = seenCounts[badgeKey] || 0;
      return Math.max(0, currentCount - seen);
    },
    [seenCounts]
  );

  return { seenCounts, isLoading, markBadgeSeen, getUnreadCount, refetch: fetchSeenCounts };
};
